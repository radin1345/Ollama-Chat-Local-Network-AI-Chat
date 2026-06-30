/**
 * Ollama Chat - Local Network AI Chat Application
 * Production-ready single-page application with real-time streaming
 */

class OllamaChat {
  constructor() {
    this.authenticated = false;
    this.currentModel = null;
    this.models = [];
    this.sessionId = null;
    this.darkMode = true;
    this.messages = [];
    this.isLoading = false;
    this.init();
  }

  /**
   * Initialize app - check auth status and render appropriate screen
   */
  async init() {
    this.setTheme();
    this.checkAuthStatus();
  }

  /**
   * Check if user is already authenticated
   */
  async checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      
      if (data.authenticated) {
        this.authenticated = true;
        this.sessionId = data.sessionId;
        await this.loadChat();
      } else {
        this.renderLoginScreen();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.renderLoginScreen();
    }
  }

  /**
   * Render login screen
   */
  renderLoginScreen() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="login-container">
        <div class="login-card">
          <h1 class="login-title">🤖 Ollama Chat</h1>
          <p class="login-subtitle">Local Network AI Assistant</p>
          <div class="form-group">
            <label for="password">Access Password</label>
            <input 
              type="password" 
              id="password" 
              placeholder="Enter password to continue"
              autocomplete="off"
            />
          </div>
          <button class="btn-login" onclick="app.handleLogin()">Login</button>
          <div id="loginError" class="login-error"></div>
        </div>
      </div>
    `;

    // Listen for Enter key
    document.getElementById('password').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleLogin();
      }
    });
  }

  /**
   * Handle login attempt
   */
  async handleLogin() {
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = '';

    if (!password) {
      errorDiv.textContent = 'Please enter a password';
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        const data = await response.json();
        this.authenticated = true;
        this.sessionId = data.sessionId;
        await this.loadChat();
      } else {
        const data = await response.json();
        errorDiv.textContent = data.error || 'Authentication failed';
      }
    } catch (error) {
      errorDiv.textContent = 'Connection error. Ensure server is running.';
    }
  }

  /**
   * Load chat interface
   */
  async loadChat() {
    await this.fetchModels();
    this.renderChatScreen();
    this.setupEventListeners();
  }

  /**
   * Fetch available models from Ollama
   */
  async fetchModels() {
    try {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      this.models = data.models || [];
      if (this.models.length > 0) {
        this.currentModel = this.models[0].name;
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      this.models = [];
    }
  }

  /**
   * Render chat screen
   */
  renderChatScreen() {
    const app = document.getElementById('app');
    const modelOptions = this.models
      .map(m => `<option value="${m.name}"${m.name === this.currentModel ? ' selected' : ''}>${m.name}</option>`)
      .join('');

    app.innerHTML = `
      <div class="chat-container">
        <!-- Header -->
        <div class="chat-header">
          <div class="header-left">
            <span class="app-title">💬 Ollama Chat</span>
            <select class="model-selector" id="modelSelect" onchange="app.changeModel()">
              ${modelOptions || '<option>No models available</option>'}
            </select>
          </div>
          <div class="header-right">
            <button class="btn-icon" onclick="app.clearHistory()" title="Clear History">🗑️</button>
            <button class="btn-icon" onclick="app.toggleTheme()" title="Toggle Theme">🌙</button>
            <button class="btn-icon" onclick="app.logout()" title="Logout">🚪</button>
          </div>
        </div>

        <!-- Messages Area -->
        <div class="messages-container" id="messagesContainer">
          <div class="empty-state">
            <div class="empty-state-icon">💭</div>
            <div class="empty-state-text">Start a conversation with Ollama AI</div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="input-area">
          <div class="input-wrapper">
            <textarea 
              class="input-field" 
              id="messageInput" 
              placeholder="Type your message... (Shift+Enter for new line)"
              rows="1"
            ></textarea>
            <button class="btn-send" id="sendBtn" onclick="app.sendMessage()" title="Send">↑</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const input = document.getElementById('messageInput');
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    input.addEventListener('input', (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    });
  }

  /**
   * Change selected model
   */
  changeModel() {
    this.currentModel = document.getElementById('modelSelect').value;
    localStorage.setItem('selectedModel', this.currentModel);
  }

  /**
   * Send message to Ollama
   */
  async sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message || this.isLoading) return;

    // Add user message to UI
    this.addMessage('user', message);
    input.value = '';
    input.style.height = 'auto';
    this.isLoading = true;
    document.getElementById('sendBtn').disabled = true;

    try {
      // Add AI thinking indicator
      this.addMessage('ai', '...');
      const aiMessageEl = document.querySelector('.message.ai:last-child .message-content');
      aiMessageEl.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: this.messages.map(m => ({ role: m.role, content: m.content })),
          model: this.currentModel,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error);
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let aiMessageContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (data.type === 'token') {
              aiMessageContent += data.content;
              aiMessageEl.innerHTML = this.markdownToHtml(aiMessageContent);
              this.scrollToBottom();
            } else if (data.type === 'complete') {
              // Remove the thinking indicator and finalize
              fullResponse = data.fullResponse;
              this.messages[this.messages.length - 1] = {
                role: 'assistant',
                content: fullResponse
              };
            }
          } catch (err) {
            console.error('Parse error:', err);
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Replace thinking indicator with error
      aiMessageEl.innerHTML = `<em style="opacity: 0.7;">⚠️ Error: ${error.message}</em>`;
    } finally {
      this.isLoading = false;
      document.getElementById('sendBtn').disabled = false;
      document.getElementById('messageInput').focus();
    }
  }

  /**
   * Add message to UI and internal state
   */
  addMessage(role, content) {
    const container = document.getElementById('messagesContainer');
    
    // Remove empty state if first message
    if (this.messages.length === 0 && container.querySelector('.empty-state')) {
      container.innerHTML = '';
    }

    // Add to internal state
    this.messages.push({
      role: role === 'user' ? 'user' : 'assistant',
      content: content
    });

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;

    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    
    if (role === 'user') {
      contentEl.textContent = content;
    } else {
      contentEl.innerHTML = this.markdownToHtml(content);
    }

    messageEl.appendChild(contentEl);
    container.appendChild(messageEl);

    this.scrollToBottom();
  }

  /**
   * Convert markdown to HTML with syntax highlighting
   */
  markdownToHtml(markdown) {
    if (!markdown) return '';

    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true
    });

    let html = marked.parse(markdown);

    // Highlight code blocks
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    doc.querySelectorAll('pre code').forEach((block) => {
      try {
        hljs.highlightElement(block);
      } catch (err) {
        console.warn('Highlight error:', err);
      }
    });

    return doc.body.innerHTML;
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 0);
  }

  /**
   * Clear chat history
   */
  async clearHistory() {
    if (!confirm('Clear all messages?')) return;

    try {
      await fetch('/api/session/history', { method: 'DELETE' });
      this.messages = [];
      const container = document.getElementById('messagesContainer');
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💭</div>
          <div class="empty-state-text">Start a conversation with Ollama AI</div>
        </div>
      `;
    } catch (error) {
      alert('Failed to clear history');
    }
  }

  /**
   * Toggle dark/light mode
   */
  toggleTheme() {
    this.darkMode = !this.darkMode;
    this.setTheme();
    localStorage.setItem('darkMode', this.darkMode);
  }

  /**
   * Apply theme
   */
  setTheme() {
    this.darkMode = localStorage.getItem('darkMode') !== 'false';
    document.body.className = this.darkMode ? 'dark-mode' : 'light-mode';
  }

  /**
   * Logout
   */
  async logout() {
    if (!confirm('Logout?')) return;
    
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      this.authenticated = false;
      this.messages = [];
      this.renderLoginScreen();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
}

// Initialize app when DOM is ready
const app = new OllamaChat();