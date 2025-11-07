import { NextRequest, NextResponse } from 'next/server';
import { createQuiz } from '@/lib/airtable';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

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

    // Create quiz in Airtable, linked to user
    console.log(`[API /quizzes/create] Creating quiz for user ${user.userId} (${user.email})`);
    const quiz = await createQuiz({
      Name: body.name || 'Untitled Quiz',
      Users: [user.userId], // Link to user
    });

    console.log(`[API /quizzes/create] Created quiz ${quiz.id} with Users field:`, quiz.fields.Users);

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        name: quiz.fields.Name,
      },
    });
  } catch (error: any) {
    console.error('Quiz creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create quiz' },
      { status: 500 }
    );
  }
}

