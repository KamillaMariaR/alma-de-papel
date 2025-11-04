let currentUser = null;
let allCategories = []; // Global variable to store all categories for easy lookup

document.addEventListener('DOMContentLoaded', () => {
    let allProducts = []; // Pode conter todos os produtos ou resultados de busca, dependendo da página
    const productsContainer = document.getElementById('productsContainer');
    const cartItemCountElement = document.getElementById('cart-item-count');
    const mainNav = document.getElementById('mainNav');
    const menuToggle = document.getElementById('menuToggle');
    const currentYearElement = document.getElementById('currentYear');
    const productsPerPage = 8;
    let currentlyLoadedCount = 0;

    // Elementos da barra de pesquisa (adicionados aqui para serem globais no DOMContentLoaded)
    const searchBarPage = document.getElementById('searchBarPage');
    const searchInputPage = document.getElementById('searchInputPage');

    let cart = loadCart();
    let favorites = loadFavorites();
    updateCartCount();

    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }

    // Event listener para a barra de pesquisa
    if (searchBarPage) {
        searchBarPage.addEventListener('submit', (e) => {
            e.preventDefault(); // Impede o envio padrão do formulário
            const searchTerm = searchInputPage.value.trim();
            if (searchTerm) {
                // Redireciona para a página de busca com o termo na URL
                window.location.href = `busca.html?query=${encodeURIComponent(searchTerm)}`;
            }
        });
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
        const adminLinkContainer = document.getElementById('admin-link-container'); // Adicionado para admin.html

        if (currentUser) {
            userAccountLinks.forEach(link => {
                if (link) {
                    link.href = 'perfil.html';
                    link.setAttribute('aria-label', `Conta de ${currentUser.name}`);
                }
            });

            if (window.location.pathname.endsWith('perfil.html')) {
                // Redireciona admin para o painel de admin
                if (currentUser.role === 'admin') {
                    window.location.href = 'admin.html';
                    return;
                }

                // Atualiza os dados do perfil para usuários normais
                const welcomeMessageEl = document.getElementById('welcomeMessage');
                const userNameEl = document.getElementById('userName');
                const userEmailEl = document.getElementById('userEmail');

                if (welcomeMessageEl) welcomeMessageEl.textContent = `Olá, ${currentUser.name}! Que bom te ver por aqui.`;
                if (userNameEl) userNameEl.textContent = currentUser.name;
                if (userEmailEl) userEmailEl.textContent = currentUser.email;

                // Esconde o link de admin se não for admin (já redirecionou acima, mas para garantir)
                if (adminLinkContainer) {
                    adminLinkContainer.classList.add('hidden');
                }

            } else if (window.location.pathname.endsWith('admin.html')) {
                // Se o usuário está na página admin.html e não é admin, redireciona
                if (currentUser.role !== 'admin') {
                    alert('Acesso negado. Esta área é apenas para administradores.');
                    window.location.href = 'index.html';
                    return;
                }
                // Se é admin, garante que o link de admin não aparece aqui, pois já está na página admin
                if (adminLinkContainer) {
                    adminLinkContainer.classList.add('hidden');
                }
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
            // Se o usuário não está logado e tenta acessar perfil ou admin, redireciona para login
            if (window.location.pathname.endsWith('perfil.html') || window.location.pathname.endsWith('admin.html')) {
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

    // --- CÓDIGO PARA O FORMULÁRIO DE CONTATO ---
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('contact-name').value;
            const email = document.getElementById('contact-email').value;
            const subject = document.getElementById('contact-subject').value;
            const message = document.getElementById('contact-message').value;

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, subject, message })
                });
                const result = await response.json();

                if (response.ok) {
                    showFeedbackMessage(result.message, 'success', 'contactFormFeedback');
                    contactForm.reset(); // Limpa o formulário após o envio
                } else {
                    showFeedbackMessage(result.message, 'error', 'contactFormFeedback');
                }
            } catch (err) {
                console.error('Erro na submissão do formulário de contato:', err);
                showFeedbackMessage('Erro de conexão. Não foi possível enviar sua mensagem.', 'error', 'contactFormFeedback');
            }
        });
    }
    // --- FIM DO CÓDIGO DO FORMULÁRIO DE CONTATO ---

    function addToCart(productId) {
        if (!currentUser) {
            alert('Você precisa estar logado para adicionar itens ao carrinho!');
            window.location.href = 'login.html';
            return;
        }
        // allProducts pode não conter o produto se a página atual for "livro.html"
        // e `allProducts` ainda não foi populado com todos os produtos.
        // Precisamos garantir que o produto esteja disponível.
        let product = allProducts.find(p => p.id === productId);
        if (!product && window.location.pathname.endsWith('livro.html')) {
            // Se estiver na página de detalhes, o 'singleProduct' pode ser a fonte
            const productDetailContent = document.getElementById('productDetailContent');
            if (productDetailContent && productDetailContent.dataset.product) {
                product = JSON.parse(productDetailContent.dataset.product);
            }
        }

        if (!product) {
            console.error('Produto não encontrado para adicionar ao carrinho:', productId);
            showFeedbackMessage('Produto não encontrado para adicionar ao carrinho.', 'error');
            return;
        }

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
        let product = allProducts.find(p => p.id === productId);
        if (!product && window.location.pathname.endsWith('livro.html')) {
            const productDetailContent = document.getElementById('productDetailContent');
            if (productDetailContent && productDetailContent.dataset.product) {
                product = JSON.parse(productDetailContent.dataset.product);
            }
        }

        if (!product) {
            console.error('Produto não encontrado para favoritar:', productId);
            showFeedbackMessage('Produto não encontrado para favoritar.', 'error');
            return;
        }

        const productIndex = favorites.indexOf(productId);
        let message = '';
        if (productIndex > -1) {
            favorites.splice(productIndex, 1);
            if (buttonElement) buttonElement.classList.remove('active');
            message = `"${product.nome_produto}" removido dos favoritos.`;
        } else {
            favorites.push(productId);
            if (buttonElement) buttonElement.classList.add('active');
            message = `"${product.nome_produto}" adicionado aos favoritos!`;
        }
        saveFavorites();
        showFeedbackMessage(message, 'success', 'feedbackMessageFavorites');
        if (document.getElementById('favoritesContainer')) {
            renderFavoritesPage();
        }
        // Para a página de detalhes do livro, atualiza o texto do botão
        if (window.location.pathname.endsWith('livro.html')) {
            const favoriteButton = document.getElementById('favoriteDetailButton');
            if (favoriteButton) {
                favoriteButton.innerHTML = `<i class="fas fa-heart"></i> ${favorites.includes(productId) ? 'Remover dos Favoritos' : 'Favoritar'}`;
                if (favorites.includes(productId)) {
                    favoriteButton.classList.add('active');
                } else {
                    favoriteButton.classList.remove('active');
                }
            }
        }
    }

    // Função para buscar TODOS os produtos (usada em páginas como index, carrinho, favoritos)
    async function fetchAllProducts() {
        // Se já carregamos todos os produtos e não estamos na página de busca ou livro.html, retorna os existentes
        if (allProducts.length > 0 && !window.location.pathname.endsWith('busca.html') && !window.location.pathname.endsWith('livro.html')) {
            return allProducts;
        }
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

    // NOVA FUNÇÃO: Buscar todas as categorias de uma vez
    async function fetchAllCategories() {
        if (allCategories.length > 0) return allCategories; // Já buscado
        try {
            const response = await fetch('/api/categorias');
            if (!response.ok) throw new Error('Falha ao carregar as categorias.');
            allCategories = await response.json();
            return allCategories;
        } catch (error) {
            console.error('Erro ao carregar categorias:', error.message);
            return [];
        }
    }

    function renderProducts(productsToRender, container) {
        if (!container) return;
        // Se for a primeira renderização e não houver produtos, exibe mensagem
        if (productsToRender.length === 0 && currentlyLoadedCount === 0) {
            container.innerHTML = '<p class="text-center" style="grid-column: 1 / -1;">Nenhum livro encontrado.</p>';
            return;
        } else if (productsToRender.length === 0) {
            // Se não há mais produtos para carregar, mas já carregou alguns
            return;
        }

        productsToRender.forEach(product => {
            const priceText = typeof product.preco_produto === 'number'
                ? `R$ ${product.preco_produto.toFixed(2).replace('.', ',')}`
                : 'Preço a consultar';
            const isFavorite = Array.isArray(favorites) && favorites.includes(product.id);
            const productCard = `
                <article class="product-card" data-id="${product.id}">
                    <a href="livro.html?id=${product.id}" class="product-image-link"> <!-- MODIFICADO: Link para a página do livro -->
                        <img src="${product.imagem_url}" alt="Capa do Livro ${product.nome_produto}">
                    </a>
                    <h3><a href="livro.html?id=${product.id}">${product.nome_produto}</a></h3> <!-- MODIFICADO: Link para a página do livro -->
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

        // Verifica se ainda há produtos para carregar
        if (allProducts.length > currentlyLoadedCount) {
            loadMoreBtn.classList.remove('hidden');
        } else {
            loadMoreBtn.classList.add('hidden');
        }

        // Remove listener anterior para evitar duplicações
        loadMoreBtn.removeEventListener('click', loadMoreHandler);
        loadMoreBtn.addEventListener('click', loadMoreHandler);

        function loadMoreHandler() {
            const nextBatchStart = currentlyLoadedCount;
            const nextBatchEnd = currentlyLoadedCount + productsPerPage;
            const nextBatch = allProducts.slice(nextBatchStart, nextBatchEnd);
            renderProducts(nextBatch, productsContainer);
            currentlyLoadedCount += nextBatch.length;
            if (currentlyLoadedCount >= allProducts.length) {
                loadMoreBtn.classList.add('hidden');
            }
        }
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

    async function renderCategoryListPage() {
        const container = document.getElementById('categoryGridContainer');
        if (!container) return;
        try {
            const response = await fetch('/api/categorias');
            if (!response.ok) throw new Error('Não foi possível carregar as categorias.');
            const categories = await response.json();
            container.innerHTML = '';
            categories.forEach(cat => {
                const categoryCard = `<a href="categoria.html?slug=${cat.slug}" class="category-card-detailed" id="${cat.slug}"><div class="category-card-detailed-image-carousel"><img src="${cat.imagem_url_1 || ''}" alt="Livros de ${cat.nome} - Imagem 1" class="carousel-image"><img src="${cat.imagem_url_2 || ''}" alt="Livros de ${cat.nome} - Imagem 2" class="carousel-image"><img src="${cat.imagem_url_3 || ''}" alt="Livros de ${cat.nome} - Imagem 3" class="carousel-image"></div><div class="category-card-detailed-content"><h3>${cat.nome}</h3><p>${cat.descricao}</p><span>Ver Livros <i class="fas fa-arrow-right"></i></span></div></a>`;
                container.insertAdjacentHTML('beforeend', categoryCard);
            });
            const carousels = document.querySelectorAll('.category-card-detailed-image-carousel');
            carousels.forEach(carousel => {
                const images = carousel.querySelectorAll('.carousel-image');
                if (images.length > 1) {
                    const firstValidImage = [...images].find(img => img.getAttribute('src'));
                    if (firstValidImage) { firstValidImage.classList.add('active'); }
                    setInterval(() => {
                        const currentActive = carousel.querySelector('.carousel-image.active');
                        if (!currentActive) return;
                        const currentActiveIndex = Array.from(images).indexOf(currentActive);
                        let nextIndex = (currentActiveIndex + 1) % images.length;
                        let loopGuard = images.length;
                        while (!images[nextIndex].getAttribute('src') && loopGuard > 0) { nextIndex = (nextIndex + 1) % images.length; loopGuard--; }
                        if (currentActive) currentActive.classList.remove('active');
                        if (images[nextIndex].getAttribute('src')) { images[nextIndex].classList.add('active'); }
                    }, 3500);
                } else if (images.length === 1 && images[0].getAttribute('src')) { images[0].classList.add('active'); }
            });
        } catch (error) {
            container.innerHTML = `<p class="text-center" style="grid-column: 1 / -1; color: red;">Não foi possível carregar as categorias.</p>`;
        }
    }

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
            if (titleEl) titleEl.textContent = category.nome;
            if (descriptionEl) descriptionEl.textContent = category.descricao;
            const prodResponse = await fetch(`/api/categorias/${slug}/produtos`);
            if (!prodResponse.ok) throw new Error('Não foi possível buscar os livros desta categoria.');
            let products = await prodResponse.json();

            allProducts = products; // Atualiza allProducts com os resultados da categoria para paginação
            currentlyLoadedCount = 0; // Reseta para a lógica de paginação

            if (productsContainerEl) productsContainerEl.innerHTML = ''; // Limpa a mensagem "Buscando..."
            const initialProducts = allProducts.slice(0, productsPerPage);
            renderProducts(initialProducts, productsContainerEl);
            currentlyLoadedCount = initialProducts.length;
            setupLoadMoreButton(); // Reconfigura o botão de "Ver Mais" para a categoria
        } catch (error) {
            if (titleEl) titleEl.textContent = 'Erro';
            if (descriptionEl) descriptionEl.textContent = error.message;
            if (productsContainerEl) productsContainerEl.innerHTML = `<p class="text-center" style="grid-column: 1 / -1; color: red;">${error.message}</p>`;
        }
    }

    // FUNÇÃO PARA RENDERIZAR A PÁGINA DE BUSCA
    async function renderSearchPage() {
        const params = new URLSearchParams(window.location.search);
        const query = params.get('query');
        const searchQueryDisplay = document.getElementById('searchQueryDisplay');
        const searchResultDescription = document.getElementById('searchResultDescription');
        const productsContainerEl = document.getElementById('productsContainer');
        const loadMoreBtn = document.getElementById('loadMoreBtn');

        if (searchInputPage && query) {
            searchInputPage.value = decodeURIComponent(query); // Preenche o campo de busca
        }

        if (!query) {
            if (searchQueryDisplay) searchQueryDisplay.textContent = 'nenhum termo';
            if (searchResultDescription) searchResultDescription.textContent = 'Por favor, digite algo para buscar.';
            if (productsContainerEl) productsContainerEl.innerHTML = '<p class="text-center" style="grid-column: 1 / -1;">Nenhum termo de busca fornecido.</p>';
            if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
            return;
        }

        if (searchQueryDisplay) searchQueryDisplay.textContent = decodeURIComponent(query);
        if (document.title) document.title = `Busca por "${decodeURIComponent(query)}" - Alma de Papel`;
        if (productsContainerEl) productsContainerEl.innerHTML = '<p class="text-center" style="grid-column: 1 / -1;">Buscando livros...</p>';
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden'); // Esconde até que os resultados sejam carregados

        try {
            const response = await fetch(`/api/products/search?query=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Falha ao buscar produtos.');
            const searchResults = await response.json();

            allProducts = searchResults; // 'allProducts' agora contém os resultados da busca para paginação
            currentlyLoadedCount = 0; // Reseta o contador para a paginação dos resultados da busca

            if (productsContainerEl) productsContainerEl.innerHTML = ''; // Limpa a mensagem "Buscando livros..."

            if (allProducts.length === 0) {
                if (searchResultDescription) searchResultDescription.textContent = `Não encontramos nenhum livro para "${decodeURIComponent(query)}". Tente outro termo!`;
                if (productsContainerEl) productsContainerEl.innerHTML = '<p class="text-center" style="grid-column: 1 / -1;">Nenhum livro corresponde à sua busca.</p>';
            } else {
                if (searchResultDescription) searchResultDescription.textContent = `Encontramos ${allProducts.length} tesouro(s) para "${decodeURIComponent(query)}":`;
                const initialProducts = allProducts.slice(0, productsPerPage);
                renderProducts(initialProducts, productsContainerEl);
                currentlyLoadedCount = initialProducts.length;
                setupLoadMoreButton(); // Reconfigura o botão de "Ver Mais" para os resultados da busca
            }
        } catch (error) {
            console.error('Erro na busca:', error.message);
            if (searchResultDescription) searchResultDescription.textContent = `Erro ao buscar: ${error.message}`;
            if (productsContainerEl) productsContainerEl.innerHTML = `<p class="text-center" style="grid-column: 1 / -1; color: red;">${error.message}</p>`;
            if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
        }
    }

    // NOVA FUNÇÃO: Renderizar página de detalhes de um único produto
    async function renderSingleProductPage() {
        const params = new URLSearchParams(window.location.search);
        const productId = params.get('id');

        const loader = document.getElementById('productDetailLoader');
        const content = document.getElementById('productDetailContent');
        const pageTitle = document.getElementById('pageTitle');
        const productDetailImage = document.getElementById('productDetailImage');
        const productDetailName = document.getElementById('productDetailName');
        const productDetailAuthor = document.getElementById('productDetailAuthor');
        const productDetailCategory = document.getElementById('productDetailCategory');
        const productDetailPrice = document.getElementById('productDetailPrice');
        const productDetailSynopsis = document.getElementById('productDetailSynopsis');
        const addToCartDetailButton = document.getElementById('addToCartDetailButton');
        const favoriteDetailButton = document.getElementById('favoriteDetailButton');

        if (!productId) {
            if (loader) loader.classList.add('hidden');
            if (content) content.innerHTML = '<p class="text-center">ID do livro não fornecido.</p>';
            return;
        }

        try {
            if (loader) loader.classList.remove('hidden');
            if (content) content.classList.add('hidden');

            const [productResponse, categoriesResponse] = await Promise.all([
                fetch(`/api/products/${productId}`),
                fetchAllCategories() // Garante que as categorias estejam carregadas
            ]);

            if (!productResponse.ok) {
                const errorData = await productResponse.json();
                throw new Error(errorData.message || 'Livro não encontrado.');
            }
            const product = await productResponse.json();

            // Store the single product in allProducts for addToCart/toggleFavorite to find it
            // Or explicitly pass the product object to them. For simplicity, we'll ensure it's in allProducts.
            // Resetting allProducts to just this one ensures handlers find the correct product
            allProducts = [product]; 

            if (pageTitle) pageTitle.textContent = `${product.nome_produto} - Alma de Papel`;
            if (productDetailImage) productDetailImage.src = product.imagem_url;
            if (productDetailImage) productDetailImage.alt = `Capa do Livro ${product.nome_produto}`;
            if (productDetailName) productDetailName.textContent = product.nome_produto;
            if (productDetailAuthor) productDetailAuthor.textContent = product.Autor_produto || 'Autor desconhecido';
            
            // Encontra o nome da categoria usando a lista global allCategories
            const category = allCategories.find(cat => cat.id === product.categoria_id);
            if (productDetailCategory) productDetailCategory.textContent = `Categoria: ${category ? category.nome : 'Desconhecida'}`;

            const priceText = typeof product.preco_produto === 'number'
                ? `R$ ${product.preco_produto.toFixed(2).replace('.', ',')}`
                : 'Preço a consultar';
            if (productDetailPrice) productDetailPrice.textContent = priceText;
            // Assumindo que a tabela 'produto' tem uma coluna 'sinopse'
            if (productDetailSynopsis) productDetailSynopsis.textContent = product.sinopse || 'Sinopse não disponível.';

            // Define um atributo de dados no conteúdo para facilitar o acesso aos handlers dos botões
            if (content) content.dataset.product = JSON.stringify(product);

            // Adiciona event listeners para os botões na página de detalhes
            if (addToCartDetailButton) {
                addToCartDetailButton.onclick = () => addToCart(product.id);
            }
            if (favoriteDetailButton) {
                const isFavorite = Array.isArray(favorites) && favorites.includes(product.id);
                favoriteDetailButton.classList.toggle('active', isFavorite);
                favoriteDetailButton.innerHTML = `<i class="fas fa-heart"></i> ${isFavorite ? 'Remover dos Favoritos' : 'Favoritar'}`;
                favoriteDetailButton.onclick = (e) => toggleFavorite(product.id, e.currentTarget);
            }
            
            if (loader) loader.classList.add('hidden');
            if (content) content.classList.remove('hidden');

        } catch (error) {
            console.error('Erro ao carregar detalhes do livro:', error);
            if (loader) loader.classList.add('hidden');
            if (content) content.classList.remove('hidden');
            if (content) content.innerHTML = `<p class="text-center" style="color: red;">${error.message}</p>`;
            if (pageTitle) pageTitle.textContent = 'Erro - Alma de Papel';
        }
    }


    async function initializePage() {
        await checkUserSession();
        await fetchAllCategories(); // Carrega todas as categorias no início de todas as páginas

        const currentPage = window.location.pathname.split("/").pop() || "index.html";

        if (currentPage === 'index.html' || currentPage === '') {
            if (productsContainer) {
                productsContainer.innerHTML = '';
                await fetchAllProducts(); // Garante que allProducts seja populado para a página inicial
                const initialProducts = allProducts.slice(0, productsPerPage);
                renderProducts(initialProducts, productsContainer);
                currentlyLoadedCount = initialProducts.length;
                setupLoadMoreButton();
            }
        } else if (currentPage === 'categorias.html') {
            renderCategoryListPage();
        } else if (currentPage === 'categoria.html') {
            // fetchAllProducts é chamado indiretamente em renderSingleCategoryPage se necessário.
            renderSingleCategoryPage();
        } else if (currentPage === 'favoritos.html') {
            await fetchAllProducts(); // Necessário para renderizar produtos favoritos
            renderFavoritesPage();
        } else if (currentPage === 'carrinho.html') {
            await fetchAllProducts(); // Necessário para renderizar itens do carrinho
            renderCartPage();
        } else if (currentPage === 'busca.html') { // Nova condição para a página de busca
            renderSearchPage();
        } else if (currentPage === 'livro.html') { // NOVA CONDIÇÃO para a página de detalhes do livro
            renderSingleProductPage();
        }
        else if (currentPage === 'perfil.html') {
            // O updateUIForUser já cuida do redirecionamento ou preenchimento
            // mas podemos garantir que allProducts esteja disponível se necessário para outras features futuras
            await fetchAllProducts();
        }
        // Para outras páginas como 'sobre.html', 'contato.html', 'cadastro.html', 'login.html'
        // fetchAllProducts pode não ser estritamente necessário no carregamento inicial,
        // mas é bom ter o array populado caso o usuário interaja com o carrinho/favoritos.
        // Já está sendo chamado em checkUserSession indiretamente se updateUIForUser não redirecionar.
    }

    initializePage();
});