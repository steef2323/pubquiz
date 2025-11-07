'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import QRCode from 'qrcode';

interface Participant {
  id: string;
  name: string;
  joinedAt: Date;
}

export default function QuizHostPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;
  const [sessionId, setSessionId] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Generate unique session ID and create quiz session
  useEffect(() => {
    const generateSessionId = () => {
      return `quiz-${quizId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);

    // Create quiz session in Airtable
    const createSession = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setError('Not authenticated');
          return;
        }

        const response = await fetch('/api/sessions/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            quizId,
            sessionId: newSessionId,
            token,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create session');
        }

        console.log('[Host] Quiz session created:', data);
      } catch (err: any) {
        console.error('[Host] Error creating session:', err);
        setError(err.message || 'Failed to create quiz session');
      }
    };

    if (newSessionId && quizId) {
      createSession();
    }
  }, [quizId]);

  // Initialize Socket.io connection and QR code
  useEffect(() => {
    if (!sessionId) return;

    // Generate participant join URL
    const participantUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/quiz/${quizId}/join?session=${sessionId}`
      : '';

    // Generate QR code
    QRCode.toDataURL(participantUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#FF6B9D',
        light: '#1A1A2E',
      },
    })
      .then((url) => {
        setQrCodeUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        console.error('QR code generation error:', err);
        setError('Failed to generate QR code');
        setLoading(false);
      });

    // Connect to Socket.io
    // For development, use localhost. For production, this should be your Socket.io server URL
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
      (typeof window !== 'undefined' ? window.location.origin : '');
    
    const connectSocket = () => {
      const socket = io(socketUrl, {
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: maxRetries,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[Host] Connected to Socket.io, socket ID:', socket.id);
        setSocketConnected(true);
        retryCountRef.current = 0;
        socket.emit('join-session', sessionId);
        console.log('[Host] Emitted join-session for:', sessionId);
      });

      socket.on('connect_error', (error) => {
        console.error('[Host] Socket connection error:', error);
        setSocketConnected(false);
        retryCountRef.current += 1;
        
        // Only show error after max retries and don't block the UI
        if (retryCountRef.current >= maxRetries) {
          console.warn('[Host] Socket.io connection failed after retries. Real-time features may be limited, but the quiz can still function.');
          // Don't set error state - allow the app to continue without WebSocket
        }
      });

      socket.on('reconnect_attempt', () => {
        console.log('[Host] Attempting to reconnect to Socket.io...');
      });

      socket.on('reconnect_failed', () => {
        console.warn('[Host] Socket.io reconnection failed. Real-time features unavailable.');
        setSocketConnected(false);
      });

      socket.on('disconnect', () => {
        console.log('[Host] Disconnected from Socket.io');
        setSocketConnected(false);
      });

      // Listen for participant joins
      socket.on('participant-joined', (participant: Participant) => {
        console.log('[Host] Participant joined event received:', participant);
        setParticipants((prev) => {
          // Check if participant already exists
          const exists = prev.find((p) => p.id === participant.id);
          if (exists) {
            console.log('[Host] Participant already in list, skipping');
            return prev;
          }
          console.log('[Host] Adding new participant to list');
          return [...prev, participant];
        });
      });

      // Debug: Log all socket events
      socket.onAny((event, ...args) => {
        console.log('[Host] Socket event received:', event, args);
      });

      socket.on('participant-left', (participantId: string) => {
        console.log('[Host] Participant left:', participantId);
        setParticipants((prev) => prev.filter((p) => p.id !== participantId));
      });
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [sessionId, quizId]);

  // Poll for participants if WebSocket is not connected
  useEffect(() => {
    if (!socketConnected && sessionId) {
      const pollParticipants = async () => {
        try {
          const token = localStorage.getItem('auth_token');
          if (!token) return;

          // Fetch participants from API
          const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/participants`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.participants) {
              setParticipants(data.participants);
            }
          }
        } catch (err) {
          console.error('[Host] Error polling participants:', err);
        }
      };

      // Poll immediately and then every 3 seconds
      pollParticipants();
      const interval = setInterval(pollParticipants, 3000);

      return () => clearInterval(interval);
    }
  }, [socketConnected, sessionId]);

  const handleStartQuiz = async () => {
    // Update session status to Active
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch('/api/sessions/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            sessionId,
            Status: 'Active',
            'Started at': new Date().toISOString(),
            token,
          }),
        });
      }
    } catch (err) {
      console.error('[Host] Error updating session status:', err);
    }

    // Emit start-quiz event if socket is connected
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('start-quiz', sessionId);
    } else {
      console.warn('[Host] Socket not connected, quiz start event not broadcasted via WebSocket');
    }

    setQuizStarted(true);
    // Navigate to question display page
    router.push(`/quiz/${quizId}/host/play?session=${sessionId}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center party-container">
        <div className="text-center">
          <div className="disco-ball mb-8"></div>
          <h2 className="text-gradient text-2xl mb-4">Setting up quiz...</h2>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center party-container">
        <div className="card max-w-md">
          <h2 className="text-gradient text-center mb-4">Error</h2>
          <p className="text-secondary mb-6">{error}</p>
          <button
            onClick={() => router.push('/quizzes')}
            className="btn btn-primary w-full"
          >
            Back to Quizzes
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen party-container py-12">
      <div className="max-w-4xl mx-auto">
        <div className="card mb-8">
          <h1 className="text-gradient text-3xl mb-4 text-center">Quiz Host</h1>
          <p className="text-secondary text-center mb-8">
            Share the QR code below for participants to join
          </p>

          {/* Connection Status Indicator */}
          {!socketConnected && (
            <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500 rounded-party-md text-yellow-300 text-sm text-center">
              ⚠️ Real-time connection unavailable. Participant updates may be delayed.
            </div>
          )}

          {/* QR Code */}
          <div className="flex justify-center mb-8">
            {qrCodeUrl && (
              <div className="bg-white p-4 rounded-party-lg">
                <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
              </div>
            )}
          </div>

          {/* Participant URL */}
          <div className="mb-8">
            <label className="block text-secondary mb-2 text-center">
              Or share this link:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/quiz/${quizId}/join?session=${sessionId}` : ''}
                className="input flex-1 text-center"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(`${window.location.origin}/quiz/${quizId}/join?session=${sessionId}`);
                  }
                }}
                className="btn btn-secondary"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Participants List */}
          <div className="mb-8">
            <h2 className="text-xl text-gradient mb-4 text-center">
              Participants ({participants.length})
            </h2>
            {participants.length === 0 ? (
              <p className="text-secondary text-center py-8">
                Waiting for participants to join...
              </p>
            ) : (
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="card card-glow-cyan p-4 flex items-center justify-between"
                  >
                    <span className="text-primary font-semibold">
                      {participant.name}
                    </span>
                    <span className="text-sm text-secondary">
                      Joined
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Start Quiz Button */}
          <div className="text-center">
            <button
              onClick={handleStartQuiz}
              disabled={participants.length === 0}
              className={`btn btn-primary btn-accent text-xl px-12 py-4 ${
                participants.length === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              {participants.length === 0
                ? 'Waiting for participants...'
                : `Start Quiz (${participants.length} participant${participants.length !== 1 ? 's' : ''})`}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

