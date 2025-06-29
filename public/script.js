class ChatBot {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.startBtn = document.getElementById('startBtn');
        this.startContainer = document.getElementById('startContainer');
        this.inputContainer = document.getElementById('inputContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.loading = document.getElementById('loading');
        
        this.init();
    }
    
    init() {
        this.startBtn.addEventListener('click', () => this.startConversation());
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }
    
    async startConversation() {
        // Hide start button and show input
        this.startContainer.style.display = 'none';
        this.inputContainer.style.display = 'flex';
        
        // Clear welcome message
        this.chatMessages.innerHTML = '';
        
        // Send initial hello message
        await this.sendMessageToAPI('Hello! I would like to start using the calculator.');
        
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
                body: JSON.stringify({ message }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
            
            const data = await response.json();
            
            // Add bot response to chat
            this.addMessage(data.message, 'bot');
            
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('Sorry, something went wrong. Please try again.', 'bot');
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