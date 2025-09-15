

require('dotenv').config(); // Garante que as variáveis de ambiente sejam carregadas
const express = require('express');
const path = require('path');
const supabase = require('./database.js');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));



// Rota de Registro
app.post("/api/register", async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;
    console.log('Dados recebidos:', { name, email, password, confirmPassword });

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

        if (selectError && selectError.code !== 'PGRST116') {
            throw selectError;
        }
        if (existingUser) {
            return res.status(400).json({ message: 'Este e-mail já está cadastrado.' });
        }

        const salt = bcrypt.genSaltSync(10);
        const password_hash = bcrypt.hashSync(password, salt);

        const { error: insertError } = await supabase
            .from('users')
            .insert({ name: name, email: email, password: password_hash });

        if (insertError) {
            throw insertError;
        }

        res.status(201).json({ message: 'Cadastro realizado com sucesso!' });
    } catch (error) {
        console.error('Erro no registro:', error.message);
        res.status(500).json({ message: 'Erro no servidor. Tente novamente.' });
    }
});

// Rota de Login
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    console.log('Dados de login recebidos:', { email, password });

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
            res.status(200).json({ message: 'Login bem-sucedido!' });
        } else {
            res.status(401).json({ message: 'E-mail ou senha inválidos.' });
        }
    } catch (error) {
        console.error('Erro no login:', error.message);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});



// Rota para buscar TODOS os produtos
app.get("/api/products", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('produto')
            .select('*');

        if (error) {
            throw error;
        }
        
        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error.message);
        res.status(500).json({ error: 'Erro ao buscar produtos do banco de dados.' });
    }
});

app.get("/api/categorias", async (req, res) => {
    try {
        // Busca todas as entradas da tabela 'categorias' no Supabase
        const { data, error } = await supabase
            .from('categorias') 
            .select('*');

        if (error) {
            throw error;
        }
        
        // Envia os dados das categorias como resposta JSON
        res.json(data);

    } catch (error) {
        console.error('Erro ao buscar categorias:', error.message);
        res.status(500).json({ error: 'Erro ao buscar categorias do banco de dados.' });
    }
});

app.get("/api/categorias/:slug/produtos", async (req, res) => {
    const { slug } = req.params;
    console.log(`\n--- INICIANDO BUSCA PARA CATEGORIA SLUG: "${slug}" ---`); // LOG 1

    try {
        const { data: categoriaData, error: categoriaError } = await supabase
            .from('categorias')
            .select('id')
            .eq('slug', slug)
            .single();

        // LOG para verificar se a categoria foi encontrada
        console.log("Resultado da busca pela categoria:", { categoriaData, categoriaError }); // LOG 2

        if (categoriaError && categoriaError.code !== 'PGRST116') {
             // Ignora o erro "not found" mas loga outros
            throw categoriaError;
        }

        if (!categoriaData) {
            console.log("-> Categoria NÃO encontrada. Verifique o slug e as políticas de RLS."); // LOG 3
            return res.status(404).json({ message: 'Categoria não encontrada.' });
        }
        
        console.log(`-> Categoria encontrada! ID: ${categoriaData.id}. Buscando produtos...`); // LOG 4

        const { data: produtosData, error: produtosError } = await supabase
            .from('produto')
            .select('*')
            .eq('categoria_id', categoriaData.id);

        // LOG para verificar o resultado da busca de produtos
        console.log("Resultado da busca por produtos:", { produtosData, produtosError }); // LOG 5

        if (produtosError) throw produtosError;
        
        console.log(`--- FIM DA BUSCA. Encontrados ${produtosData.length} produtos. ---\n`); // LOG 6
        res.json(produtosData);

    } catch (error) {
        console.error(`!!! ERRO na rota da categoria ${slug}:`, error.message); // LOG DE ERRO
        res.status(500).json({ error: 'Erro ao buscar produtos da categoria.' });
    }
});

app.get("/api/categorias/:slug", async (req, res) => {
    const { slug } = req.params;
    try {
        const { data, error } = await supabase
            .from('categorias')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error) {
            throw error;
        }

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


app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});