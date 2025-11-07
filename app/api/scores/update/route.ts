import { NextRequest, NextResponse } from 'next/server';
import {
  createScore,
  updateScore,
  getScoreBySessionParticipant,
  getAnswersBySession,
  getQuizSessionBySessionId,
} from '@/lib/airtable';

export const dynamic = 'force-dynamic';

/**
 * Calculate and update score for a participant in a session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, participantId } = body;

    if (!sessionId || !participantId) {
      return NextResponse.json(
        { error: 'Session ID and Participant ID are required' },
        { status: 400 }
      );
    }

    // Get session
    const session = await getQuizSessionBySessionId(sessionId);
    if (!session || !session.id) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get all answers for this participant in this session
    const allAnswers = await getAnswersBySession(sessionId);
    const participantAnswers = allAnswers.filter((a: any) => {
      const participantLinks = Array.isArray(a.fields?.Participant) ? a.fields.Participant : [];
      return participantLinks.includes(participantId);
    });

    // Calculate totals
    const totalScore = participantAnswers.reduce((sum: number, a: any) => {
      return sum + (a.fields?.['Total points'] || 0);
    }, 0);

    const questionsAnswered = participantAnswers.length;
    const correctAnswers = participantAnswers.filter((a: any) => a.fields?.['Is Correct']).length;

    // Check if score already exists
    const existingScore = await getScoreBySessionParticipant(sessionId, participantId);

    const scoreData = {
      Session: [session.id],
      Participant: [participantId],
      'Total score': totalScore,
      'Questions answered': questionsAnswered,
      'Correct answers': correctAnswers,
    };

    let savedScore;
    if (existingScore && existingScore.id) {
      // Update existing score
      savedScore = await updateScore(existingScore.id, scoreData);
    } else {
      // Create new score
      savedScore = await createScore(scoreData);
    }

    return NextResponse.json({
      success: true,
      score: {
        id: savedScore.id,
        totalScore: savedScore.fields['Total score'],
        questionsAnswered: savedScore.fields['Questions answered'],
        correctAnswers: savedScore.fields['Correct answers'],
      },
    });
  } catch (error: any) {
    console.error('[API /scores/update] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update score' },
      { status: 500 }
    );
  }
}

/**
 * Get leaderboard for a session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get all scores for this session
    const { getScoresBySession } = await import('@/lib/airtable');
    const scores = await getScoresBySession(sessionId);

    // Sort by total score descending
    const sortedScores = scores
      .map((score: any) => ({
        participantId: Array.isArray(score.fields?.Participant) ? score.fields.Participant[0] : null,
        totalScore: score.fields?.['Total score'] || 0,
        questionsAnswered: score.fields?.['Questions answered'] || 0,
        correctAnswers: score.fields?.['Correct answers'] || 0,
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((score, index) => ({
        ...score,
        rank: index + 1,
      }));

    // Get participant names
    const { getBase, TABLES } = await import('@/lib/airtable');
    const participantIds = sortedScores.map((s) => s.participantId).filter(Boolean);
    
    const participants: Record<string, string> = {};
    if (participantIds.length > 0) {
      const allUsers = await getBase()(TABLES.USERS)
        .select()
        .all();
      
      participantIds.forEach((id) => {
        const user = allUsers.find((u: any) => u.id === id);
        if (user) {
          const name = user.fields?.Name;
          participants[id] = typeof name === 'string' ? name : 'Unknown';
        }
      });
    }

    const leaderboard = sortedScores.map((score) => ({
      ...score,
      participantName: participants[score.participantId || ''] || 'Unknown',
    }));

    return NextResponse.json({
      success: true,
      leaderboard,
    });
  } catch (error: any) {
    console.error('[API /scores GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get leaderboard' },
      { status: 500 }
    );
  }
}

