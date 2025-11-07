import { NextRequest, NextResponse } from 'next/server';
import { deleteQuestion } from '@/lib/airtable';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
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

    const { questionId } = body;

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    // Delete question from Airtable
    await deleteQuestion(questionId);
    
    console.log('[API /questions/delete] Question deleted successfully:', questionId);

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error: any) {
    console.error('[API /questions/delete] Question deletion error:', {
      error: error.error,
      message: error.message,
      statusCode: error.statusCode,
      fullError: error,
    });
    return NextResponse.json(
      { 
        error: error.message || 'Failed to delete question',
        details: error.error || undefined,
        statusCode: error.statusCode || 500,
      },
      { status: error.statusCode || 500 }
    );
  }
}

