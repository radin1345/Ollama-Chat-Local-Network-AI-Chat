# 🤖 Ollama Chat - Local Network AI Chat Application

A production-ready, full-stack web application that brings Ollama AI to your entire home network. Stream responses token-by-token with a stunning dark/light mode interface, multi-user session management, and robust authentication.

## ✨ Features

### Backend
- ✅ **Multi-user Session Management** - Each user has isolated chat history
- ✅ **Real-time Streaming** - Token-by-token response display from Ollama
- ✅ **Authentication & Access Control** - Password-protected access
- ✅ **Model Enumeration** - Dynamically lists available Ollama models
- ✅ **Comprehensive Error Handling** - Graceful failures with helpful messages
- ✅ **Production-Ready** - Clean code, proper error handling, security best practices

### Frontend
- ✅ **Dark/Light Mode** - Glassmorphism design with gradient accents
- ✅ **Smooth Animations** - Message fade-ins, streaming animations, thinking indicator
- ✅ **Markdown Rendering** - Full support for code blocks with syntax highlighting
- ✅ **Responsive Design** - Works beautifully on desktop and mobile
- ✅ **Real-time Streaming UI** - See AI responses as they arrive, token by token
- ✅ **Intuitive UX** - Send with Enter, new line with Shift+Enter

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ ([Download](https://nodejs.org/))
- **Ollama** running locally ([Download](https://ollama.ai))
- A model pulled in Ollama (e.g., `ollama pull mistral`)

### Installation & Setup

#### 1. Clone the repository
```bash
git clone https://github.com/radin1345/Ollama-Chat-Local-Network-AI-Chat.git
cd Ollama-Chat-Local-Network-AI-Chat
```

#### 2. Install dependencies
```bash
npm install
```

#### 3. Configure environment (optional)
```bash
cp .env.example .env
# Edit .env to change AUTH_PASSWORD and other settings
```

#### 4. Ensure Ollama is running
```bash
# On Windows/Mac: Start the Ollama app (it runs as a service)
# On Linux:
ollama serve

# In another terminal, ensure you have a model:
ollama pull mistral  # or any model you prefer
```

#### 5. Start the server
```bash
npm start
```

You should see:
```
🚀 Ollama Chat Server running on http://0.0.0.0:3000
📡 Ollama API endpoint: http://localhost:11434
🔐 Default password: changeMe123!
```

### 6. Access from your network

**Find your PC's local IP address:**

- **Windows**: Open Command Prompt and type:
  ```bash
  ipconfig
  ```
  Look for "IPv4 Address" under your network adapter (e.g., `192.168.1.100`)

- **Mac**: Open Terminal and type:
  ```bash
  ifconfig | grep "inet "
  ```
  Look for your local IP (usually starts with `192.168` or `10.0`)

- **Linux**: Open Terminal and type:
  ```bash
  hostname -I
  ```

**Open in browser from any device on your network:**
```
http://<YOUR_LOCAL_IP>:3000
```
Example: `http://192.168.1.100:3000`

**Login with the default password:**
```
changeMe123!
```

## 🔐 Security & Authentication

### Initial Setup
The default password is `changeMe123!`. **Change this immediately!**

### Changing the Password
Edit `.env` file:
```env
AUTH_PASSWORD=your_secure_password_here
```

Restart the server:
```bash
npm start
```

### Production Deployment
For production use, consider:
1. Using environment variables for all secrets
2. Implementing token-based authentication
3. Using HTTPS/SSL certificates
4. Restricting access via firewall rules
5. Using a proper database for session storage

## 🔥 Firewall Configuration

### Windows Firewall
1. Open **Windows Defender Firewall** → **Advanced settings**
2. Click **Inbound Rules** → **New Rule**
3. Select **Port** → **TCP** → Port **3000**
4. Allow the connection
5. Apply to Private networks only for security

### Mac Firewall
1. **System Preferences** → **Security & Privacy** → **Firewall**
2. Click **Firewall Options**
3. Node.js should already be listed; if not, add it manually

### Linux (UFW)
```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```

## 📋 Environment Variables

Create `.env` file in the root directory:

```env
# Server configuration
PORT=3000                                          # Server port
NODE_ENV=development                              # development or production

# Ollama configuration
OLLAMA_API=http://localhost:11434                 # Ollama API endpoint

# Security
AUTH_PASSWORD=changeMe123!                        # Login password (CHANGE THIS!)
SESSION_SECRET=your-secret-key-change-production # Session encryption key
```

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with password
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/status` - Check authentication status

### Chat
- `POST /api/chat` - Send message and stream response
- `GET /api/models` - List available Ollama models
- `GET /api/session/history` - Get chat history
- `DELETE /api/session/history` - Clear chat history

### System
- `GET /api/health` - Server health check

## 🛠️ Troubleshooting

### "Cannot reach server"
- Ensure the server is running: `npm start`
- Verify you're using the correct local IP address
- Check firewall isn't blocking port 3000
- Try accessing from the same PC first: `http://localhost:3000`

### "Failed to fetch models"
- Ensure Ollama is running
- Verify Ollama is on `localhost:11434` (or set `OLLAMA_API` env var)
- Check Ollama has at least one model: `ollama list`
- Try: `ollama pull mistral`

### "Streaming error occurred"
- Check server logs for details
- Ensure the model exists: `ollama list`
- Verify Ollama isn't having issues

### "Too many users / slow performance"
- Increase server resources
- Consider using a more powerful GPU for Ollama
- Limit concurrent users
- Use a production database for session storage

## 📊 Performance Tips

1. **Use GPU acceleration** - Configure Ollama to use your GPU for faster responses
2. **Use smaller models** - `neural-chat` or `orca-mini` are faster than `llama2` or `mistral`
3. **Adjust temperature** - Lower values (0.1-0.3) are faster; higher (0.7-1.0) are more creative
4. **Network optimization** - Use 5GHz WiFi for better streaming performance

## 🎨 Customization

### Change App Title
Edit `public/index.html` line 5:
```html
<title>Your Custom Title Here</title>
```

### Customize Colors
Edit `public/styles.css` `:root` section (lines 1-11):
```css
:root {
  --dark-accent: #YOUR_COLOR;
  /* ... */
}
```

### Modify System Prompt
Edit `server.js` line 166:
```javascript
const systemMessage = 'Your custom system prompt here';
```

## 📦 Tech Stack

**Backend:**
- Node.js + Express.js
- Express-session for session management
- Axios for HTTP requests
- bcryptjs for password hashing

**Frontend:**
- Vanilla JavaScript (ES6+)
- Marked.js for Markdown rendering
- Highlight.js for code syntax highlighting
- CSS3 with animations and glassmorphism

**Infrastructure:**
- Ollama API integration
- Streaming HTTP responses
- Real-time token delivery

## 🤝 Contributing

Contributions welcome! Please feel free to submit PRs for:
- Bug fixes
- Feature additions
- Performance improvements
- Documentation improvements

## 📝 License

MIT License - Feel free to use this project for personal or commercial use.

## ⚠️ Important Notes

1. **Default Password**: The default password is `changeMe123!` - **CHANGE THIS IMMEDIATELY** in production!
2. **Local Network Only**: This is designed for trusted local networks. Use VPN or firewall rules to restrict external access.
3. **Session Security**: Sessions are stored in-memory by default. For production, use a persistent database.
4. **HTTPS**: For external access, always use HTTPS/SSL certificates.
5. **Model Privacy**: Your chat data is stored locally. Check Ollama's privacy policy.

## 🚦 Development

### Running in development mode with auto-reload:
```bash
npm run dev
```

### Testing the API:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "changeMe123!"}'
```

## 📞 Support

For issues or questions:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Ensure Ollama is running and has models
3. Check server logs for error messages
4. Verify network connectivity

---

**Made with ❤️ for the local AI community**