import { NextRequest, NextResponse } from 'next/server';
import { updateQuestion } from '@/lib/airtable';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

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

    const { questionId, token: _, quizId: __, ...questionData } = body;

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    // Remove any non-field properties (token, quizId are not Airtable fields)
    // quizId is only used for linking on create, not on update
    // Also remove Order if it doesn't exist in Airtable (will cause UNKNOWN_FIELD_NAME error)
    const cleanQuestionData = { ...questionData };
    delete cleanQuestionData.token;
    delete cleanQuestionData.quizId;
    delete cleanQuestionData.Order; // Remove Order field until it exists in Airtable
    // Remove the line above once you add the "Order" field to Airtable Questions table

    // Log the Image field format before sending
    if (cleanQuestionData.Image) {
      const imageUrl = Array.isArray(cleanQuestionData.Image) && cleanQuestionData.Image[0]?.url;
      const isLocalhost = imageUrl && (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1'));
      
      if (isLocalhost) {
        console.warn('[API /questions/update] WARNING: Image URL is localhost - Airtable cannot access localhost URLs!');
        console.warn('[API /questions/update] Airtable requires publicly accessible URLs. The image will not be saved.');
      }
      
      console.log('[API /questions/update] Image field format:', {
        isArray: Array.isArray(cleanQuestionData.Image),
        length: Array.isArray(cleanQuestionData.Image) ? cleanQuestionData.Image.length : 'N/A',
        firstItem: Array.isArray(cleanQuestionData.Image) ? cleanQuestionData.Image[0] : 'N/A',
        fullImageData: JSON.stringify(cleanQuestionData.Image),
        url: imageUrl,
        isLocalhost: isLocalhost,
      });
    }

    console.log('[API /questions/update] Updating question with data:', {
      questionId,
      hasImage: !!cleanQuestionData.Image,
      imageData: cleanQuestionData.Image,
      questionType: cleanQuestionData['Question type'],
      fields: Object.keys(cleanQuestionData),
    });

    try {
      // Update question in Airtable
      const question = await updateQuestion(questionId, cleanQuestionData);
      
      console.log('[API /questions/update] Question updated successfully:', {
        questionId: question.id,
        savedImage: question.fields?.Image,
        savedImageType: typeof question.fields?.Image,
        savedImageIsArray: Array.isArray(question.fields?.Image),
        allFields: Object.keys(question.fields || {}),
      });
      
      return NextResponse.json({
        success: true,
        question: {
          id: question.id,
          fields: question.fields,
        },
      });
    } catch (airtableError: any) {
      console.error('[API /questions/update] Airtable error details:', {
        error: airtableError.error,
        message: airtableError.message,
        statusCode: airtableError.statusCode,
        imageData: cleanQuestionData.Image,
      });
      throw airtableError;
    }

  } catch (error: any) {
    console.error('[API /questions/update] Question update error:', {
      error: error.error,
      message: error.message,
      statusCode: error.statusCode,
      fullError: error,
    });
    return NextResponse.json(
      { 
        error: error.message || 'Failed to update question',
        details: error.error || undefined,
        statusCode: error.statusCode || 500,
      },
      { status: error.statusCode || 500 }
    );
  }
}

