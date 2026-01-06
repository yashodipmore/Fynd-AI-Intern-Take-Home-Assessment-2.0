import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Feedback, { IFeedback } from '@/models/Feedback';

interface FeedbackItem {
  id: string;
  rating: number;
  review: string;
  userResponse: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  recommendedActions: string[];
  createdAt: string;
}

interface GetFeedbackResponse {
  success: boolean;
  data?: {
    feedbacks: FeedbackItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<GetFeedbackResponse>> {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    
    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    // Filters
    const rating = searchParams.get('rating');
    const sentiment = searchParams.get('sentiment');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    if (rating) {
      const ratingNum = parseInt(rating);
      if (ratingNum >= 1 && ratingNum <= 5) {
        query.rating = ratingNum;
      }
    }

    if (sentiment && ['positive', 'negative', 'neutral'].includes(sentiment)) {
      query.sentiment = sentiment;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    if (search) {
      query.$or = [
        { review: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
      ];
    }

    // Execute query
    const [feedbacks, total] = await Promise.all([
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Feedback.countDocuments(query),
    ]);

    const formattedFeedbacks: FeedbackItem[] = feedbacks.map((fb: IFeedback) => ({
      id: fb._id.toString(),
      rating: fb.rating,
      review: fb.review,
      userResponse: fb.userResponse,
      summary: fb.summary,
      sentiment: fb.sentiment,
      recommendedActions: fb.recommendedActions,
      createdAt: fb.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        feedbacks: formattedFeedbacks,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get Feedback Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch feedbacks',
      },
      { status: 500 }
    );
  }
}
