import { NextRequest, NextResponse } from 'next/server';
import { getQuizById, getQuestionsByQuizId } from '@/lib/airtable';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get quiz (no auth required for public access)
    const quiz = await getQuizById(id);
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Get questions for this quiz
    const questions = await getQuestionsByQuizId(id);
    
    console.log(`[API /quizzes/${id}/public] Found ${questions.length} questions for quiz ${id}`);

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
        const answerA = q.fields['Question answer A'] || '';
        const answerB = q.fields['Question answer B'] || '';
        const answerC = q.fields['Question answer C'] || '';
        const answerD = q.fields['Question answer D'] || '';
        
        const multipleChoiceAnswers = [answerA, answerB, answerC, answerD];
        
        // Debug logging for first question
        if (questions.indexOf(q) === 0) {
          console.log('[API /quizzes/[id]/public] First question fields:', {
            id: q.id,
            questionText: q.fields['Question text'],
            answerType: answerType,
            isEstimation: isEstimation,
            answerA: answerA,
            answerB: answerB,
            answerC: answerC,
            answerD: answerD,
            allFields: Object.keys(q.fields),
          });
        }
        
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
    console.error('[API /quizzes/[id]/public] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quiz' },
      { status: 500 }
    );
  }
}

