import { NextRequest, NextResponse } from 'next/server';
import { updateQuizSession, getQuizSessionBySessionId } from '@/lib/airtable';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
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

    const { sessionId, ...updateData } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify user is the host
    const session = await getQuizSessionBySessionId(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (!session.fields.Host || !session.fields.Host.includes(user.userId)) {
      return NextResponse.json(
        { error: 'Unauthorized - You are not the host of this session' },
        { status: 403 }
      );
    }

    // Update session
    const updatedSession = await updateQuizSession(sessionId, updateData);

    return NextResponse.json({
      success: true,
      session: {
        id: updatedSession.id,
        sessionId: updatedSession.fields['Session ID'],
        status: updatedSession.fields.Status,
      },
    });
  } catch (error: any) {
    console.error('[API /sessions/update] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update quiz session' },
      { status: 500 }
    );
  }
}

