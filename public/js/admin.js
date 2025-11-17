document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('productForm');
    const productFormTitle = document.getElementById('productFormTitle');
    const productsTableBody = document.querySelector('#productsTable tbody');
    const categorySelect = document.getElementById('productCategory');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const productIdField = document.getElementById('productId');
    
    const productNameInput = document.getElementById('productName');
    const productAuthorInput = document.getElementById('productAuthor');
    const productImageInput = document.getElementById('productImage');
    const productPriceInput = document.getElementById('productPrice');
    const productSynopsisInput = document.getElementById('productSynopsis'); 

    let allCategories = [];

    async function checkAdminAccess() {
        try {
            const response = await fetch('/api/session');
            if (!response.ok) {
                window.location.href = 'login.html';
                return;
            }
            const data = await response.json();
            if (data.user.role !== 'admin') {
                alert('Acesso negado. Esta área é apenas para administradores.');
                window.location.href = 'index.html';
                return;
            }
            await initializeAdminPage();
        } catch (error) {
            console.error('Erro de autenticação:', error);
            window.location.href = 'login.html';
        }
    }
    
    function showAdminFeedback(message, type = 'success') {
        const container = document.getElementById('adminFeedback');
        if (!container) return;
        container.innerHTML = `<div class="feedback-message ${type}">${message}</div>`;
        setTimeout(() => { container.innerHTML = ''; }, 4000);
    }
    
    async function loadCategories() {
        try {
            const response = await fetch('/api/categorias');
            if (!response.ok) throw new Error('Falha ao buscar categorias.');
            allCategories = await response.json();
            
            categorySelect.innerHTML = '<option value="">Selecione uma categoria</option>';
            allCategories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.nome;
                categorySelect.appendChild(option);
            });
        } catch (error) {
            showAdminFeedback(error.message, 'error');
        }
    }

    async function loadProducts() {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) throw new Error('Falha ao buscar produtos.');
            const products = await response.json();
            
            productsTableBody.innerHTML = '';
            products.forEach(product => {
                const categoryName = allCategories.find(c => c.id === product.categoria_id)?.nome || 'Sem categoria';
                const row = `
                    <tr data-id="${product.id}">
                        <td>${product.id}</td>
                        <td>
                            <div class="product-info-cell">
                                <img src="${product.imagem_url}" alt="${product.nome_produto}" width="40">
                                <span>${product.nome_produto}</span>
                            </div>
                        </td>
                        <td>${product.Autor_produto}</td>
                        <td>R$ ${product.preco_produto ? product.preco_produto.toFixed(2).replace('.', ',') : 'N/A'}</td>
                        <td class="actions-cell">
                            <button class="btn-icon edit-btn" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon delete-btn" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    </tr>
                `;
                productsTableBody.insertAdjacentHTML('beforeend', row);
            });
        } catch (error) {
            showAdminFeedback(error.message, 'error');
        }
    }
    
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const priceString = productPriceInput.value.replace(',', '.');

        const productData = {
            nome_produto: productNameInput.value,
            Autor_produto: productAuthorInput.value,
            imagem_url: productImageInput.value,
            categoria_id: parseInt(categorySelect.value, 10),
            preco_produto: parseFloat(priceString),
            sinopse: productSynopsisInput.value 
        };
        
        const id = productIdField.value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/products/${id}` : '/api/admin/products';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Erro ao salvar o produto.');
            }
            showAdminFeedback(result.message, 'success');
            resetForm();
            await loadProducts();
        } catch (error) {
            showAdminFeedback(error.message, 'error');
        }
    });
    
    productsTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const row = target.closest('tr');
        const id = row.dataset.id;
       
        if (target.classList.contains('delete-btn')) {
            if (confirm('Tem certeza que deseja excluir este livro?')) {
                try {
                    const response = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    showAdminFeedback(result.message, 'success');
                    await loadProducts();
                } catch (error) {
                    showAdminFeedback(error.message, 'error');
                }
            }
        }

        if (target.classList.contains('edit-btn')) {
            const response = await fetch(`/api/products/${id}`); 
            if (!response.ok) {
                showAdminFeedback('Não foi possível carregar os dados do produto para edição.', 'error');
                return;
            }
            const product = await response.json();
            
            if (product) {
                productFormTitle.textContent = 'Editando Livro';
                productIdField.value = product.id;
                productNameInput.value = product.nome_produto;
                productAuthorInput.value = product.Autor_produto;
                productImageInput.value = product.imagem_url;
                categorySelect.value = product.categoria_id;
                productPriceInput.value = product.preco_produto;
                productSynopsisInput.value = product.sinopse || ''; 
                cancelEditBtn.classList.remove('hidden');
                window.scrollTo(0, 0);
            }
        }
    });

    function resetForm() {
        productForm.reset();
        productIdField.value = '';
        productFormTitle.textContent = 'Adicionar Novo Livro';
        cancelEditBtn.classList.add('hidden');
    }

    cancelEditBtn.addEventListener('click', resetForm);

    async function initializeAdminPage() {
        await loadCategories();
        await loadProducts();
    }
    
    checkAdminAccess();
    
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/logout', { method: 'POST' });
                if (response.ok) {
                    alert('Você saiu da sua conta.');
                    window.location.href = 'index.html';
                } else {
                    alert('Não foi possível sair. Tente novamente.');
                }
            } catch (error) {
                console.error('Erro ao fazer logout:', error);
                alert('Erro de conexão ao tentar sair.');
            }
        });
    }
});