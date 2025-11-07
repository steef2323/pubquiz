import { NextRequest, NextResponse } from 'next/server';
import { updateQuiz, getQuizById } from '@/lib/airtable';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { getQuestionsByQuizId } from '@/lib/airtable';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get token from request
    const token = getTokenFromRequest(request);
    const url = new URL(request.url);
    const tokenParam = url.searchParams.get('token');
    const authToken = token || tokenParam;
    
    // Verify authentication
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

    const { id } = params;

    // Get quiz
    const quiz = await getQuizById(id);
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Check if user owns this quiz
    if (!quiz.fields.Users || !quiz.fields.Users.includes(user.userId)) {
      return NextResponse.json(
        { error: 'Unauthorized - You do not own this quiz' },
        { status: 403 }
      );
    }

    // Get questions for this quiz
    const questions = await getQuestionsByQuizId(id);
    
    console.log(`[API /quizzes/${id}] Found ${questions.length} questions for quiz ${id}`);

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        name: quiz.fields.Name || 'Untitled Quiz',
        number: quiz.fields.Number,
      },
      questions: questions.map((q) => {
        const answerType = q.fields['Answer type'] || '';
        const isEstimation = answerType.toLowerCase() === 'estimation';
        
        // For multiple choice, get all 4 answers (matching exact Airtable field names)
        // These should match what we save: "Question answer A", "Question answer B", etc.
        const multipleChoiceAnswers = [
          q.fields['Question answer A'] || '',
          q.fields['Question answer B'] || '',
          q.fields['Question answer C'] || '',
          q.fields['Question answer D'] || '',
        ];
        
        // Get correct answer from "Correct answer" field
        let correctAnswerValue: string | undefined = undefined;
        if (q.fields['Correct answer']) {
          correctAnswerValue = String(q.fields['Correct answer']).trim();
        } else if (isEstimation && q.fields['Estimation answer']) {
          // Fallback to old field for backward compatibility
          correctAnswerValue = String(q.fields['Estimation answer']).trim();
        }
        
        return {
          id: q.id,
          questionName: q.fields['Question name'] || undefined,
          questionText: q.fields['Question text'] || '',
          questionType: (q.fields['Question type']?.toLowerCase() || 'text') as 'text' | 'image' | 'video',
          answerType: (isEstimation ? 'estimation' : 'multiple choice') as 'multiple choice' | 'estimation',
          answers: isEstimation
            ? [q.fields['Estimation answer'] || '']
            : multipleChoiceAnswers,
          correctAnswer: correctAnswerValue,
          imageUrl: q.fields.Image?.[0]?.url,
          videoUrl: q.fields.Video?.[0]?.url,
          order: q.fields.Order ?? undefined,
        };
      }),
    });
  } catch (error: any) {
    console.error('Error fetching quiz:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quiz' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    const { name } = body;

    // Verify the quiz belongs to the user
    const quiz = await getQuizById(id);
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Check if user owns this quiz
    if (!quiz.fields.Users || !quiz.fields.Users.includes(user.userId)) {
      return NextResponse.json(
        { error: 'Unauthorized - You do not own this quiz' },
        { status: 403 }
      );
    }

    // Update quiz name
    const updatedQuiz = await updateQuiz(id, {
      Name: name,
    });

    return NextResponse.json({
      success: true,
      quiz: {
        id: updatedQuiz.id,
        name: updatedQuiz.fields.Name,
      },
    });
  } catch (error: any) {
    console.error('Quiz update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update quiz' },
      { status: 500 }
    );
  }
}
