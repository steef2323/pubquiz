'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

export default function QuizPlayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const quizId = params.quizId as string;
  const sessionId = searchParams.get('session') || '';
  const participantName = searchParams.get('name') || '';
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [estimationAnswer, setEstimationAnswer] = useState<string>('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAnswers, setShowAnswers] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<string>('');
  const [correctParticipants, setCorrectParticipants] = useState<string[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [revealedEntries, setRevealedEntries] = useState<number>(0);
  const socketRef = useRef<Socket | null>(null);
  const participantIdRef = useRef<string>('');
  const questionStartTimeRef = useRef<number>(0);
  const submittedAnswerRef = useRef<string | number>('');

  // Get participant ID from localStorage (set when joining)
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionId) {
      const storedId = localStorage.getItem(`participant-${sessionId}`);
      if (storedId) {
        participantIdRef.current = storedId;
        console.log('[Participant Play] Loaded participant ID:', storedId);
      } else {
        console.warn('[Participant Play] No participant ID found in localStorage');
      }
    }
  }, [sessionId]);

  // Fetch quiz questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        // For participants, we can fetch without auth or use a public endpoint
        const response = await fetch(`/api/quizzes/${quizId}/public`);

        if (!response.ok) {
          throw new Error('Failed to fetch quiz');
        }

        const data = await response.json();
        console.log('[Participant Play] Fetched questions:', data.questions);
        
        // Debug: Log first question to see if answers are present
        if (data.questions && data.questions.length > 0) {
          console.log('[Participant Play] First question:', {
            id: data.questions[0].id,
            questionText: data.questions[0].questionText,
            answerType: data.questions[0].answerType,
            answers: data.questions[0].answers,
            answersLength: data.questions[0].answers?.length,
          });
        }
        
        setQuestions(data.questions || []);
        setLoading(false);
        
        // Start timer for first question
        if (data.questions && data.questions.length > 0) {
          questionStartTimeRef.current = Date.now();
        }
      } catch (err: any) {
        setError('Failed to load quiz questions');
        setLoading(false);
      }
    };

    if (quizId) {
      fetchQuestions();
    }
  }, [quizId]);

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
      console.log('[Participant Play] Connected to Socket.io');
      socket.emit('join-session', sessionId);
    });

    // Listen for question changes
    socket.on('question-changed', (data: { questionIndex: number }) => {
      console.log('[Participant Play] Question changed to:', data.questionIndex);
      setCurrentQuestionIndex(data.questionIndex);
      setSelectedAnswer('');
      setEstimationAnswer('');
      setAnswerSubmitted(false);
      setShowAnswers(false);
      setIsCorrect(null);
      setRevealedEntries(0);
      setLeaderboard([]);
      setLeaderboardLoading(false);
      questionStartTimeRef.current = Date.now(); // Track when question is displayed
    });

    // Listen for show answers (quiz ended or host showing results)
    socket.on('show-answers', (data?: { leaderboard?: any[], correctAnswer?: string }) => {
      // Defensive check: ensure data is an object
      if (!data || typeof data !== 'object') {
        console.warn('[Participant Play] Received invalid show-answers data:', data);
        return;
      }
      
      // Start loading animation
      setLeaderboardLoading(true);
      setShowAnswers(true);
      setRevealedEntries(0);
      
      // Set correct answer if provided
      if (data.correctAnswer) {
        setCorrectAnswer(data.correctAnswer);
      }
      
      // Set leaderboard and start dramatic reveal after a delay
      if (data.leaderboard && Array.isArray(data.leaderboard)) {
        const leaderboardData = data.leaderboard;
        setTimeout(() => {
          setLeaderboard(leaderboardData);
          setLeaderboardLoading(false);
          
          // Start revealing entries one by one (Oscar-style)
          leaderboardData.forEach((_, index) => {
            setTimeout(() => {
              setRevealedEntries(index + 1);
              
              // Add confetti for top 3
              if (index < 3) {
                // Create confetti effect
                for (let i = 0; i < 20; i++) {
                  const confetti = document.createElement('div');
                  confetti.className = 'confetti';
                  confetti.style.left = `${Math.random() * 100}%`;
                  confetti.style.animationDelay = `${Math.random() * 0.5}s`;
                  confetti.style.background = [
                    'var(--color-primary)',
                    'var(--color-accent)',
                    'var(--color-accent-2)',
                    'var(--color-accent-3)',
                    'var(--color-accent-4)',
                    'var(--color-accent-5)',
                    'var(--color-accent-6)',
                  ][Math.floor(Math.random() * 7)];
                  document.body.appendChild(confetti);
                  
                  setTimeout(() => {
                    confetti.remove();
                  }, 3000);
                }
              }
            }, index * 600); // 600ms delay between each reveal
          });
        }, 2000); // 2 second loading screen
      } else {
        setLeaderboardLoading(false);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleSubmitAnswer = async () => {
    if (!currentQuestion) return;

    const answer = currentQuestion.answerType === 'multiple choice' 
      ? selectedAnswer 
      : estimationAnswer;

    if (!answer || (typeof answer === 'string' && !answer.trim())) {
      setError('Please select or enter an answer.');
      return;
    }

    // Calculate time taken
    const timeTaken = (Date.now() - questionStartTimeRef.current) / 1000; // Convert to seconds
    submittedAnswerRef.current = answer;

    try {
      // Submit answer to API (which will calculate score and save to Airtable)
      const response = await fetch('/api/answers/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id,
          participantId: participantIdRef.current,
          answer: answer,
          timeTaken: timeTaken,
          questionIndex: currentQuestionIndex,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit answer');
      }

      // Don't show correct/incorrect immediately - wait for leaderboard
      // Store if answer was correct but don't display it yet
      setIsCorrect(data.answer.isCorrect);

      // Emit answer via Socket.io for real-time display on host screen
      if (socketRef.current && participantIdRef.current) {
        socketRef.current.emit('submit-answer', {
          sessionId,
          answer: {
            participantId: participantIdRef.current,
            participantName: participantName,
            questionId: currentQuestion.id,
            questionIndex: currentQuestionIndex,
            answer: answer,
            submittedAt: new Date(),
          },
        });
      }

      setAnswerSubmitted(true);
      setError('');
      
      // Don't show answers yet - wait for host to reveal

      // Update score for this participant
      await fetch('/api/scores/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          participantId: participantIdRef.current,
        }),
      });
    } catch (err: any) {
      console.error('[Participant Play] Error submitting answer:', err);
      setError(err.message || 'Failed to submit answer');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center party-container">
        <div className="text-center">
          <div className="disco-ball mb-8"></div>
          <h2 className="text-gradient text-2xl mb-4">Loading question...</h2>
        </div>
      </main>
    );
  }

  if (error || !currentQuestion) {
    return (
      <main className="min-h-screen flex items-center justify-center party-container">
        <div className="card max-w-md">
          <h2 className="text-gradient text-center mb-4">Error</h2>
          <p className="text-secondary mb-6">
            {error || 'No question available'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen party-container py-12">
      <div className="max-w-3xl mx-auto">
        {/* Question Counter */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-gradient text-xl">
              Question {currentQuestionIndex + 1} of {questions.length}
            </h2>
            {answerSubmitted && (
              <div className="text-green-400 font-semibold">
                ✓ Answer Submitted
              </div>
            )}
          </div>
        </div>

        {/* Current Question */}
        <div className="card mb-6">
          {/* Question Name/Header */}
          {currentQuestion.questionName && (
            <h3 className="text-gradient text-2xl mb-4">
              {currentQuestion.questionName}
            </h3>
          )}

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

          {/* Answer Input */}
          {!answerSubmitted ? (
            <div className="mb-6">
              {currentQuestion.answerType === 'multiple choice' ? (
                <div className="space-y-3">
                  {currentQuestion.answers && currentQuestion.answers.length > 0 ? (
                    currentQuestion.answers
                      .map((answer, originalIdx) => ({ answer: answer?.trim() || '', originalIdx }))
                      .filter(({ answer }) => answer.length > 0)
                      .map(({ answer, originalIdx }) => {
                        const optionLetter = String.fromCharCode(65 + originalIdx);
                        const isSelected = selectedAnswer === optionLetter;
                        const isCorrectOption = showAnswers && correctAnswer === optionLetter;
                        const isParticipantAnswer = showAnswers && String(submittedAnswerRef.current) === optionLetter;
                        
                        return (
                      <button
                        key={originalIdx}
                        onClick={() => setSelectedAnswer(optionLetter)}
                        disabled={answerSubmitted}
                        className={`w-full p-4 rounded-party-lg text-left transition-all ${
                          isSelected && !answerSubmitted
                            ? 'bg-accent text-white shadow-glow-yellow scale-105'
                            : showAnswers && isCorrectOption
                            ? 'bg-green-500/30 border-2 border-green-500 text-green-400'
                            : showAnswers && isParticipantAnswer && !isCorrectOption
                            ? 'bg-red-500/30 border-2 border-red-500 text-red-400'
                            : 'bg-bg-card text-primary hover:bg-bg-secondary'
                        }`}
                      >
                        <span className="font-bold mr-3">
                          {optionLetter}:
                        </span>
                        {answer}
                        {isSelected && !answerSubmitted && (
                          <span className="ml-2 text-sm">✓ Selected</span>
                        )}
                        {showAnswers && isCorrectOption && (
                          <span className="ml-2 text-sm">✓ Correct Answer</span>
                        )}
                        {showAnswers && isParticipantAnswer && !isCorrectOption && (
                          <span className="ml-2 text-sm">✗ Your Answer</span>
                        )}
                      </button>
                        );
                      })
                  ) : (
                    <div className="p-4 bg-red-500/20 border border-red-500 rounded-party-lg text-center">
                      <p className="text-red-400">No answer options available for this question.</p>
                      <p className="text-secondary text-sm mt-2">Debug: answers array is empty or undefined</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-secondary mb-2">
                    Your Answer (number):
                  </label>
                  <input
                    type="number"
                    value={estimationAnswer}
                    onChange={(e) => setEstimationAnswer(e.target.value)}
                    placeholder="Enter a number"
                    className={`input w-full text-2xl text-center ${
                      showAnswers
                        ? isCorrect
                          ? 'border-green-500 bg-green-500/20'
                          : 'border-red-500 bg-red-500/20'
                        : ''
                    }`}
                    autoFocus
                    disabled={answerSubmitted}
                  />
                  {showAnswers && (
                    <div className="mt-2 text-center">
                      {isCorrect !== null && (
                        <div className={`font-semibold ${
                          isCorrect ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {isCorrect ? '✓ Your answer was correct!' : '✗ Your answer was incorrect'}
                        </div>
                      )}
                      {correctAnswer && (
                        <div className="text-secondary text-sm mt-1">
                          Correct answer: {correctAnswer}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleSubmitAnswer}
                disabled={
                  (currentQuestion.answerType === 'multiple choice' && !selectedAnswer) ||
                  (currentQuestion.answerType === 'estimation' && !estimationAnswer.trim()) ||
                  answerSubmitted
                }
                className={`btn btn-primary w-full mt-6 text-xl ${
                  (currentQuestion.answerType === 'multiple choice' && !selectedAnswer) ||
                  (currentQuestion.answerType === 'estimation' && !estimationAnswer.trim()) ||
                  answerSubmitted
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                {answerSubmitted ? 'Answer Submitted ✓' : 'Submit Answer'}
              </button>
            </div>
          ) : (
            <div className="mb-6 p-6 bg-bg-card rounded-party-lg text-center border border-bg-secondary">
              <div className="text-4xl mb-4">✓</div>
              <p className="text-xl font-semibold mb-2 text-primary">
                Answer Submitted!
              </p>
              <p className="text-secondary mt-2">
                Waiting for results...
              </p>
            </div>
          )}
          
          {/* Show leaderboard and correct answer when host reveals */}
          {showAnswers && (
            <div className="mb-6 space-y-4">
              {/* Correct Answer Display */}
              <div className="card">
                <h3 className="text-gradient text-xl mb-3">Correct Answer</h3>
                {currentQuestion.answerType === 'multiple choice' ? (
                  <div className="p-4 bg-green-500/20 border-2 border-green-500 rounded-party-lg">
                    <p className="text-green-400 font-bold text-lg">
                      {correctAnswer || currentQuestion.correctAnswer || 'A'}: {
                        correctAnswer || currentQuestion.correctAnswer
                          ? currentQuestion.answers[(correctAnswer || currentQuestion.correctAnswer || 'A').charCodeAt(0) - 65] || 'N/A'
                          : currentQuestion.answers[0] || 'N/A'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-green-500/20 border-2 border-green-500 rounded-party-lg">
                    <p className="text-green-400 font-bold text-lg">
                      {correctAnswer || currentQuestion.correctAnswer || currentQuestion.answers[0] || 'N/A'}
                    </p>
                  </div>
                )}
                
                {/* Show if participant got it correct */}
                {isCorrect !== null && (
                  <div className={`mt-4 p-4 rounded-party-lg ${
                    isCorrect ? 'bg-green-500/20 border-2 border-green-500' : 'bg-red-500/20 border-2 border-red-500'
                  }`}>
                    <p className={`text-xl font-semibold ${
                      isCorrect ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {isCorrect ? '✓ You got it correct!' : '✗ Your answer was incorrect'}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Leaderboard Loading Screen */}
              {leaderboardLoading && (
                <div className="card leaderboard-loading">
                  <div className="disco-ball mb-8" style={{ width: '120px', height: '120px' }}></div>
                  <div className="leaderboard-loading-text text-gradient">
                    Calculating Scores...
                  </div>
                  <div className="text-secondary text-center mt-4">
                    <div className="leaderboard-loading-spinner mx-auto"></div>
                  </div>
                </div>
              )}
              
              {/* Leaderboard */}
              {!leaderboardLoading && leaderboard.length > 0 && (
                <div className="card">
                  <h3 className="text-gradient text-3xl mb-6 text-center font-bold">🏆 Leaderboard 🏆</h3>
                  <div className="space-y-3">
                    {leaderboard.map((entry, idx) => {
                      const isRevealed = idx < revealedEntries;
                      const isTopThree = idx < 3;
                      
                      return (
                        <div
                          key={entry.participantId}
                          className={`leaderboard-entry p-5 rounded-party-lg flex items-center justify-between transition-all ${
                            isRevealed ? 'revealed' : ''
                          } ${
                            idx === 0
                              ? 'bg-yellow-500/20 border-2 border-yellow-500 leaderboard-gold'
                              : idx === 1
                              ? 'bg-gray-400/20 border-2 border-gray-400'
                              : idx === 2
                              ? 'bg-orange-600/20 border-2 border-orange-600'
                              : 'bg-bg-card border border-bg-secondary'
                          }`}
                          style={{
                            animationDelay: `${idx * 0.1}s`,
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`text-3xl font-bold ${
                              idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-secondary'
                            }`}>
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${entry.rank}`}
                            </div>
                            <div>
                              <div className="text-primary font-bold text-xl">
                                {entry.participantName}
                                {entry.participantId === participantIdRef.current && (
                                  <span className="ml-2 text-accent text-lg">(You)</span>
                                )}
                              </div>
                              <div className="text-sm text-secondary mt-1">
                                {entry.correctAnswers} / {entry.questionsAnswered} correct
                              </div>
                            </div>
                          </div>
                          <div className={`leaderboard-score text-accent font-bold text-3xl ${
                            isRevealed ? 'revealed' : ''
                          }`}>
                            {isRevealed ? (
                              <span className="inline-block">
                                {entry.totalScore.toFixed(1)} pts
                              </span>
                            ) : (
                              <span className="opacity-50">???</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

