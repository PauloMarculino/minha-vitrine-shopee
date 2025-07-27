document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos do DOM ---
    const productGrid = document.getElementById('productGrid');
    const loader = document.getElementById('loader');
    const searchInput = document.getElementById('searchInput');
    const categoryFiltersContainer = document.getElementById('categoryFilters');
    
    // --- Estado da aplicação ---
    let allProducts = [];
    let allCategories = [];

    // --- 1. LÓGICA DE CARREGAMENTO INICIAL ---
    async function loadInitialData() {
        showLoader(true);
        try {
            const response = await fetch('products.json');
            if (!response.ok) throw new Error('Não foi possível encontrar o arquivo products.json');
            const productLinks = await response.json();

            // Envia os links para a API de backend para enriquecimento dos dados
            const apiResponse = await fetch('/api/fetch-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products: productLinks })
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.error || 'Falha ao buscar dados da API');
            }

            const data = await apiResponse.json();
            allProducts = data.products.filter(p => !p.error);
            allCategories = data.categories || [];
            
            renderCategories();
            renderProducts(allProducts);

        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            productGrid.innerHTML = `<p style="text-align: center; color: red;">Oops! ${error.message}. Verifique o console para mais detalhes.</p>`;
        } finally {
            showLoader(false);
            lucide.createIcons();
        }
    }
    
    function showLoader(isLoading) {
        loader.style.display = isLoading ? 'block' : 'none';
        productGrid.style.display = isLoading ? 'none' : 'grid';
    }

    // --- 2. LÓGICA DE RENDERIZAÇÃO ---
    function renderProducts(products) {
        productGrid.innerHTML = '';
        if (products.length === 0) {
            productGrid.innerHTML = `<p style="text-align: center;">Nenhum produto encontrado com os filtros selecionados.</p>`;
            return;
        }
        
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card visible';
            card.dataset.title = product.title.toLowerCase();
            const productKeywords = [...(product.customTags || []), ...(product.keywords || [])].map(k => k.toLowerCase()).join(',');
            card.dataset.keywords = productKeywords;
            
            card.dataset.category = (product.keywords && product.keywords.length > 0) ? product.keywords[0].toLowerCase() : (product.customTags && product.customTags.length > 0 ? product.customTags[0].toLowerCase() : '');

            card.innerHTML = `
                <img src="${product.image}" alt="${product.title}" loading="lazy">
                <div class="product-info">
                    <h3 class="product-title">${product.title}</h3>
                    <p class="product-price">${product.price || 'Preço sob consulta'}</p>
                    <div class="product-actions">
                        <a href="${product.affiliateUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Ver na Shopee</a>
                        <button class="btn btn-secondary share-btn" title="Compartilhar"><i data-lucide="share-2"></i></button>
                        <button class="btn btn-secondary copy-link-btn" title="Copiar link de afiliado"><i data-lucide="copy"></i></button>
                    </div>
                </div>
            `;
            productGrid.appendChild(card);
        });

        addCardEventListeners();
        lucide.createIcons();
    }

    function renderCategories() {
        categoryFiltersContainer.innerHTML = '<button class="tag active" data-category="all">Todos</button>';
        allCategories.forEach(category => {
            const tag = document.createElement('button');
            tag.className = 'tag';
            tag.dataset.category = category.toLowerCase();
            tag.textContent = category;
            categoryFiltersContainer.appendChild(tag);
        });

        categoryFiltersContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag')) {
                document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                filterProducts();
            }
        });
    }

    // --- 3. LÓGICA DE FILTROS E BUSCA ---
    function filterProducts() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const activeCategory = document.querySelector('.tag.active').dataset.category;

        let visibleProducts = [];
        allProducts.forEach(product => {
            const title = product.title.toLowerCase();
            const keywords = [...(product.customTags || []), ...(product.keywords || [])].map(k => k.toLowerCase()).join(',');
            const category = (product.keywords && product.keywords.length > 0) ? product.keywords[0].toLowerCase() : (product.customTags && product.customTags.length > 0 ? product.customTags[0].toLowerCase() : '');

            const matchesSearch = title.includes(searchTerm) || keywords.includes(searchTerm);
            const matchesCategory = activeCategory === 'all' || category === activeCategory;

            if (matchesSearch && matchesCategory) {
                visibleProducts.push(product);
            }
        });
        renderProducts(visibleProducts);
    }
    
    searchInput.addEventListener('input', filterProducts);
    
    // --- 4. LÓGICA DE EVENTOS NOS CARDS ---
    function addCardEventListeners() {
        document.querySelectorAll('.copy-link-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.currentTarget.closest('.product-card').querySelector('a').href;
                navigator.clipboard.writeText(url).then(() => {
                    alert('Link de afiliado copiado!');
                }).catch(err => console.error('Falha ao copiar:', err));
            });
        });
        
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const card = e.currentTarget.closest('.product-card');
                const url = card.querySelector('a').href;
                const title = card.querySelector('.product-title').textContent;
                const shareData = {
                    title: `Olha esse achadinho da Shopee!`,
                    text: `Confira este produto: ${title}`,
                    url: url
                };
                try {
                    if (navigator.share && navigator.canShare(shareData)) {
                        await navigator.share(shareData);
                    } else {
                        alert('A função de compartilhamento não é suportada neste navegador. Use o botão de copiar link.');
                    }
                } catch (err) {
                    console.error('Erro ao compartilhar:', err);
                }
            });
        });
    }

    // --- 5. LÓGICA DO CHAT INTELIGENTE ---
    setupChat();

    // --- INICIALIZAÇÃO ---
    loadInitialData();
});

// Função separada para o Chat
function setupChat() {
    const chatToggle = document.getElementById('chatToggle');
    const chatBox = document.getElementById('chatBox');
    const closeChat = document.getElementById('closeChat');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendChatMsg = document.getElementById('sendChatMsg');
    
    chatToggle.addEventListener('click', () => chatBox.classList.toggle('hidden'));
    closeChat.addEventListener('click', () => chatBox.classList.add('hidden'));

    function addChatMessage(message, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${sender}`;
        msgDiv.textContent = message;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    async function handleChat() {
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        addChatMessage(userMessage, 'user');
        chatInput.value = '';
        addChatMessage('Analisando...', 'bot');

        // SIMULAÇÃO DA RESPOSTA DA IA ---
        setTimeout(() => {
            let botReply = "Não consegui encontrar uma resposta para isso nos produtos atuais. Poderia tentar buscar por uma categoria ou palavra-chave?";
            const lowerCaseMessage = userMessage.toLowerCase();
            const foundProductCard = Array.from(document.querySelectorAll('.product-card.visible')).find(card =>
                card.dataset.title.includes(lowerCaseMessage) || card.dataset.keywords.includes(lowerCaseMessage)
            );

            if (foundProductCard) {
                const title = foundProductCard.querySelector('.product-title').textContent;
                botReply = `Encontrei algo sobre "${userMessage}"! Você se refere ao produto "${title}"? Ele está visível na página. Se precisar de mais detalhes, posso tentar ajudar.`;
            }
            chatMessages.lastChild.textContent = botReply;
        }, 1500);
    }

    sendChatMsg.addEventListener('click', handleChat);
    chatInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleChat());
}