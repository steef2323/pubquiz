'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Quiz {
  id: string;
  name: string;
  number?: number;
  questionsCount: number;
}

export default function QuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get auth token
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  };

  // Fetch user's quizzes
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          router.push('/login');
          return;
        }

        // Try with Authorization header first, fallback to query param
        const response = await fetch(`/api/quizzes?token=${encodeURIComponent(token)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch quizzes');
        }

        setQuizzes(data.quizzes);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load quizzes');
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [router]);

  const handleStartQuiz = (quizId: string) => {
    // Navigate to quiz start/host page (we'll create this in Phase 5)
    router.push(`/quiz/${quizId}/host`);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center party-container">
        <div className="text-center">
          <div className="disco-ball mb-8"></div>
          <h2 className="text-gradient text-2xl mb-4">Loading your quizzes...</h2>
          <p className="text-secondary">Please wait</p>
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
          <Link href="/" className="btn btn-primary w-full">
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen party-container py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="card mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-gradient text-3xl mb-2">My Quizzes</h1>
              <p className="text-secondary">
                {quizzes.length === 0 
                  ? "You haven't created any quizzes yet" 
                  : `You have ${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''}`}
              </p>
            </div>
            <Link href="/create-quiz" className="btn btn-primary">
              + Create New Quiz
            </Link>
          </div>
        </div>

        {/* Quizzes Grid */}
        {quizzes.length === 0 ? (
          <div className="card text-center py-16">
            <div className="disco-ball mb-8 mx-auto"></div>
            <h2 className="text-gradient text-2xl mb-4">No Quizzes Yet</h2>
            <p className="text-secondary mb-8">
              Create your first quiz to get started!
            </p>
            <Link href="/create-quiz" className="btn btn-primary">
              Create Your First Quiz
            </Link>
          </div>
        ) : (
          <div className="party-grid">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="card card-glow-pink hover:card-glow-cyan transition-all">
                <div className="flex flex-col h-full">
                  {/* Quiz Number/Name */}
                  <div className="mb-4">
                    {quiz.number && (
                      <span className="text-sm text-secondary mb-2 block">
                        Quiz #{quiz.number}
                      </span>
                    )}
                    <h3 className="text-xl text-gradient mb-2">
                      {quiz.name || 'Untitled Quiz'}
                    </h3>
                    <p className="text-sm text-secondary">
                      {quiz.questionsCount} question{quiz.questionsCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex gap-3">
                    <button
                      onClick={() => handleStartQuiz(quiz.id)}
                      className="btn btn-primary flex-1"
                    >
                      Start Quiz
                    </button>
                    <Link
                      href={`/create-quiz?quizId=${quiz.id}`}
                      className="btn btn-secondary flex-1"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

