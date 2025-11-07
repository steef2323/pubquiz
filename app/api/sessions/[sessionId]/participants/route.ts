import { NextRequest, NextResponse } from 'next/server';
import { getQuizSessionBySessionId } from '@/lib/airtable';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sessionId = params.sessionId;
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get session from Airtable
    const session = await getQuizSessionBySessionId(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get participant IDs from session
    const participantIds = Array.isArray(session.fields?.Participants)
      ? session.fields.Participants
      : [];

    if (participantIds.length === 0) {
      return NextResponse.json({
        success: true,
        participants: [],
      });
    }

    // Fetch participant details from Users table
    const { getBase, TABLES } = await import('@/lib/airtable');
    const participants = [];

    for (const participantId of participantIds) {
      try {
        const userRecord = await getBase()(TABLES.USERS)
          .find(participantId);
        
        if (userRecord && userRecord.fields?.Name) {
          participants.push({
            id: participantId,
            name: userRecord.fields.Name,
            joinedAt: userRecord.fields.Created || new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error(`[API /sessions/${sessionId}/participants] Error fetching participant ${participantId}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      participants,
    });
  } catch (error: any) {
    console.error(`[API /sessions/[sessionId]/participants] Error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}

