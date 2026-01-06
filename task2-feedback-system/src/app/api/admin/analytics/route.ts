import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Feedback from '@/models/Feedback';

interface AnalyticsResponse {
  success: boolean;
  data?: {
    totalFeedbacks: number;
    averageRating: number;
    ratingDistribution: { rating: number; count: number; percentage: number }[];
    sentimentDistribution: { sentiment: string; count: number; percentage: number }[];
    recentTrend: { date: string; count: number; avgRating: number }[];
    todayStats: {
      count: number;
      avgRating: number;
    };
    weeklyComparison: {
      thisWeek: number;
      lastWeek: number;
      change: number;
    };
  };
  error?: string;
}

export async function GET(): Promise<NextResponse<AnalyticsResponse>> {
  try {
    await dbConnect();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    // Total feedbacks and average rating
    const totalStats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgRating: { $avg: '$rating' },
        },
      },
    ]);

    const totalFeedbacks = totalStats[0]?.total || 0;
    const averageRating = Math.round((totalStats[0]?.avgRating || 0) * 10) / 10;

    // Rating distribution
    const ratingDist = await Feedback.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => {
      const found = ratingDist.find((r) => r._id === rating);
      const count = found?.count || 0;
      return {
        rating,
        count,
        percentage: totalFeedbacks > 0 ? Math.round((count / totalFeedbacks) * 100) : 0,
      };
    });

    // Sentiment distribution
    const sentimentDist = await Feedback.aggregate([
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 },
        },
      },
    ]);

    const sentimentDistribution = ['positive', 'neutral', 'negative'].map((sentiment) => {
      const found = sentimentDist.find((s) => s._id === sentiment);
      const count = found?.count || 0;
      return {
        sentiment,
        count,
        percentage: totalFeedbacks > 0 ? Math.round((count / totalFeedbacks) * 100) : 0,
      };
    });

    // Recent trend (last 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const trendData = await Feedback.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing dates
    const recentTrend: { date: string; count: number; avgRating: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const found = trendData.find((t) => t._id === dateStr);
      recentTrend.push({
        date: dateStr,
        count: found?.count || 0,
        avgRating: found ? Math.round(found.avgRating * 10) / 10 : 0,
      });
    }

    // Today's stats
    const todayData = await Feedback.aggregate([
      {
        $match: {
          createdAt: { $gte: today },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' },
        },
      },
    ]);

    const todayStats = {
      count: todayData[0]?.count || 0,
      avgRating: todayData[0] ? Math.round(todayData[0].avgRating * 10) / 10 : 0,
    };

    // Weekly comparison
    const [thisWeekData, lastWeekData] = await Promise.all([
      Feedback.countDocuments({ createdAt: { $gte: thisWeekStart } }),
      Feedback.countDocuments({
        createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd },
      }),
    ]);

    const weeklyChange = lastWeekData > 0 
      ? Math.round(((thisWeekData - lastWeekData) / lastWeekData) * 100)
      : thisWeekData > 0 ? 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalFeedbacks,
        averageRating,
        ratingDistribution,
        sentimentDistribution,
        recentTrend,
        todayStats,
        weeklyComparison: {
          thisWeek: thisWeekData,
          lastWeek: lastWeekData,
          change: weeklyChange,
        },
      },
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics',
      },
      { status: 500 }
    );
  }
}
