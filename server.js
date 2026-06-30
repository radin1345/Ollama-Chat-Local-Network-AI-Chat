/**
 * TECH STACK JUSTIFICATION:
 * Node.js/Express chosen for:
 * - Excellent for real-time streaming via HTTP chunked responses
 * - Minimal overhead allows efficient proxying to Ollama API
 * - Native async/await handles multiple concurrent user sessions elegantly
 * - Fast JSON parsing for API communication
 * - Single-language full-stack simplifies deployment and session management
 * - Express ecosystem provides solid auth, CORS, and session middleware
 */

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_API = process.env.OLLAMA_API || 'http://localhost:11434';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'changeMe123!';

// In-memory session store (production: use MongoDB/Redis)
const sessionStore = new Map();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

// Session middleware - simple file-based for local network use
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Session data structure
const userSessions = new Map();

/**
 * Authentication middleware - verify user is logged in
 */
function authRequired(req, res, next) {
  if (!req.session.authenticated) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * POST /api/auth/login - Authenticate user
 */
app.post('/api/auth/login', express.json(), (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  // Simple password check (use bcrypt in production with stored hashes)
  if (password === AUTH_PASSWORD) {
    req.session.authenticated = true;
    req.session.userId = uuidv4();
    req.session.loginTime = Date.now();
    
    // Initialize user session data
    userSessions.set(req.session.userId, {
      chatHistory: [],
      createdAt: Date.now(),
      lastActive: Date.now()
    });

    return res.json({
      success: true,
      sessionId: req.session.userId,
      message: 'Authenticated successfully'
    });
  }

  res.status(401).json({ error: 'Invalid password' });
});

/**
 * POST /api/auth/logout - Clear session
 */
app.post('/api/auth/logout', (req, res) => {
  const userId = req.session.userId;
  if (userId && userSessions.has(userId)) {
    userSessions.delete(userId);
  }
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

/**
 * GET /api/auth/status - Check if authenticated
 */
app.get('/api/auth/status', (req, res) => {
  res.json({
    authenticated: req.session.authenticated || false,
    sessionId: req.session.userId || null
  });
});

/**
 * GET /api/models - List available Ollama models
 */
app.get('/api/models', authRequired, async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_API}/api/tags`, {
      timeout: 5000
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching models:', error.message);
    res.status(503).json({
      error: 'Failed to fetch models',
      details: error.message,
      hint: 'Ensure Ollama is running on localhost:11434'
    });
  }
});

/**
 * POST /api/chat - Stream chat response from Ollama
 * Handles streaming of tokens as they arrive
 */
app.post('/api/chat', authRequired, express.json({ limit: '10mb' }), async (req, res) => {
  const { messages, model } = req.body;
  const userId = req.session.userId;

  // Validate input
  if (!model) {
    return res.status(400).json({ error: 'Model parameter required' });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array required' });
  }

  try {
    // Get user session
    const userSession = userSessions.get(userId);
    if (!userSession) {
      return res.status(401).json({ error: 'Session expired' });
    }
    userSession.lastActive = Date.now();

    // Set headers for streaming
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Prepare conversation for Ollama
    const systemMessage = 'You are a helpful AI assistant. Provide clear, concise responses.';
    const conversationMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Stream request to Ollama
    const ollamaResponse = await axios.post(
      `${OLLAMA_API}/api/chat`,
      {
        model: model,
        messages: conversationMessages,
        stream: true,
        temperature: parseFloat(req.body.temperature) || 0.7
      },
      {
        responseType: 'stream',
        timeout: 120000 // 2 minute timeout for long responses
      }
    );

    let fullResponse = '';
    let tokenCount = 0;

    ollamaResponse.data.on('data', (chunk) => {
      try {
        const lines = chunk.toString().split('\n').filter(l => l.trim());
        lines.forEach(line => {
          const data = JSON.parse(line);
          if (data.message && data.message.content) {
            fullResponse += data.message.content;
            tokenCount++;
            // Send each token as NDJSON
            res.write(JSON.stringify({
              type: 'token',
              content: data.message.content,
              done: data.done || false
            }) + '\n');
          }
          if (data.done) {
            res.write(JSON.stringify({
              type: 'complete',
              totalTokens: tokenCount,
              fullResponse: fullResponse
            }) + '\n');
          }
        });
      } catch (err) {
        console.error('Error parsing Ollama response:', err);
      }
    });

    ollamaResponse.data.on('error', (error) => {
      console.error('Stream error:', error);
      res.write(JSON.stringify({
        type: 'error',
        error: 'Streaming error occurred'
      }) + '\n');
      res.end();
    });

    ollamaResponse.data.on('end', () => {
      // Store in user session history
      userSession.chatHistory.push({
        userMessage: messages[messages.length - 1].content,
        aiResponse: fullResponse,
        model: model,
        timestamp: Date.now()
      });
      res.end();
    });

  } catch (error) {
    console.error('Chat error:', error.message);
    const statusCode = error.code === 'ECONNREFUSED' ? 503 : 500;
    res.status(statusCode).json({
      error: 'Failed to process chat request',
      details: error.message,
      hint: statusCode === 503 ? 'Ollama service is not running on localhost:11434' : undefined
    });
  }
});

/**
 * GET /api/session/history - Get chat history for current user
 */
app.get('/api/session/history', authRequired, (req, res) => {
  const userId = req.session.userId;
  const userSession = userSessions.get(userId);

  if (!userSession) {
    return res.status(401).json({ error: 'Session not found' });
  }

  res.json({
    history: userSession.chatHistory,
    createdAt: userSession.createdAt,
    messageCount: userSession.chatHistory.length
  });
});

/**
 * DELETE /api/session/history - Clear chat history for current user
 */
app.delete('/api/session/history', authRequired, (req, res) => {
  const userId = req.session.userId;
  const userSession = userSessions.get(userId);

  if (!userSession) {
    return res.status(401).json({ error: 'Session not found' });
  }

  userSession.chatHistory = [];
  res.json({ success: true, message: 'Chat history cleared' });
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeSessions: userSessions.size
  });
});

/**
 * 404 - Catch all
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Ollama Chat Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Ollama API endpoint: ${OLLAMA_API}`);
  console.log(`🔐 Default password: ${AUTH_PASSWORD}`);
  console.log(`\n⚠️  IMPORTANT: Change AUTH_PASSWORD via environment variable in production!`);
  console.log(`\n📋 To find your local IP address:`);
  console.log(`   - Windows: ipconfig (look for IPv4 Address)`);
  console.log(`   - Mac/Linux: ifconfig or hostname -I`);
  console.log(`\n💻 Access from other devices: http://<YOUR_LOCAL_IP>:${PORT}`);
  console.log('\n✅ Server ready. Waiting for connections...\n');
});

module.exports = app;