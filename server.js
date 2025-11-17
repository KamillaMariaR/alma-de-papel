require('dotenv').config();
const express = require('express');
const path = require('path');
const supabase = require('./database.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Acesso negado. Rota somente para administradores.' });
    }
};


app.post("/api/register", async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Por favor, preencha todos os campos.' });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'As senhas não coincidem.' });
    }

    try {
        const { data: existingUser, error: selectError } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (selectError && selectError.code !== 'PGRST116') throw selectError;
        if (existingUser) {
            return res.status(400).json({ message: 'Este e-mail já está cadastrado.' });
        }

        const salt = bcrypt.genSaltSync(10);
        const password_hash = bcrypt.hashSync(password, salt);

        const { error: insertError } = await supabase
            .from('users')
            .insert({ name: name, email: email, password: password_hash, role: 'user' });

        if (insertError) throw insertError;

        res.status(201).json({ message: 'Cadastro realizado com sucesso!' });
    } catch (error) {
        console.error('Erro no registro:', error.message);
        res.status(500).json({ message: 'Erro no servidor. Tente novamente.' });
    }
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Por favor, preencha todos os campos.' });
    }

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
            
        if (error || !user) {
            return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
        }

        const isPasswordCorrect = bcrypt.compareSync(password, user.password);

        if (isPasswordCorrect) {
            const userPayload = { id: user.id, name: user.name, email: user.email, role: user.role };
            const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '1d' });

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000
            });

            res.status(200).json({ message: 'Login bem-sucedido!', user: userPayload });
        } else {
            res.status(401).json({ message: 'E-mail ou senha inválidos.' });
        }
    } catch (error) {
        console.error('Erro no login:', error.message);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.get("/api/session", authenticateToken, (req, res) => {
    res.status(200).json({ user: req.user });
});

app.post("/api/logout", (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logout bem-sucedido.' });
});


app.post("/api/contact", async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: 'Por favor, preencha todos os campos do formulário.' });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail', 
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS 
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER, 
            to: 'contosalmadepapel@gmail.com', 
            subject: `Contato Alma de Papel: ${subject}`,
            html: `
                <p><strong>Nome:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Assunto:</strong> ${subject}</p>
                <p><strong>Mensagem:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <hr>
                <small>Este e-mail foi enviado através do formulário de contato do site Alma de Papel.</small>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email de contato enviado por ${email} com assunto: ${subject}`);
        res.status(200).json({ message: 'Sua mensagem foi enviada com sucesso! Em breve entraremos em contato.' });

    } catch (error) {
        console.error('Erro ao enviar e-mail de contato:', error);
        res.status(500).json({ message: 'Erro ao enviar sua mensagem. Tente novamente mais tarde.' });
    }
});


// --- Rotas de Admin ---
app.post("/api/admin/products", authenticateToken, isAdmin, async (req, res) => {
    const { nome_produto, Autor_produto, imagem_url, categoria_id, preco_produto, sinopse } = req.body;

    if (!nome_produto || !Autor_produto || !imagem_url || !categoria_id || preco_produto === undefined) {
        return res.status(400).json({ message: 'Todos os campos do produto são obrigatórios.' });
    }

    try {
        const { data, error } = await supabase
            .from('produto')
            .insert([{ nome_produto, Autor_produto, imagem_url, categoria_id, preco_produto, sinopse }])
            .select();

        if (error) {
            console.error('Erro Supabase ao adicionar produto:', error);
            throw new Error(`Erro no banco de dados: ${error.message}`);
        }
        res.status(201).json({ message: 'Livro adicionado com sucesso!', data: data[0] });
    } catch (error) {
        console.error('!!! ERRO DETALHADO AO ADICIONAR PRODUTO:', error);
        res.status(500).json({ message: 'Erro no servidor ao adicionar produto.' });
    }
});

