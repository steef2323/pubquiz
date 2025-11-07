'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

interface Question {
  id: string;
  questionName?: string;
  questionText: string;
  questionType: 'text' | 'image' | 'video';
  answerType: 'multiple choice' | 'estimation';
  answers: string[];
  correctAnswer?: string; // The correct answer from Airtable ("A", "B", "C", "D" for multiple choice, or number for estimation)
  imageUrl?: string;
  videoUrl?: string;
}

interface Answer {
  participantId: string;
  participantName: string;
  answer: string;
  submittedAt: Date;
}

interface LeaderboardEntry {
  rank: number;
  participantId: string;
  participantName: string;
  totalScore: number;
  questionsAnswered: number;
  correctAnswers: number;
}

export default function QuizHostPlayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const quizId = params.quizId as string;
  const sessionId = searchParams.get('session') || '';
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Fetch quiz questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`/api/quizzes/${quizId}?token=${encodeURIComponent(token)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch quiz');
        }

        setQuestions(data.questions || []);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load quiz');
        setLoading(false);
      }
    };

    if (quizId) {
      fetchQuestions();
    }
  }, [quizId, router]);

  // Set up Socket.io connection
  useEffect(() => {
    if (!sessionId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
      (typeof window !== 'undefined' ? window.location.origin : '');
    
    const socket = io(socketUrl, {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Host Play] Connected to Socket.io');
      socket.emit('join-session', sessionId);
    });

    // Listen for answers from participants
    socket.on('answer-received', (answer: Answer) => {
      console.log('[Host Play] Answer received:', answer);
      setAnswers((prev) => {
        // Check if answer already exists
        const exists = prev.find(
          (a) => a.participantId === answer.participantId && 
                 a.answer === answer.answer
        );
        if (exists) return prev;
        return [...prev, answer];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  // Emit first question when quiz starts (when questions are loaded)
  useEffect(() => {
    if (questions.length > 0 && socketRef.current && sessionId) {
      console.log('[Host Play] Emitting first question to participants');
      socketRef.current.emit('question-changed', {
        sessionId,
        questionIndex: 0,
      });
    }
  }, [questions.length, sessionId]);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setAnswers([]);
      setShowAnswers(false);
      setShowLeaderboard(false);
      
      // Emit question change to participants
      if (socketRef.current) {
        socketRef.current.emit('question-changed', {
          sessionId,
          questionIndex: currentQuestionIndex + 1,
        });
      }
    }
  };

  const handleShowAnswers = async () => {
    setShowAnswers(true);
    
    // Fetch leaderboard first
    await fetchLeaderboard();
    setShowLeaderboard(true);

    // Get correct answer for current question from the question object
    let correctAnswerValue = '';
    if (currentQuestion) {
      if (currentQuestion.correctAnswer) {
        // Use the correct answer from the question object
        correctAnswerValue = currentQuestion.correctAnswer;
      } else {
        // Fallback if not available
        if (currentQuestion.answerType === 'estimation') {
          correctAnswerValue = currentQuestion.answers[0] || '';
        } else {
          correctAnswerValue = 'A'; // Default fallback
        }
      }
    }

    // Emit show answers and leaderboard to participants
    if (socketRef.current && leaderboard.length > 0) {
      socketRef.current.emit('show-answers', { 
        sessionId,
        leaderboard: leaderboard,
        correctAnswer: correctAnswerValue,
      });
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/scores/update?sessionId=${sessionId}`);
      const data = await response.json();
      
      if (response.ok && data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error('[Host Play] Error fetching leaderboard:', err);
    }
  };

  const handleEndQuiz = () => {
    // Navigate to results/leaderboard page
    router.push(`/quiz/${quizId}/host/results?session=${sessionId}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center party-container">
        <div className="text-center">
          <div className="disco-ball mb-8"></div>
          <h2 className="text-gradient text-2xl mb-4">Loading quiz...</h2>
        </div>
      </main>
    );
  }

  if (error || questions.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center party-container">
        <div className="card max-w-md">
          <h2 className="text-gradient text-center mb-4">Error</h2>
          <p className="text-secondary mb-6">
            {error || 'No questions found in this quiz'}
          </p>
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
        {/* Question Counter */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-gradient text-xl">
              Question {currentQuestionIndex + 1} of {questions.length}
            </h2>
            <div className="text-secondary">
              {answers.length} answer{answers.length !== 1 ? 's' : ''} received
            </div>
          </div>
        </div>

        {/* Current Question */}
        {currentQuestion && (
          <div className="card mb-6">
            {/* Question Name/Header */}
            {currentQuestion.questionName && (
              <h3 className="text-gradient text-2xl mb-4">
                {currentQuestion.questionName}
              </h3>
            )}

            {/* Question Type Indicator */}
            <div className="mb-4">
              <span className="inline-block px-4 py-2 rounded-party-md bg-accent/20 text-accent text-sm font-semibold">
                {currentQuestion.questionType.charAt(0).toUpperCase() + currentQuestion.questionType.slice(1)} Question
              </span>
              <span className="inline-block ml-3 px-4 py-2 rounded-party-md bg-accent-2/20 text-accent-2 text-sm font-semibold">
                {currentQuestion.answerType === 'multiple choice' ? 'Multiple Choice' : 'Estimation'}
              </span>
            </div>

            {/* Question Media */}
            {currentQuestion.questionType === 'image' && currentQuestion.imageUrl && (
              <div className="mb-6 flex justify-center">
                <img
                  src={currentQuestion.imageUrl}
                  alt="Question"
                  className="max-w-full h-auto rounded-party-lg shadow-glow-pink"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            )}

            {currentQuestion.questionType === 'video' && currentQuestion.videoUrl && (
              <div className="mb-6 flex justify-center">
                <video
                  src={currentQuestion.videoUrl}
                  controls
                  className="max-w-full rounded-party-lg shadow-glow-cyan"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            )}

            {/* Question Text */}
            <div className="mb-6">
              <p className="text-xl text-primary leading-relaxed">
                {currentQuestion.questionText}
              </p>
            </div>

            {/* Answer Options (for reference) */}
            {currentQuestion.answerType === 'multiple choice' && (
              <div className="mb-6 p-4 bg-bg-card rounded-party-md">
                <h4 className="text-secondary mb-3 font-semibold">Answer Options:</h4>
                <div className="space-y-2">
                  {currentQuestion.answers.map((answer, idx) => (
                    answer.trim() && (
                      <div
                        key={idx}
                        className="p-3 bg-bg-secondary rounded-party-md text-primary"
                      >
                        <span className="font-bold text-accent mr-2">
                          {String.fromCharCode(65 + idx)}:
                        </span>
                        {answer}
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {currentQuestion.answerType === 'estimation' && (
              <div className="mb-6 p-4 bg-bg-card rounded-party-md">
                <h4 className="text-secondary mb-2 font-semibold">Answer Type:</h4>
                <p className="text-primary">Estimation (participants enter a number)</p>
              </div>
            )}

            {/* Answers Received */}
            {showAnswers && (
              <div className="mt-6 p-4 bg-bg-card rounded-party-md">
                <h4 className="text-secondary mb-3 font-semibold">
                  Answers Received ({answers.length}):
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {answers.length === 0 ? (
                    <p className="text-secondary">No answers yet</p>
                  ) : (
                    answers.map((answer, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-bg-secondary rounded-party-md flex items-center justify-between"
                      >
                        <div>
                          <span className="text-primary font-semibold">
                            {answer.participantName}:
                          </span>
                          <span className="text-secondary ml-2">{answer.answer}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard */}
        {showLeaderboard && leaderboard.length > 0 && (
          <div className="card mb-6">
            <h3 className="text-gradient text-2xl mb-4 text-center">Leaderboard</h3>
            <div className="space-y-2">
              {leaderboard.map((entry, idx) => (
                <div
                  key={entry.participantId}
                  className={`p-4 rounded-party-lg flex items-center justify-between ${
                    idx === 0
                      ? 'bg-yellow-500/20 border-2 border-yellow-500 shadow-glow-yellow'
                      : idx === 1
                      ? 'bg-gray-400/20 border-2 border-gray-400'
                      : idx === 2
                      ? 'bg-orange-600/20 border-2 border-orange-600'
                      : 'bg-bg-card border border-bg-secondary'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`text-2xl font-bold ${
                      idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-secondary'
                    }`}>
                      #{entry.rank}
                    </div>
                    <div>
                      <div className="text-primary font-semibold text-lg">
                        {entry.participantName}
                      </div>
                      <div className="text-sm text-secondary">
                        {entry.correctAnswers} / {entry.questionsAnswered} correct
                      </div>
                    </div>
                  </div>
                  <div className="text-accent font-bold text-xl">
                    {entry.totalScore.toFixed(1)} pts
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="card">
          <div className="flex gap-4 justify-center">
            {!showAnswers ? (
              <button
                onClick={handleShowAnswers}
                className="btn btn-accent"
                disabled={answers.length === 0}
              >
                Show Answers ({answers.length})
              </button>
            ) : (
              <>
                {!isLastQuestion ? (
                  <button
                    onClick={handleNextQuestion}
                    className="btn btn-primary text-xl px-8"
                  >
                    Next Question →
                  </button>
                ) : (
                  <button
                    onClick={handleEndQuiz}
                    className="btn btn-primary text-xl px-8"
                  >
                    End Quiz & Show Results
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

