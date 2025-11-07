// Standalone Socket.io server for QuizWeb
// Based on Socket.io tutorial: https://socket.io/docs/v4/tutorial/step-1
// This server can be deployed separately (Railway, Render, etc.) from the Next.js app

const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = createServer(app);

// Configure CORS - allow requests from your Next.js app
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'https://pubquiz-iota.vercel.app'];

const io = new Server(server, {
  path: '/api/socket',
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Enable CORS for Express routes (health check, etc.)
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connections: io.sockets.sockets.size 
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);

  // Join a quiz session room
  socket.on('join-session', (sessionId) => {
    if (!sessionId) {
      console.warn('[Socket] join-session called without sessionId');
      return;
    }
    socket.join(sessionId);
    console.log(`[Socket] Client ${socket.id} joined session: ${sessionId}`);
  });

  // Leave a quiz session room
  socket.on('leave-session', (sessionId) => {
    if (sessionId) {
      socket.leave(sessionId);
      console.log(`[Socket] Client ${socket.id} left session: ${sessionId}`);
    }
  });

  // Participant joins quiz
  socket.on('participant-join', (data) => {
    const { sessionId, participant } = data;
    if (!sessionId || !participant) {
      console.warn('[Socket] participant-join called with invalid data');
      return;
    }
    console.log(`[Socket] Participant ${participant.name} (${participant.id}) joined session ${sessionId}`);
    
    // Ensure the socket is in the session room
    socket.join(sessionId);
    
    // Broadcast to all clients in the session (including host)
    console.log(`[Socket] Broadcasting participant-joined to session ${sessionId}`);
    io.to(sessionId).emit('participant-joined', participant);
  });

  // Host starts quiz
  socket.on('start-quiz', (sessionId) => {
    if (!sessionId) {
      console.warn('[Socket] start-quiz called without sessionId');
      return;
    }
    console.log(`[Socket] Quiz started for session ${sessionId}`);
    // Broadcast to all participants in the session
    io.to(sessionId).emit('quiz-started');
  });

  // Question changed (host moves to next question)
  socket.on('question-changed', (data) => {
    const { sessionId, questionIndex } = data;
    if (!sessionId || questionIndex === undefined) {
      console.warn('[Socket] question-changed called with invalid data');
      return;
    }
    console.log(`[Socket] Question changed to index ${questionIndex} for session ${sessionId}`);
    io.to(sessionId).emit('question-changed', { questionIndex });
  });

  // Participant submits answer
  socket.on('submit-answer', (data) => {
    const { sessionId, answer } = data;
    if (!sessionId || !answer) {
      console.warn('[Socket] submit-answer called with invalid data');
      return;
    }
    console.log(`[Socket] Answer submitted for session ${sessionId} by participant ${answer.participantId}`);
    // Broadcast to host only (or store in database)
    socket.to(sessionId).emit('answer-received', answer);
  });

  // Show answers (host reveals correct answer)
  socket.on('show-answers', (data) => {
    const { sessionId } = data;
    if (!sessionId) {
      console.warn('[Socket] show-answers called without sessionId');
      return;
    }
    console.log(`[Socket] Showing answers for session ${sessionId}`);
    io.to(sessionId).emit('show-answers', data);
  });

  // Disconnect handling
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Client ${socket.id} disconnected: ${reason}`);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`[Socket] Error for client ${socket.id}:`, error);
  });
});

const port = process.env.PORT || 3001;
const host = process.env.HOST || '0.0.0.0';

server.listen(port, host, () => {
  console.log(`🚀 Socket.io server running on http://${host}:${port}`);
  console.log(`📡 Socket.io endpoint: http://${host}:${port}/api/socket`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`💚 Health check: http://${host}:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

