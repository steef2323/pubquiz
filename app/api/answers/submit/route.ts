import { NextRequest, NextResponse } from 'next/server';
import {
  createAnswer,
  updateAnswer,
  getAnswerBySessionQuestionParticipant,
  getQuizSessionBySessionId,
  getAnswersBySession,
  getBase,
  TABLES,
} from '@/lib/airtable';
import { calculateScore } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

// Helper to get question by ID
async function getQuestionById(questionId: string) {
  try {
    const record = await getBase()(TABLES.QUESTIONS).find(questionId);
    return record as any;
  } catch (error) {
    console.error('[getQuestionById] Error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      questionId,
      participantId,
      answer,
      timeTaken,
      questionIndex,
    } = body;

    if (!sessionId || !questionId || !participantId || answer === undefined || timeTaken === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get session record
    const session = await getQuizSessionBySessionId(sessionId);
    if (!session || !session.id) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get question to find correct answer
    const question = await getQuestionById(questionId);
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    const questionFields = question.fields || {};
    const answerType = (questionFields['Answer type'] || '').toLowerCase();
    const isEstimation = answerType === 'estimation';

    // Get correct answer from "Correct answer" field
    // This field can contain:
    // - For multiple choice: "A", "B", "C", or "D" (case-insensitive)
    // - For estimation: a number (as string)
    let correctAnswer: string | number = '';
    
    if (questionFields['Correct answer']) {
      // Use the "Correct answer" field if it exists
      const correctAnswerValue = questionFields['Correct answer'];
      if (isEstimation) {
        // For estimation, convert to number
        correctAnswer = typeof correctAnswerValue === 'string' ? parseFloat(correctAnswerValue) : correctAnswerValue;
      } else {
        // For multiple choice, use the letter (uppercase)
        correctAnswer = String(correctAnswerValue).trim().toUpperCase();
      }
    } else {
      // Fallback to old "Estimation answer" field for backward compatibility
      if (isEstimation) {
        correctAnswer = questionFields['Estimation answer'] || '';
      } else {
        // Fallback: assume "A" if no correct answer field
        console.warn('[API /answers/submit] No "Correct answer" field found, defaulting to "A"');
        correctAnswer = 'A';
      }
    }

    // Get all answers for this question to calculate time bonus
    const allAnswers = await getAnswersBySession(sessionId);
    const questionAnswers = allAnswers.filter((a: any) => {
      const questionLinks = Array.isArray(a.fields?.Question) ? a.fields.Question : [];
      return questionLinks.includes(questionId);
    });
    
    const allTimes = questionAnswers.map((a: any) => a.fields?.['Time taken'] || 0);
    allTimes.push(timeTaken); // Include current answer

    // First check if answer is correct to determine if we should include it in time bonus calculation
    const { calculateBasePoints } = await import('@/lib/scoring');
    const { isCorrect: willBeCorrect } = calculateBasePoints(
      isEstimation ? 'estimation' : 'multiple choice',
      answer,
      correctAnswer
    );

    // Get times from only correct answers for time bonus calculation
    const correctAnswerTimes = questionAnswers
      .filter((a: any) => a.fields?.['Is Correct'] === true)
      .map((a: any) => a.fields?.['Time taken'] || 0);
    
    // Include current answer time if it will be correct
    if (willBeCorrect) {
      correctAnswerTimes.push(timeTaken);
    }

    // Calculate score (time bonus only for correct answers)
    const scoringResult = calculateScore(
      isEstimation ? 'estimation' : 'multiple choice',
      answer,
      correctAnswer,
      timeTaken,
      allTimes,
      correctAnswerTimes // Only correct answer times for time bonus
    );

    // Check if answer already exists (participant changed their answer)
    const existingAnswer = await getAnswerBySessionQuestionParticipant(
      sessionId,
      questionId,
      participantId
    );

    const answerData = {
      Session: [session.id],
      Question: [questionId],
      Participant: [participantId],
      'Answer text': String(answer),
      'Is Correct': scoringResult.isCorrect,
      'Base points': scoringResult.basePoints,
      'Time bonus': scoringResult.timeBonus,
      // Note: 'Total points' is a computed/formula field in Airtable, so we don't set it
      // It will be automatically calculated as Base points + Time bonus
      'Time taken': timeTaken,
      'Submitted at': new Date().toISOString(),
      'Question index': questionIndex !== undefined ? questionIndex : 0,
    };

    let savedAnswer;
    if (existingAnswer && existingAnswer.id) {
      // Update existing answer
      const { updateAnswer } = await import('@/lib/airtable');
      savedAnswer = await updateAnswer(existingAnswer.id, answerData);
    } else {
      // Create new answer
      savedAnswer = await createAnswer(answerData);
    }

    console.log('[API /answers/submit] Answer saved:', {
      answerId: savedAnswer.id,
      isCorrect: scoringResult.isCorrect,
      basePoints: scoringResult.basePoints,
      timeBonus: scoringResult.timeBonus,
      totalPoints: scoringResult.totalPoints,
    });

    return NextResponse.json({
      success: true,
      answer: {
        id: savedAnswer.id,
        isCorrect: scoringResult.isCorrect,
        basePoints: scoringResult.basePoints,
        timeBonus: scoringResult.timeBonus,
        totalPoints: scoringResult.totalPoints,
      },
    });
  } catch (error: any) {
    console.error('[API /answers/submit] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit answer' },
      { status: 500 }
    );
  }
}

