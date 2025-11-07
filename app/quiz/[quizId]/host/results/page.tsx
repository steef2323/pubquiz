'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface LeaderboardEntry {
  participantId: string;
  participantName: string;
  totalScore: number;
  questionsAnswered: number;
  correctAnswers: number;
  rank: number;
}

export default function QuizHostResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const quizId = params.quizId as string;
  const sessionId = searchParams.get('session') || '';
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealedEntries, setRevealedEntries] = useState(0);

  // Fetch final leaderboard and update session status
  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Update session status to Completed
        try {
          await fetch('/api/sessions/update', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              sessionId,
              Status: 'Completed',
              'Ended at': new Date().toISOString(),
              token,
            }),
          });
        } catch (err) {
          console.error('[Host Results] Error updating session status:', err);
        }

        // Fetch final leaderboard
        const response = await fetch(`/api/scores/update?sessionId=${encodeURIComponent(sessionId)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch leaderboard');
        }

        setLeaderboard(data.leaderboard || []);
        setLoading(false);

        // Start revealing entries one by one (Oscar-style)
        if (data.leaderboard && data.leaderboard.length > 0) {
          setTimeout(() => {
            data.leaderboard.forEach((_: any, index: number) => {
              setTimeout(() => {
                setRevealedEntries(index + 1);

                // Add confetti for top 3
                if (index < 3) {
                  for (let i = 0; i < 30; i++) {
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
          }, 1000); // 1 second initial delay
        }
      } catch (err: any) {
        console.error('[Host Results] Error:', err);
        setError(err.message || 'Failed to load results');
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchResults();
    } else {
      setError('Session ID is required');
      setLoading(false);
    }
  }, [sessionId, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center party-container">
        <div className="text-center">
          <div className="disco-ball mb-8" style={{ width: '120px', height: '120px' }}></div>
          <div className="leaderboard-loading-text text-gradient">
            Calculating Final Scores...
          </div>
          <div className="text-secondary text-center mt-4">
            <div className="leaderboard-loading-spinner mx-auto"></div>
          </div>
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
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-gradient text-5xl font-bold mb-4">
            🏆 Quiz Complete! 🏆
          </h1>
          <p className="text-secondary text-xl">
            Final Leaderboard
          </p>
        </div>

        {/* Final Leaderboard */}
        {leaderboard.length > 0 ? (
          <div className="card mb-8">
            <h2 className="text-gradient text-3xl mb-6 text-center font-bold">
              🎉 Final Results 🎉
            </h2>
            <div className="space-y-3">
              {leaderboard.map((entry, idx) => {
                const isRevealed = idx < revealedEntries;
                const isTopThree = idx < 3;

                return (
                  <div
                    key={entry.participantId}
                    className={`leaderboard-entry p-6 rounded-party-lg flex items-center justify-between transition-all ${
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
                      <div
                        className={`text-4xl font-bold ${
                          idx === 0
                            ? 'text-yellow-400'
                            : idx === 1
                            ? 'text-gray-300'
                            : idx === 2
                            ? 'text-orange-400'
                            : 'text-secondary'
                        }`}
                      >
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${entry.rank}`}
                      </div>
                      <div>
                        <div className="text-primary font-bold text-2xl">
                          {entry.participantName}
                        </div>
                        <div className="text-sm text-secondary mt-1">
                          {entry.correctAnswers} / {entry.questionsAnswered} correct
                        </div>
                      </div>
                    </div>
                    <div
                      className={`leaderboard-score text-accent font-bold text-4xl ${
                        isRevealed ? 'revealed' : ''
                      }`}
                    >
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
        ) : (
          <div className="card text-center">
            <p className="text-secondary">No scores available yet.</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/quizzes')}
            className="btn btn-primary text-lg px-8"
          >
            Back to My Quizzes
          </button>
          {quizId && (
            <button
              onClick={() => router.push(`/quiz/${quizId}/host`)}
              className="btn btn-secondary text-lg px-8"
            >
              Start New Session
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

