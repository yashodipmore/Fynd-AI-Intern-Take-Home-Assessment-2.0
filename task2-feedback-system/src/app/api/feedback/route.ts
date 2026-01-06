import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Feedback from '@/models/Feedback';
import { analyzeReview } from '@/lib/groq';

// JSON Schema for request validation
interface SubmitFeedbackRequest {
  rating: number;
  review: string;
}

interface SubmitFeedbackResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    userResponse: string;
    rating: number;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<SubmitFeedbackResponse>> {
  try {
    // Parse request body
    const body: SubmitFeedbackRequest = await request.json();
    const { rating, review } = body;

    // Validate rating
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          error: 'Rating must be a number between 1 and 5',
        },
        { status: 400 }
      );
    }

    // Validate review (allow empty but check type and length)
    const sanitizedReview = typeof review === 'string' ? review.trim() : '';
    if (sanitizedReview.length > 5000) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          error: 'Review cannot exceed 5000 characters',
        },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Analyze review with AI
    const aiAnalysis = await analyzeReview(rating, sanitizedReview);

    // Create feedback document
    const feedback = await Feedback.create({
      rating,
      review: sanitizedReview,
      userResponse: aiAnalysis.userResponse,
      summary: aiAnalysis.summary,
      sentiment: aiAnalysis.sentiment,
      recommendedActions: aiAnalysis.recommendedActions,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Feedback submitted successfully',
        data: {
          id: feedback._id.toString(),
          userResponse: feedback.userResponse,
          rating: feedback.rating,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Submit Feedback Error:', error);
    
    // Handle specific errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request',
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Failed to process feedback. Please try again later.',
      },
      { status: 500 }
    );
  }
}
