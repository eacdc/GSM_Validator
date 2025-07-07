class ChatBot {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.startBtn = document.getElementById('startBtn');
        this.startContainer = document.getElementById('startContainer');
        this.inputContainer = document.getElementById('inputContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.loading = document.getElementById('loading');
        this.languageToggle = document.getElementById('languageToggle');
        this.chatHeader = document.querySelector('.chat-header');
        
        // Language settings
        this.currentLanguage = 'en';
        this.languages = {
            en: { flag: '🇬🇧', code: 'EN', name: 'English' },
            fr: { flag: '🇫🇷', code: 'FR', name: 'Français' }
        };
        
        // Scroll tracking for mobile header collapse
        this.lastScrollY = 0;
        this.isScrolling = false;
        
        this.init();
    }
    
    init() {
        this.startBtn.addEventListener('click', () => this.startConversation());
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.languageToggle.addEventListener('click', () => this.toggleLanguage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Add scroll listener for mobile header collapse
        this.chatMessages.addEventListener('scroll', () => this.handleScroll());
        
        // Load saved language preference
        this.loadLanguagePreference();
    }
    
    handleScroll() {
        // Only apply on mobile devices
        if (window.innerWidth > 768) return;
        
        const currentScrollY = this.chatMessages.scrollTop;
        
        // Add collapsed class when scrolling down, remove when at top
        if (currentScrollY > 50) {
            this.chatHeader.classList.add('collapsed');
        } else {
            this.chatHeader.classList.remove('collapsed');
        }
        
        this.lastScrollY = currentScrollY;
    }
    
    toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'en' ? 'fr' : 'en';
        this.updateUI();
        this.saveLanguagePreference();
    }
    
    updateUI() {
        const lang = this.languages[this.currentLanguage];
        const flagIcon = this.languageToggle.querySelector('.flag-icon');
        const langText = this.languageToggle.querySelector('.lang-text');
        
        flagIcon.textContent = lang.flag;
        langText.textContent = lang.code;
        
        // Update all translatable elements
        document.querySelectorAll('[data-en][data-fr]').forEach(element => {
            const key = this.currentLanguage === 'en' ? 'data-en' : 'data-fr';
            element.textContent = element.getAttribute(key);
        });
        
        // Update placeholder text
        document.querySelectorAll('[data-en-placeholder][data-fr-placeholder]').forEach(element => {
            const key = this.currentLanguage === 'en' ? 'data-en-placeholder' : 'data-fr-placeholder';
            element.placeholder = element.getAttribute(key);
        });
    }
    
    saveLanguagePreference() {
        localStorage.setItem('gsmValidatorLanguage', this.currentLanguage);
    }
    
    loadLanguagePreference() {
        const saved = localStorage.getItem('gsmValidatorLanguage');
        if (saved && this.languages[saved]) {
            this.currentLanguage = saved;
            this.updateUI();
        }
    }
    
    async startConversation() {
        // Hide start button and show input
        this.startContainer.style.display = 'none';
        this.inputContainer.style.display = 'flex';
        
        // Clear welcome message
        this.chatMessages.innerHTML = '';
        
        // Send initial hello message with language preference
        const initialMessage = this.currentLanguage === 'en' 
            ? 'Hello! I would like to start using the calculator.'
            : 'Bonjour! Je voudrais commencer à utiliser le calculateur.';
        
        await this.sendMessageToAPI(initialMessage);
        
        // Focus on input
        this.messageInput.focus();
    }
    
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        this.addMessage(message, 'user');
        
        // Clear input
        this.messageInput.value = '';
        
        // Send to API
        await this.sendMessageToAPI(message);
    }
    
    async sendMessageToAPI(message) {
        try {
            // Show loading
            this.showLoading(true);
            this.sendBtn.disabled = true;
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message,
                    language: this.currentLanguage
                }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
            
            const data = await response.json();
            
            // Add bot response to chat
            this.addMessage(data.message, 'bot');
            
        } catch (error) {
            console.error('Error:', error);
            const errorMessage = this.currentLanguage === 'en' 
                ? 'Sorry, something went wrong. Please try again.'
                : 'Désolé, quelque chose s\'est mal passé. Veuillez réessayer.';
            this.addMessage(errorMessage, 'bot');
        } finally {
            // Hide loading
            this.showLoading(false);
            this.sendBtn.disabled = false;
            this.messageInput.focus();
        }
    }
    
    addMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = message;
        
        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    showLoading(show) {
        if (show) {
            this.loading.style.display = 'flex';
            this.inputContainer.style.display = 'none';
        } else {
            this.loading.style.display = 'none';
            this.inputContainer.style.display = 'flex';
        }
    }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatBot();
}); 