import { NextRequest, NextResponse } from 'next/server';
import { getUserQuizzes } from '@/lib/airtable';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get token from request (try header first, then check if we need to get from query/cookie)
    let token = getTokenFromRequest(request);
    
    // If no token in header, try to get from query parameter (for client-side calls)
    if (!token) {
      const { searchParams } = new URL(request.url);
      token = searchParams.get('token') || null;
    }

    // Verify authentication
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

    console.log(`[API /quizzes] User authenticated: ${user.email}, userId: ${user.userId}`);

    // Get user's quizzes from Airtable
    const quizzes = await getUserQuizzes(user.userId);
    
    console.log(`[API /quizzes] Returning ${quizzes.length} quizzes for user ${user.userId}`);

    return NextResponse.json({
      success: true,
      quizzes: quizzes.map((quiz) => ({
        id: quiz.id,
        name: quiz.fields.Name || 'Untitled Quiz',
        number: quiz.fields.Number,
        questionsCount: quiz.fields.Questions?.length || 0,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
}

