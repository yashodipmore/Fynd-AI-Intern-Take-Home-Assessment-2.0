import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFeedback extends Document {
  rating: number;
  review: string;
  userResponse: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  recommendedActions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema: Schema = new Schema(
  {
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    review: {
      type: String,
      default: '',
      maxlength: [5000, 'Review cannot exceed 5000 characters'],
    },
    userResponse: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      required: true,
    },
    recommendedActions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ rating: 1 });
FeedbackSchema.index({ sentiment: 1 });

const Feedback: Model<IFeedback> = 
  mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);

export default Feedback;
