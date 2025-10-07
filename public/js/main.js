let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    let allProducts = [];
    const productsContainer = document.getElementById('productsContainer');
    const cartItemCountElement = document.getElementById('cart-item-count');
    const mainNav = document.getElementById('mainNav');
    const menuToggle = document.getElementById('menuToggle');
    const currentYearElement = document.getElementById('currentYear');
    const productsPerPage = 8;
    let currentlyLoadedCount = 0;
    
    let cart = loadCart();
    let favorites = loadFavorites();
    updateCartCount();

    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }

    async function checkUserSession() {
        try {
            const response = await fetch('/api/session');
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
            } else {
                currentUser = null;
            }
        } catch (error) {
            currentUser = null;
            console.error('Erro ao verificar sessão:', error);
        }
        updateUIForUser();
    }
    
    function updateUIForUser() {
        const userAccountLinks = document.querySelectorAll('#user-account-link');
        const logoutButton = document.getElementById('logoutButton');

        if (currentUser) {
            userAccountLinks.forEach(link => {
                if (link) {
                    link.href = 'perfil.html';
                    link.setAttribute('aria-label', `Conta de ${currentUser.name}`);
                }
            });

            if (window.location.pathname.endsWith('perfil.html')) {
                if (currentUser.role === 'admin') {
                    window.location.href = 'admin.html';
                    return; 
                }
                
                document.getElementById('welcomeMessage').textContent = `Olá, ${currentUser.name}! Que bom te ver por aqui.`;
                document.getElementById('userName').textContent = currentUser.name;
                document.getElementById('userEmail').textContent = currentUser.email;
            }

            if (logoutButton) {
                logoutButton.addEventListener('click', handleLogout);
            }
        } else {
            userAccountLinks.forEach(link => {
                if (link) {
                    link.href = 'login.html';
                    link.setAttribute('aria-label', 'Fazer Login');
                }
            });
            if (window.location.pathname.endsWith('perfil.html')) {
                window.location.href = 'login.html';
            }
        }
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-senha').value;
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const result = await response.json();
                if (response.ok) {
                    currentUser = result.user;
                    showFeedbackMessage(result.message, 'success', 'loginFeedback');
                    
                    setTimeout(() => {
                        if (currentUser && currentUser.role === 'admin') {
                            window.location.href = 'admin.html';
                        } else {
                            window.location.href = 'perfil.html';
                        }
                    }, 1500);
                } else {
                    showFeedbackMessage(result.message, 'error', 'loginFeedback');
                }
            } catch (err) {
                showFeedbackMessage('Erro de conexão. Tente novamente.', 'error', 'loginFeedback');
            }
        });
    }

    async function handleLogout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            currentUser = null;
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    }
    
    const signupForm = document.getElementById('signupForm'); 
    if (signupForm) { 
        signupForm.addEventListener('submit', async (e) => { 
            e.preventDefault(); 
            const name = document.getElementById('signup-name').value; 
            const email = document.getElementById('signup-email').value; 
            const password = document.getElementById('signup-senha').value; 
            const confirmPassword = document.getElementById('signup-confirma-senha').value; 
            if (password !== confirmPassword) { 
                showFeedbackMessage('As senhas não coincidem!', 'error', 'signupFeedback'); return; 
            } 
            try { 
                const response = await fetch('/api/register', { 
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ name, email, password, confirmPassword }) 
                }); 
                const result = await response.json(); 
                if (response.ok) { 
                    showFeedbackMessage(result.message, 'success', 'signupFeedback'); 
                    signupForm.reset(); 
                    setTimeout(() => window.location.href = 'login.html', 2000); 
                } else { 
                    showFeedbackMessage(result.message, 'error', 'signupFeedback'); 
                } 
            } catch (err) { 
                showFeedbackMessage('Erro de conexão. Tente novamente.', 'error', 'signupFeedback'); 
            } 
        }); 
    }

    function addToCart(productId) {
        if (!currentUser) {
            alert('Você precisa estar logado para adicionar itens ao carrinho!');
            window.location.href = 'login.html';
            return;
        }
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;
        const cartItem = cart.find(item => item.id === productId);
        if (cartItem) {
            cartItem.quantity++;
        } else {
            cart.push({ id: product.id, quantity: 1 });
        }
        saveCart();
        updateCartCount();
        showFeedbackMessage(`"${product.nome_produto}" foi adicionado ao seu cesto!`, 'success');
    }

    function toggleFavorite(productId, buttonElement) {
        if (!currentUser) {
            alert('Você precisa estar logado para favoritar itens!');
            window.location.href = 'login.html';
            return;
        }
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;
        const productIndex = favorites.indexOf(productId);
        let message = '';
        if (productIndex > -1) {
            favorites.splice(productIndex, 1);
            if(buttonElement) buttonElement.classList.remove('active');
            message = `"${product.nome_produto}" removido dos favoritos.`;
        } else {
            favorites.push(productId);
            if(buttonElement) buttonElement.classList.add('active');
            message = `"${product.nome_produto}" adicionado aos favoritos!`;
        }
        saveFavorites();
        showFeedbackMessage(message, 'success', 'feedbackMessageFavorites');
        if (document.getElementById('favoritesContainer')) {
            renderFavoritesPage();
        }
    }

    async function fetchAllProducts() {
        if (allProducts.length > 0) return allProducts;
        try {
            const response = await fetch('/api/products');
            if (!response.ok) throw new Error('Falha ao carregar os livros do nosso acervo.');
            allProducts = await response.json();
            return allProducts;
        } catch (error) {
            console.error(error.message);
            if (productsContainer) {
                productsContainer.innerHTML = `<p class="text-center" style="grid-column: 1 / -1; color: red;">${error.message}</p>`;
            }
            return [];
        }
    }
    
    function renderProducts(productsToRender, container) {
        if (!container) return;
        if (!productsToRender || productsToRender.length === 0) {
            if (container.innerHTML === '' || container.innerHTML.includes('Carregando')) {
               container.innerHTML = '<p class="text-center" style="grid-column: 1 / -1;">Nenhum livro encontrado.</p>';
            }
            return;
        }
        productsToRender.forEach(product => {
            const priceText = typeof product.preco_produto === 'number' 
                ? `R$ ${product.preco_produto.toFixed(2).replace('.', ',')}`
                : 'Preço a consultar';
            const isFavorite = Array.isArray(favorites) && favorites.includes(product.id);
            const productCard = `
                <article class="product-card" data-id="${product.id}">
                    <a href="#" class="product-image-link">
                        <img src="${product.imagem_url}" alt="Capa do Livro ${product.nome_produto}">
                    </a>
                    <h3>${product.nome_produto}</h3>
                    <p class="author">${product.Autor_produto || 'Autor desconhecido'}</p>
                    <p class="price">${priceText}</p>
                    <div class="product-card-actions">
                        <button class="btn btn-primary add-to-cart-button">
                            <i class="fas fa-cart-plus"></i> Comprar
                        </button>
                        <button class="btn favorite-button ${isFavorite ? 'active' : ''}" aria-label="Adicionar aos Favoritos">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </article>
            `;
            container.insertAdjacentHTML('beforeend', productCard);
        });
        addEventListenersToProductCards();
    }
    
    if (menuToggle && mainNav) { menuToggle.addEventListener('click', () => { mainNav.classList.toggle('active'); menuToggle.querySelector('i').classList.toggle('fa-bars'); menuToggle.querySelector('i').classList.toggle('fa-times'); }); }
    function loadCart() { return JSON.parse(localStorage.getItem('almaDePapelCart')) || []; }
    function saveCart() { localStorage.setItem('almaDePapelCart', JSON.stringify(cart)); }
    function updateCartCount() { if (cartItemCountElement) { const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0); cartItemCountElement.textContent = totalItems; } }
    function removeFromCart(productId) { cart = cart.filter(item => item.id !== productId); saveCart(); updateCartCount(); renderCartPage(); }
    function updateCartItemQuantity(productId, newQuantity) { const item = cart.find(i => i.id === productId); if (item) { item.quantity = newQuantity; if (item.quantity <= 0) { removeFromCart(productId); } else { saveCart(); updateCartCount(); renderCartPage(); } } }
    function loadFavorites() { return JSON.parse(localStorage.getItem('almaDePapelFavorites')) || []; }
    function saveFavorites() { localStorage.setItem('almaDePapelFavorites', JSON.stringify(favorites)); }
    function addEventListenersToProductCards() { document.querySelectorAll('.product-card').forEach(card => { const productId = parseInt(card.dataset.id, 10); card.querySelector('.add-to-cart-button')?.addEventListener('click', () => addToCart(productId)); card.querySelector('.favorite-button')?.addEventListener('click', (e) => toggleFavorite(productId, e.currentTarget)); }); }
    function showFeedbackMessage(message, type = 'success', containerId = 'feedbackMessageContainer') { const container = document.getElementById(containerId); if (!container) return; container.innerHTML = `<div class="feedback-message ${type}">${message}</div>`; setTimeout(() => { container.innerHTML = ''; }, 4000); }
    document.querySelectorAll('.password-toggle').forEach(button => { button.addEventListener('click', () => { const passwordInput = button.previousElementSibling; const icon = button.querySelector('i'); if (passwordInput.type === 'password') { passwordInput.type = 'text'; icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); } else { passwordInput.type = 'password'; icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); } }); });
    function setupLoadMoreButton() {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (!loadMoreBtn) return;
        if (allProducts.length > currentlyLoadedCount) {
            loadMoreBtn.classList.remove('hidden');
        } else {
            loadMoreBtn.classList.add('hidden');
        }
        loadMoreBtn.addEventListener('click', () => {
            const nextBatchStart = currentlyLoadedCount;
            const nextBatchEnd = currentlyLoadedCount + productsPerPage;
            const nextBatch = allProducts.slice(nextBatchStart, nextBatchEnd);
            renderProducts(nextBatch, productsContainer);
            currentlyLoadedCount += nextBatch.length;
            if (currentlyLoadedCount >= allProducts.length) {
                loadMoreBtn.classList.add('hidden');
            }
        });
    }
    function renderFavoritesPage() {
        const container = document.getElementById('favoritesContainer');
        const emptyMessage = document.getElementById('emptyFavoritesMessage');
        if (!container || !emptyMessage) return;
        if (favorites.length === 0) {
            container.classList.add('hidden');
            emptyMessage.classList.remove('hidden');
        } else {
            container.classList.remove('hidden');
            emptyMessage.classList.add('hidden');
            const favoriteProducts = allProducts.filter(p => favorites.includes(p.id));
            container.innerHTML = ''; 
            renderProducts(favoriteProducts, container);
        }
    }
    
    function renderCartPage() {
        const tableBody = document.getElementById('cartTableBody');
        const emptyMessage = document.getElementById('emptyCartMessage');
        const cartTable = document.getElementById('cartTable');
        const cartSummary = document.getElementById('cartSummaryWrapper');
        if (!tableBody || !emptyMessage || !cartTable || !cartSummary) return;
        if (cart.length === 0) {
            emptyMessage.classList.remove('hidden');
            cartTable.classList.add('hidden');
            cartSummary.classList.add('hidden');
            return;
        }
        emptyMessage.classList.add('hidden');
        cartTable.classList.remove('hidden');
        cartSummary.classList.remove('hidden');
        tableBody.innerHTML = '';
        let subtotal = 0;
        cart.forEach(item => {
            const product = allProducts.find(p => p.id === item.id);
            if (!product) return;
            const price = typeof product.preco_produto === 'number' ? product.preco_produto : 0;
            const priceText = typeof product.preco_produto === 'number' ? price.toFixed(2).replace('.', ',') : 'N/A';
            const itemTotal = price * item.quantity;
            subtotal += itemTotal;
            const row = `<tr><td data-label="Produto"><div class="cart-product-info"><img src="${product.imagem_url}" alt="${product.nome_produto}"><div><h4>${product.nome_produto}</h4><p>${product.Autor_produto || 'Autor Desconhecido'}</p></div></div></td><td data-label="Preço Unit.">R$ ${priceText}</td><td data-label="Quantidade"><div class="quantity-controls"><button class="quantity-change" data-id="${product.id}" data-change="-1">-</button><input type="number" value="${item.quantity}" min="1" data-id="${product.id}" class="quantity-input"><button class="quantity-change" data-id="${product.id}" data-change="1">+</button></div></td><td data-label="Subtotal">R$ ${itemTotal.toFixed(2).replace('.', ',')}</td><td data-label="Remover"><button class="btn-remove-item" data-id="${product.id}" aria-label="Remover item"><i class="fas fa-trash-alt"></i></button></td></tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
        document.getElementById('cartSubtotal').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
        document.getElementById('cartTotal').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
        tableBody.querySelectorAll('.btn-remove-item').forEach(btn => { btn.addEventListener('click', (e) => removeFromCart(parseInt(e.currentTarget.dataset.id, 10))); });
        tableBody.querySelectorAll('.quantity-change').forEach(btn => { btn.addEventListener('click', (e) => { const id = parseInt(e.currentTarget.dataset.id, 10); const change = parseInt(e.currentTarget.dataset.change, 10); const currentItem = cart.find(item => item.id === id); if (currentItem) { updateCartItemQuantity(id, currentItem.quantity + change); } }); });
    }

    async function renderCategoryListPage() { const container = document.getElementById('categoryGridContainer'); if (!container) return; try { const response = await fetch('/api/categorias'); if (!response.ok) throw new Error('Não foi possível carregar as categorias.'); const categories = await response.json(); container.innerHTML = ''; categories.forEach(cat => { const categoryCard = `<a href="categoria.html?slug=${cat.slug}" class="category-card-detailed" id="${cat.slug}"><div class="category-card-detailed-image-carousel"><img src="${cat.imagem_url_1 || ''}" alt="Livros de ${cat.nome} - Imagem 1" class="carousel-image"><img src="${cat.imagem_url_2 || ''}" alt="Livros de ${cat.nome} - Imagem 2" class="carousel-image"><img src="${cat.imagem_url_3 || ''}" alt="Livros de ${cat.nome} - Imagem 3" class="carousel-image"></div><div class="category-card-detailed-content"><h3>${cat.nome}</h3><p>${cat.descricao}</p><span>Ver Livros <i class="fas fa-arrow-right"></i></span></div></a>`; container.insertAdjacentHTML('beforeend', categoryCard); }); const carousels = document.querySelectorAll('.category-card-detailed-image-carousel'); carousels.forEach(carousel => { const images = carousel.querySelectorAll('.carousel-image'); if (images.length > 1) { const firstValidImage = [...images].find(img => img.getAttribute('src')); if (firstValidImage) { firstValidImage.classList.add('active'); } setInterval(() => { const currentActive = carousel.querySelector('.carousel-image.active'); if (!currentActive) return; const currentActiveIndex = Array.from(images).indexOf(currentActive); let nextIndex = (currentActiveIndex + 1) % images.length; let loopGuard = images.length; while(!images[nextIndex].getAttribute('src') && loopGuard > 0) { nextIndex = (nextIndex + 1) % images.length; loopGuard--; } if (currentActive) currentActive.classList.remove('active'); if (images[nextIndex].getAttribute('src')) { images[nextIndex].classList.add('active'); } }, 3500); } else if (images.length === 1 && images[0].getAttribute('src')) { images[0].classList.add('active'); } }); } catch (error) { container.innerHTML = `<p class="text-center" style="grid-column: 1 / -1; color: red;">Não foi possível carregar as categorias.</p>`; } }
    async function renderSingleCategoryPage() {
        const params = new URLSearchParams(window.location.search);
        const slug = params.get('slug');
        if (!slug) { window.location.href = 'categorias.html'; return; }
        const titleEl = document.getElementById('categoryTitle');
        const descriptionEl = document.getElementById('categoryDescription');
        const productsContainerEl = document.getElementById('productsContainer');
        try {
            const catResponse = await fetch(`/api/categorias/${slug}`);
            if (!catResponse.ok) throw new Error('Categoria não encontrada.');
            const category = await catResponse.json();
            document.title = `${category.nome} - Alma de Papel`;
            if(titleEl) titleEl.textContent = category.nome;
            if(descriptionEl) descriptionEl.textContent = category.descricao;
            const prodResponse = await fetch(`/api/categorias/${slug}/produtos`);
            if (!prodResponse.ok) throw new Error('Não foi possível buscar os livros desta categoria.');
            let products = await prodResponse.json();
            if (productsContainerEl) productsContainerEl.innerHTML = '';
            renderProducts(products, productsContainerEl);
        } catch (error) {
            if(titleEl) titleEl.textContent = 'Erro';
            if(descriptionEl) descriptionEl.textContent = error.message;
            if(productsContainerEl) productsContainerEl.innerHTML = '';
        }
    }

    async function initializePage() {
        await checkUserSession();
        await fetchAllProducts();
        
        const currentPage = window.location.pathname.split("/").pop() || "index.html";

        if (currentPage === 'index.html' || currentPage === '') {
            if(productsContainer) {
                productsContainer.innerHTML = ''; 
                const initialProducts = allProducts.slice(0, productsPerPage);
                renderProducts(initialProducts, productsContainer);
                currentlyLoadedCount = initialProducts.length;
                setupLoadMoreButton();
            }
        } else if (currentPage === 'categorias.html') {
            renderCategoryListPage();
        } else if (currentPage === 'categoria.html') {
            renderSingleCategoryPage();
        } else if (currentPage === 'favoritos.html') {
            renderFavoritesPage();
        } else if (currentPage === 'carrinho.html') {
            renderCartPage();
        }
    }

    initializePage();
});