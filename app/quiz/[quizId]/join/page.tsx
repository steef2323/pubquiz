'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

export default function QuizJoinPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const quizId = params.quizId as string;
  const sessionId = searchParams.get('session') || '';
  const [participantName, setParticipantName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const participantIdRef = useRef<string>('');

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      return;
    }

    // Connect to Socket.io
    // For development, use localhost. For production, this should be your Socket.io server URL
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
      (typeof window !== 'undefined' ? window.location.origin : '');
    
    const socket = io(socketUrl, {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Participant] Connected to Socket.io, socket ID:', socket.id);
      socket.emit('join-session', sessionId);
      console.log('[Participant] Emitted join-session for:', sessionId);
    });

    socket.on('connect_error', (error) => {
      console.error('[Participant] Socket connection error:', error);
    });

    // Debug: Log all socket events
    socket.onAny((event, ...args) => {
      console.log('[Participant] Socket event received:', event, args);
    });

    socket.on('disconnect', () => {
      console.log('[Participant] Disconnected from Socket.io');
    });

    socket.on('quiz-started', () => {
      console.log('[Participant] Quiz started!');
      // Navigate to participant play page
      router.push(`/quiz/${quizId}/play?session=${sessionId}&name=${encodeURIComponent(participantName)}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, quizId, router, participantName]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!participantName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!sessionId) {
      setError('Invalid session');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      // Wait for socket to be connected and joined to session
      if (!socketRef.current || !socketRef.current.connected) {
        throw new Error('Not connected to server. Please refresh and try again.');
      }

      // Ensure we're in the session room
      socketRef.current.emit('join-session', sessionId);

      // Create participant record in Airtable
      const response = await fetch('/api/participants/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          quizId,
          name: participantName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join quiz');
      }

      // Store participant ID in localStorage for later use
      if (typeof window !== 'undefined' && data.participantId) {
        localStorage.setItem(`participant-${sessionId}`, data.participantId);
        participantIdRef.current = data.participantId;
      }

      // Wait a bit to ensure socket is ready, then emit join event
      await new Promise(resolve => setTimeout(resolve, 100));

      // Emit join event via Socket.io
      if (socketRef.current && socketRef.current.connected) {
        console.log('[Participant] Emitting participant-join event:', {
          sessionId,
          participantId: data.participantId,
          name: participantName.trim(),
        });
        
        socketRef.current.emit('participant-join', {
          sessionId,
          participant: {
            id: data.participantId,
            name: participantName.trim(),
            joinedAt: new Date(),
          },
        });
      } else {
        console.error('[Participant] Socket not connected when trying to emit participant-join');
      }

      setJoined(true);
    } catch (err: any) {
      setError(err.message || 'Failed to join quiz');
      setIsJoining(false);
    }
  };

  if (!sessionId) {
    return (
      <main className="min-h-screen flex items-center justify-center party-container">
        <div className="card max-w-md">
          <h2 className="text-gradient text-center mb-4">Invalid Session</h2>
          <p className="text-secondary mb-6">
            No session ID provided. Please scan the QR code or use the join link.
          </p>
        </div>
      </main>
    );
  }

  if (joined) {
    return (
      <main className="min-h-screen flex items-center justify-center party-container">
        <div className="card max-w-md text-center">
          <div className="disco-ball mb-8 mx-auto"></div>
          <h2 className="text-gradient text-2xl mb-4">Welcome, {participantName}!</h2>
          <p className="text-secondary mb-8">
            You&apos;ve joined the quiz. Waiting for the host to start...
          </p>
          <div className="pulse">
            <div className="text-accent text-4xl mb-4">🎉</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center party-container">
      <div className="card max-w-md w-full">
        <h1 className="text-gradient text-3xl mb-2 text-center">Join Quiz</h1>
        <p className="text-secondary text-center mb-8">
          Enter your name to join the quiz
        </p>

        <form onSubmit={handleJoin}>
          <div className="mb-6">
            <label htmlFor="name" className="block text-secondary mb-2">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your name"
              className="input w-full"
              disabled={isJoining}
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-party-md text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isJoining || !participantName.trim()}
            className={`btn btn-primary w-full ${
              isJoining || !participantName.trim()
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {isJoining ? 'Joining...' : 'Join Quiz'}
          </button>
        </form>
      </div>
    </main>
  );
}

