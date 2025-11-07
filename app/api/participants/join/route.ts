import { NextRequest, NextResponse } from 'next/server';
import { createUser, getQuizSessionBySessionId, updateQuizSession } from '@/lib/airtable';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, quizId, name } = body;

    if (!sessionId || !quizId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create participant user record in Airtable
    // Participants are stored as Users with a special role or identifier
    const participant = await createUser({
      Name: name,
      Email: `participant-${sessionId}-${Date.now()}@quiz.local`, // Temporary email
      Password: '', // Participants don't need passwords
      Role: 'Participant',
    });

    // Add participant to quiz session
    const session = await getQuizSessionBySessionId(sessionId);
    if (session && session.id) {
      const currentParticipants = Array.isArray(session.fields?.Participants) 
        ? session.fields.Participants 
        : [];
      
      if (!currentParticipants.includes(participant.id!)) {
        await updateQuizSession(sessionId, {
          Participants: [...currentParticipants, participant.id!],
        });
      }
    }

    console.log('[API /participants/join] Participant created and added to session:', {
      participantId: participant.id,
      name,
      sessionId,
    });

    return NextResponse.json({
      success: true,
      participantId: participant.id,
      name,
      sessionId,
    });
  } catch (error: any) {
    console.error('[API /participants/join] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to join quiz' },
      { status: 500 }
    );
  }
}

