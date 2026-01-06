'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Star,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Download,
  Calendar,
  BarChart3,
  Users,
  Zap,
  MessageSquareHeart,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { format } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Feedback {
  id: string;
  rating: number;
  review: string;
  userResponse: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  recommendedActions: string[];
  createdAt: string;
}

interface Analytics {
  totalFeedbacks: number;
  averageRating: number;
  ratingDistribution: { rating: number; count: number; percentage: number }[];
  sentimentDistribution: { sentiment: string; count: number; percentage: number }[];
  recentTrend: { date: string; count: number; avgRating: number }[];
  todayStats: { count: number; avgRating: number };
  weeklyComparison: { thisWeek: number; lastWeek: number; change: number };
}

const SENTIMENT_COLORS = {
  positive: '#22c55e',
  neutral: '#f59e0b',
  negative: '#ef4444',
};

const RATING_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

export default function AdminDashboard() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Live clock update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (searchQuery) params.append('search', searchQuery);
      if (ratingFilter !== 'all') params.append('rating', ratingFilter);
      if (sentimentFilter !== 'all') params.append('sentiment', sentimentFilter);

      const [feedbackRes, analyticsRes] = await Promise.all([
        fetch(`/api/admin/feedbacks?${params}`),
        fetch('/api/admin/analytics'),
      ]);

      if (!feedbackRes.ok || !analyticsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const feedbackData = await feedbackRes.json();
      const analyticsData = await analyticsRes.json();

      if (feedbackData.success) {
        setFeedbacks(feedbackData.data.feedbacks);
        setTotalPages(feedbackData.data.pagination.totalPages);
        setTotal(feedbackData.data.pagination.total);
      }

      if (analyticsData.success) {
        setAnalytics(analyticsData.data);
      }

      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, searchQuery, ratingFilter, sentimentFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const exportToCSV = () => {
    if (feedbacks.length === 0) return;

    const headers = ['Date', 'Rating', 'Review', 'Summary', 'Sentiment', 'Recommended Actions'];
    const rows = feedbacks.map((fb) => [
      format(new Date(fb.createdAt), 'yyyy-MM-dd HH:mm'),
      fb.rating.toString(),
      `"${fb.review.replace(/"/g, '""')}"`,
      `"${fb.summary.replace(/"/g, '""')}"`,
      fb.sentiment,
      `"${fb.recommendedActions.join('; ')}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedbacks-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <ThumbsUp className="w-4 h-4 text-green-500" />;
      case 'negative':
        return <ThumbsDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 bg-grid flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 bg-grid">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg sm:rounded-xl">
                  <MessageSquareHeart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="hidden sm:inline text-lg font-bold bg-gradient-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent">
                  FeedbackAI
                </span>
              </Link>
              <div className="hidden sm:block h-6 w-px bg-gray-300" />
              <div className="flex items-center gap-1 sm:gap-2">
                <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                <span className="text-sm sm:text-base font-semibold text-gray-800">Admin</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>{format(currentTime, 'HH:mm:ss')}</span>
              </div>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={cn(
                  'hidden sm:block px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  autoRefresh
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                {autoRefresh ? 'Auto ON' : 'Auto OFF'}
              </button>
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className={cn('w-4 h-4 sm:w-5 sm:h-5 text-gray-600', refreshing && 'animate-spin')} />
              </button>
              <Link
                href="/"
                className="px-2 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-purple-700 transition-colors"
              >
                <span className="hidden sm:inline">User Dashboard</span>
                <span className="sm:hidden">User</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700"
          >
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <button
              onClick={() => fetchData()}
              className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Stats Cards */}
        {analytics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="p-2 sm:p-3 bg-purple-100 rounded-lg sm:rounded-xl">
                  <Users className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <span className={cn(
                  'flex items-center gap-1 text-xs sm:text-sm font-medium',
                  analytics.weeklyComparison.change >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {analytics.weeklyComparison.change >= 0 ? (
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                  ) : (
                    <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                  {Math.abs(analytics.weeklyComparison.change)}%
                </span>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-gray-900">{analytics.totalFeedbacks}</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">Total Feedbacks</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg sm:rounded-xl">
                  <Star className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-gray-900">{analytics.averageRating}</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">Average Rating</div>
              <div className="flex gap-0.5 sm:gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'w-3 h-3 sm:w-4 sm:h-4',
                      star <= Math.round(analytics.averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    )}
                  />
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="p-2 sm:p-3 bg-green-100 rounded-lg sm:rounded-xl">
                  <Zap className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-gray-900">{analytics.todayStats.count}</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">Today&apos;s Feedbacks</div>
              <div className="hidden sm:block text-sm text-gray-400 mt-2">
                Avg: {analytics.todayStats.avgRating || '-'} ⭐
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg sm:rounded-xl">
                  <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-gray-900">
                {analytics.sentimentDistribution.find((s) => s.sentiment === 'positive')?.percentage || 0}%
              </div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">Positive Sentiment</div>
              <div className="hidden sm:flex gap-2 mt-2">
                {analytics.sentimentDistribution.map((s) => (
                  <div
                    key={s.sentiment}
                    className="flex items-center gap-1 text-xs"
                    style={{ color: SENTIMENT_COLORS[s.sentiment as keyof typeof SENTIMENT_COLORS] }}
                  >
                    {getSentimentIcon(s.sentiment)}
                    {s.percentage}%
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Charts Row */}
        {analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Trend Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100"
            >
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">7-Day Feedback Trend</h3>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.recentTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                      stroke="#9ca3af"
                      fontSize={10}
                    />
                    <YAxis stroke="#9ca3af" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                      labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#8b5cf6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Rating Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Rating Distribution</h3>
              <div className="h-40 sm:h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.ratingDistribution} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="rating"
                      type="category"
                      tickFormatter={(rating) => `${rating}★`}
                      width={40}
                      stroke="#9ca3af"
                      fontSize={10}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                      formatter={(value, name, props) => {
                        const payload = props?.payload as { percentage?: number } | undefined;
                        return [
                          `${value} (${payload?.percentage ?? 0}%)`,
                          'Count',
                        ];
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {analytics.ratingDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={RATING_COLORS[entry.rating - 1]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        )}

        {/* Sentiment Pie Chart & Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Sentiment Pie */}
          {analytics && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100"
            >
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Sentiment Analysis</h3>
              <div className="h-40 sm:h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.sentimentDistribution}
                      dataKey="count"
                      nameKey="sentiment"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {analytics.sentimentDistribution.map((entry) => (
                        <Cell
                          key={entry.sentiment}
                          fill={SENTIMENT_COLORS[entry.sentiment as keyof typeof SENTIMENT_COLORS]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {analytics.sentimentDistribution.map((s) => (
                  <div key={s.sentiment} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: SENTIMENT_COLORS[s.sentiment as keyof typeof SENTIMENT_COLORS] }}
                    />
                    <span className="capitalize text-gray-600">{s.sentiment}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Filters & Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-800">All Feedbacks</h3>
              <div className="flex flex-wrap items-center gap-3">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search reviews..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
                  />
                </form>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors',
                    showFilters
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  <ChevronDown className={cn('w-4 h-4 transition-transform', showFilters && 'rotate-180')} />
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Filter Options */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-4 pb-4 border-b border-gray-100 mb-4"
                >
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Rating</label>
                    <select
                      value={ratingFilter}
                      onChange={(e) => {
                        setRatingFilter(e.target.value);
                        setPage(1);
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All Ratings</option>
                      {[5, 4, 3, 2, 1].map((r) => (
                        <option key={r} value={r}>
                          {r} Star{r > 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Sentiment</label>
                    <select
                      value={sentimentFilter}
                      onChange={(e) => {
                        setSentimentFilter(e.target.value);
                        setPage(1);
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All Sentiments</option>
                      <option value="positive">Positive</option>
                      <option value="neutral">Neutral</option>
                      <option value="negative">Negative</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setRatingFilter('all');
                        setSentimentFilter('all');
                        setSearchQuery('');
                        setPage(1);
                      }}
                      className="px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Count */}
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>
                Showing {feedbacks.length} of {total} feedbacks
              </span>
              <span>Page {page} of {totalPages || 1}</span>
            </div>

            {/* Feedbacks List */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {feedbacks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No feedbacks found</p>
                </div>
              ) : (
                feedbacks.map((feedback, index) => (
                  <motion.div
                    key={feedback.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 border border-gray-100 rounded-xl hover:border-purple-200 hover:bg-purple-50/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                'w-4 h-4',
                                star <= feedback.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              )}
                            />
                          ))}
                        </div>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                            feedback.sentiment === 'positive' && 'bg-green-100 text-green-700',
                            feedback.sentiment === 'neutral' && 'bg-yellow-100 text-yellow-700',
                            feedback.sentiment === 'negative' && 'bg-red-100 text-red-700'
                          )}
                        >
                          {feedback.sentiment}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(feedback.createdAt), 'MMM d, yyyy HH:mm')}
                      </div>
                    </div>

                    {feedback.review && (
                      <p className="text-gray-700 mb-3 line-clamp-2">{feedback.review}</p>
                    )}

                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 text-xs text-purple-600 font-medium mb-1">
                        <Sparkles className="w-3 h-3" />
                        AI Summary
                      </div>
                      <p className="text-sm text-gray-600">{feedback.summary}</p>
                    </div>

                    {feedback.recommendedActions.length > 0 && (
                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-2">Recommended Actions:</div>
                        <div className="flex flex-wrap gap-2">
                          {feedback.recommendedActions.map((action, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs"
                            >
                              {action}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={cn(
                          'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                          page === pageNum
                            ? 'bg-purple-600 text-white'
                            : 'hover:bg-gray-100 text-gray-600'
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
