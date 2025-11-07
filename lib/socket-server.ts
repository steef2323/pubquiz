// Socket.io server setup for Next.js
// This will be used in a custom server or API route

import type { Server as SocketIOServerType } from 'socket.io';
import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServerType } from 'http';
import { Server as HTTPServer } from 'http';

let io: SocketIOServerType | null = null;

function initializeSocket(server: HTTPServerType) {
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

  // Store reference to io for use in closures (TypeScript knows it's not null here)
  const ioInstance = io;

  ioInstance.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    // Join a quiz session room
    socket.on('join-session', (sessionId: string) => {
      socket.join(sessionId);
      console.log(`[Socket] Client ${socket.id} joined session: ${sessionId}`);
    });

    // Leave a quiz session room
    socket.on('leave-session', (sessionId: string) => {
      socket.leave(sessionId);
      console.log(`[Socket] Client ${socket.id} left session: ${sessionId}`);
    });

    // Participant joins quiz
    socket.on('participant-join', (data: { sessionId: string; participant: any }) => {
      const { sessionId, participant } = data;
      console.log(`[Socket] Participant ${participant.name} joined session ${sessionId}`);
      // Broadcast to all clients in the session (including host)
      ioInstance.to(sessionId).emit('participant-joined', participant);
    });

    // Host starts quiz
    socket.on('start-quiz', (sessionId: string) => {
      console.log(`[Socket] Quiz started for session ${sessionId}`);
      // Broadcast to all participants in the session
      ioInstance.to(sessionId).emit('quiz-started');
    });

    // Participant submits answer
    socket.on('submit-answer', (data: { sessionId: string; answer: any }) => {
      const { sessionId, answer } = data;
      console.log(`[Socket] Answer submitted for session ${sessionId}`);
      // Broadcast to host only (or store in database)
      socket.to(sessionId).emit('answer-received', answer);
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

export { initializeSocket, getIO };
// Also export as CommonJS for compatibility with server.js
module.exports = { initializeSocket, getIO };

