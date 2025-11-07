import { NextRequest, NextResponse } from 'next/server';
import { createQuestion } from '@/lib/airtable';
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

    const { quizId, token: _, ...questionData } = body;

    // Remove Order field if it doesn't exist in Airtable (will cause UNKNOWN_FIELD_NAME error)
    // Uncomment the delete line below once you add the "Order" field to Airtable Questions table
    const cleanQuestionData = { ...questionData };
    delete cleanQuestionData.Order; // Remove Order field until it exists in Airtable

    // Check if Image URL is localhost
    if (cleanQuestionData.Image) {
      const imageUrl = Array.isArray(cleanQuestionData.Image) && cleanQuestionData.Image[0]?.url;
      const isLocalhost = imageUrl && (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1'));
      
      if (isLocalhost) {
        console.warn('[API /questions/create] WARNING: Image URL is localhost - Airtable cannot access localhost URLs!');
        console.warn('[API /questions/create] Airtable requires publicly accessible URLs. The image will not be saved.');
      }
    }
    
    console.log('[API /questions/create] Creating question with data:', {
      hasImage: !!cleanQuestionData.Image,
      imageData: cleanQuestionData.Image,
      questionType: cleanQuestionData['Question type'],
      allFields: Object.keys(cleanQuestionData),
    });

    // Create question in Airtable, linked to quiz
    // Note: The field name in Airtable might be "Quiz" - verify this matches your schema
    const question = await createQuestion({
      ...cleanQuestionData,
      Quiz: quizId ? [quizId] : undefined, // Link to Quiz table using record ID
    });
    
    console.log('[API /questions/create] Question created successfully:', {
      questionId: question.id,
      hasImage: !!question.fields.Image,
      imageData: question.fields.Image,
    });

    return NextResponse.json({
      success: true,
      question: {
        id: question.id,
        fields: question.fields,
      },
    });
  } catch (error: any) {
    console.error('Question creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create question' },
      { status: 500 }
    );
  }
}