app.put("/api/admin/products/:id", authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { nome_produto, Autor_produto, imagem_url, categoria_id, preco_produto, sinopse } = req.body;

    if (!nome_produto || !Autor_produto || !imagem_url || !categoria_id || preco_produto === undefined) {
        return res.status(400).json({ message: 'Todos os campos do produto são obrigatórios.' });
    }

    try {
        const { data, error } = await supabase
            .from('produto')
            .update({ nome_produto, Autor_produto, imagem_url, categoria_id, preco_produto, sinopse })
            .eq('id', id)
            .select();

        if (error) {
            console.error('Erro Supabase ao atualizar produto:', error);
            throw new Error(`Erro no banco de dados: ${error.message}`);
        }
        if (!data || data.length === 0) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        res.status(200).json({ message: 'Livro atualizado com sucesso!', data: data[0] });
    } catch (error) {
        console.error(`Erro ao atualizar produto ${id}:`, error.message);
        res.status(500).json({ message: 'Erro no servidor ao atualizar produto.' });
    }
});

app.delete("/api/admin/products/:id", authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('produto')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro Supabase ao deletar produto:', error);
            throw new Error(`Erro no banco de dados: ${error.message}`);
        }
        res.status(200).json({ message: 'Livro excluído com sucesso!' });
    } catch (error) {
        console.error(`Erro ao deletar produto ${id}:`, error.message);
        res.status(500).json({ message: 'Erro no servidor ao deletar produto.' });
    }
});

app.get("/api/products/search", async (req, res) => {
    const { query } = req.query; 
    if (!query) {
        return res.status(400).json({ message: 'Parâmetro de busca "query" é obrigatório.' });
    }

    try {
        const { data, error } = await supabase
            .from('produto')
            .select('*')
            .or(`nome_produto.ilike.%${query}%,Autor_produto.ilike.%${query}%`);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar produtos (search):', error.message); 
        res.status(500).json({ error: 'Erro ao buscar produtos do banco de dados.' });
    }
});


app.get("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('produto')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error; 
        if (!data) {
            return res.status(404).json({ message: 'Livro não encontrado.' });
        }
        res.json(data);
    } catch (error) {
        console.error(`Erro ao buscar produto ${id}:`, error.message);
        res.status(500).json({ error: 'Erro ao buscar o livro do banco de dados.' });
    }
});

app.get("/api/products", async (req, res) => {
    try {
        const { data, error } = await supabase.from('produto').select('*');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar todos os produtos:', error.message); 
        res.status(500).json({ error: 'Erro ao buscar produtos do banco de dados.' });
    }
});


app.get("/api/categorias", async (req, res) => {
    try {
        const { data, error } = await supabase.from('categorias').select('*');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error.message);
        res.status(500).json({ error: 'Erro ao buscar categorias do banco de dados.' });
    }
});

app.get("/api/categorias/:slug/produtos", async (req, res) => {
    const { slug } = req.params;
    try {
        const { data: categoriaData, error: categoriaError } = await supabase
            .from('categorias').select('id').eq('slug', slug).single();
        if (categoriaError && categoriaError.code !== 'PGRST116') throw categoriaError;
        if (!categoriaData) return res.status(404).json({ message: 'Categoria não encontrada.' });
        
        const { data: produtosData, error: produtosError } = await supabase
            .from('produto').select('*').eq('categoria_id', categoriaData.id);
        if (produtosError) throw produtosError;
        
        res.json(produtosData);
    } catch (error) {
        console.error(`!!! ERRO na rota da categoria ${slug}:`, error.message);
        res.status(500).json({ error: 'Erro ao buscar produtos da categoria.' });
    }
});

app.get("/api/categorias/:slug", async (req, res) => {
    const { slug } = req.params;
    try {
        const { data, error } = await supabase.from('categorias').select('*').eq('slug', slug).single();
        if (error) throw error;
        if (data) {
            res.json(data);
        } else {
            res.status(404).json({ message: 'Categoria não encontrada.' });
        }
    } catch (error) {
        console.error(`Erro ao buscar a categoria ${slug}:`, error.message);
        res.status(500).json({ error: 'Erro ao buscar os dados da categoria.' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/busca.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'busca.html'));
});

app.get('/livro.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'livro.html'));
});


app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});