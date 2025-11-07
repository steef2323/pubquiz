import { NextRequest, NextResponse } from 'next/server';
import { createQuizSession } from '@/lib/airtable';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get token from request
    const token = getTokenFromRequest(request);
    const body = await request.json();
    
    // Verify authentication
    const authToken = token || body.token;
    if (!authToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = verifyToken(authToken);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { quizId, sessionId } = body;

    if (!quizId || !sessionId) {
      return NextResponse.json(
        { error: 'Quiz ID and Session ID are required' },
        { status: 400 }
      );
    }

    // Create quiz session in Airtable
    const session = await createQuizSession({
      Quiz: [quizId],
      'Session ID': sessionId,
      Host: [user.userId],
      Participants: [], // Will be updated as participants join
      Status: 'Waiting',
    });

    console.log('[API /sessions/create] Quiz session created:', {
      sessionId: session.id,
      sessionIdField: session.fields['Session ID'],
      quizId,
      hostId: user.userId,
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        sessionId: session.fields['Session ID'],
        quizId,
        hostId: user.userId,
      },
    });
  } catch (error: any) {
    console.error('[API /sessions/create] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create quiz session' },
      { status: 500 }
    );
  }
}

