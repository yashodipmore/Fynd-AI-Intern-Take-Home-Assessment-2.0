import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface AIAnalysis {
  userResponse: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  recommendedActions: string[];
}

export async function analyzeReview(rating: number, review: string): Promise<AIAnalysis> {
  try {
    // Handle empty reviews
    if (!review || review.trim().length === 0) {
      return generateEmptyReviewResponse(rating);
    }

    // Truncate very long reviews (keep first 2000 chars)
    const truncatedReview = review.length > 2000 ? review.substring(0, 2000) + '...' : review;

    const prompt = `You are an AI assistant for a customer feedback system. Analyze this review and provide a JSON response.

Rating: ${rating}/5 stars
Review: "${truncatedReview}"

Respond with ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "userResponse": "A friendly, personalized thank you message to the user (2-3 sentences). Acknowledge their specific feedback.",
  "summary": "A brief 1-2 sentence summary of the review's main points.",
  "sentiment": "positive OR negative OR neutral",
  "recommendedActions": ["action1", "action2", "action3"]
}

Guidelines:
- userResponse: Be warm, professional, and specific to their feedback
- summary: Capture the essence of their review concisely
- sentiment: Based on both rating and review content
- recommendedActions: 2-4 actionable items for the business team`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content || '';
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        userResponse: parsed.userResponse || 'Thank you for your feedback!',
        summary: parsed.summary || 'Customer provided feedback.',
        sentiment: validateSentiment(parsed.sentiment),
        recommendedActions: Array.isArray(parsed.recommendedActions) 
          ? parsed.recommendedActions.slice(0, 4) 
          : ['Review feedback', 'Follow up with customer'],
      };
    }

    throw new Error('Invalid JSON response from AI');
  } catch (error) {
    console.error('AI Analysis Error:', error);
    return generateFallbackResponse(rating, review);
  }
}

function validateSentiment(sentiment: string): 'positive' | 'negative' | 'neutral' {
  const normalized = sentiment?.toLowerCase();
  if (normalized === 'positive' || normalized === 'negative' || normalized === 'neutral') {
    return normalized;
  }
  return 'neutral';
}

function generateEmptyReviewResponse(rating: number): AIAnalysis {
  const responses: Record<number, AIAnalysis> = {
    5: {
      userResponse: 'Thank you so much for the 5-star rating! We\'re thrilled you had a great experience. We\'d love to hear more details about what you enjoyed!',
      summary: 'Customer gave 5-star rating without written feedback.',
      sentiment: 'positive',
      recommendedActions: ['Send follow-up for detailed feedback', 'Add to satisfied customers list'],
    },
    4: {
      userResponse: 'Thank you for the 4-star rating! We appreciate your support. If there\'s anything we can improve, we\'d love to hear your thoughts!',
      summary: 'Customer gave 4-star rating without written feedback.',
      sentiment: 'positive',
      recommendedActions: ['Request detailed feedback', 'Identify improvement areas'],
    },
    3: {
      userResponse: 'Thank you for your feedback. We\'d really appreciate if you could share more details about your experience so we can improve!',
      summary: 'Customer gave 3-star rating without written feedback.',
      sentiment: 'neutral',
      recommendedActions: ['Reach out for detailed feedback', 'Investigate potential issues'],
    },
    2: {
      userResponse: 'We\'re sorry your experience wasn\'t great. We\'d really value your feedback on what went wrong so we can make it right.',
      summary: 'Customer gave 2-star rating without written feedback.',
      sentiment: 'negative',
      recommendedActions: ['Contact customer for feedback', 'Prioritize issue resolution', 'Offer compensation if applicable'],
    },
    1: {
      userResponse: 'We sincerely apologize for your disappointing experience. Please share more details so we can address your concerns immediately.',
      summary: 'Customer gave 1-star rating without written feedback.',
      sentiment: 'negative',
      recommendedActions: ['Urgent: Contact customer immediately', 'Escalate to management', 'Prepare service recovery plan'],
    },
  };

  return responses[rating] || responses[3];
}

function generateFallbackResponse(rating: number, review: string): AIAnalysis {
  const sentiment: 'positive' | 'negative' | 'neutral' = 
    rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';
  
  return {
    userResponse: `Thank you for taking the time to share your feedback with us. Your ${rating}-star rating and comments help us improve our services. We truly value your input!`,
    summary: review 
      ? `Customer rated ${rating}/5 and provided feedback about their experience.`
      : `Customer rated ${rating}/5 without additional comments.`,
    sentiment,
    recommendedActions: [
      'Review customer feedback',
      sentiment === 'negative' ? 'Follow up with customer' : 'Thank customer for positive feedback',
      'Log feedback for team review',
    ],
  };
}
