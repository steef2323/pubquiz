// Socket.io server setup for Next.js
// This will be used in a custom server or API route

const { Server: SocketIOServer } = require('socket.io');
const { Server: HTTPServer } = require('http');

let io = null;

function initializeSocket(server) {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    // Join a quiz session room
    socket.on('join-session', (sessionId) => {
      socket.join(sessionId);
      console.log(`[Socket] Client ${socket.id} joined session: ${sessionId}`);
    });

    // Leave a quiz session room
    socket.on('leave-session', (sessionId) => {
      socket.leave(sessionId);
      console.log(`[Socket] Client ${socket.id} left session: ${sessionId}`);
    });

    // Participant joins quiz
    socket.on('participant-join', (data) => {
      const { sessionId, participant } = data;
      console.log(`[Socket] Participant ${participant.name} (${participant.id}) joined session ${sessionId}`);
      
      // Ensure the socket is in the session room
      socket.join(sessionId);
      
      // Broadcast to all clients in the session (including host)
      console.log(`[Socket] Broadcasting participant-joined to session ${sessionId}`);
      io.to(sessionId).emit('participant-joined', participant);
    });

    // Host starts quiz
    socket.on('start-quiz', (sessionId) => {
      console.log(`[Socket] Quiz started for session ${sessionId}`);
      // Broadcast to all participants in the session
      io.to(sessionId).emit('quiz-started');
    });

    // Participant submits answer
    socket.on('submit-answer', (data) => {
      const { sessionId, answer } = data;
      console.log(`[Socket] Answer submitted for session ${sessionId}:`, answer);
      // Broadcast to all clients in session (host will receive it)
      // Using io.to() instead of socket.to() to broadcast to all including sender
      io.to(sessionId).emit('answer-received', answer);
    });

    // Host changes question
    socket.on('question-changed', (data) => {
      const { sessionId, questionIndex } = data;
      console.log(`[Socket] Question changed to index ${questionIndex} for session ${sessionId}`);
      // Broadcast to all participants
      socket.to(sessionId).emit('question-changed', { questionIndex });
    });

    // Host shows answers
    socket.on('show-answers', (data) => {
      if (!data || typeof data !== 'object') {
        console.error('[Socket] Invalid show-answers data:', data);
        return;
      }
      const { sessionId, leaderboard, correctAnswer } = data;
      if (!sessionId) {
        console.error('[Socket] Missing sessionId in show-answers data');
        return;
      }
      console.log(`[Socket] Showing answers for session ${sessionId}`, { hasLeaderboard: !!leaderboard, correctAnswer });
      // Broadcast to all participants (including leaderboard and correct answer)
      io.to(sessionId).emit('show-answers', { 
        leaderboard: leaderboard || [], 
        correctAnswer: correctAnswer || '' 
      });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Client disconnected:', socket.id);
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initializeSocket, getIO };

