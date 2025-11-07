import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center party-container">
      {/* Disco Ball */}
      <div className="disco-ball mb-12"></div>
      
      {/* Main Title */}
      <h1 className="text-gradient text-center mb-4 glow-text">
        Pub Quiz
      </h1>
      <p className="text-secondary text-xl mb-12 text-center max-w-md">
        Create amazing quizzes and host live sessions with real-time participation!
      </p>
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-6 items-center">
        <Link href="/register" className="btn btn-primary">
          Generate Pubquiz
        </Link>
        <Link href="/login" className="btn btn-secondary">
          Log In
        </Link>
      </div>
      
      {/* Confetti Elements (static for now, will be dynamic later) */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="confetti" data-index={i}></div>
        ))}
      </div>
    </main>
  );
}

