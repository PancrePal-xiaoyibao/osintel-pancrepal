import type { CenterRating } from './types';

export interface RatingsAggregate {
  avg: number;
  count: number;
  distribution: number[];  // index 0 = 1-star count, ..., index 4 = 5-star count
}

/**
 * Generate a unique rating ID.
 */
export function generateRatingId(): string {
  return `rate-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Submit or update a rating (one per user per entity).
 * If user already rated this entity, update; otherwise create.
 */
export function submitRating(
  ratings: CenterRating[],
  input: { entityType: string; entityId: string; userId: string; score: number; comment?: string; aspects?: Partial<{ expertise: number; communication: number; efficiency: number; facilities: number }> },
): { rating: CenterRating; isNew: boolean } {
  // Validate score
  if (input.score < 1 || input.score > 5 || !Number.isInteger(input.score)) {
    throw new Error('Score must be an integer between 1 and 5');
  }

  const existingIdx = ratings.findIndex(
    r => r.entityType === input.entityType && r.entityId === input.entityId && r.userId === input.userId
  );

  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    // Update existing
    ratings[existingIdx] = {
      ...ratings[existingIdx],
      score: input.score,
      comment: input.comment,
      aspects: input.aspects as CenterRating['aspects'],
      createdAt: now,
    };
    return { rating: ratings[existingIdx], isNew: false };
  }

  // Create new
  const rating: CenterRating = {
    id: generateRatingId(),
    entityType: input.entityType as CenterRating['entityType'],
    entityId: input.entityId,
    userId: input.userId,
    score: input.score,
    comment: input.comment,
    aspects: input.aspects as CenterRating['aspects'],
    createdAt: now,
  };

  ratings.push(rating);
  return { rating, isNew: true };
}

/**
 * Get all ratings for an entity, sorted by most recent first.
 */
export function getRatings(
  ratings: CenterRating[],
  entityType: string,
  entityId: string,
): CenterRating[] {
  return ratings
    .filter(r => r.entityType === entityType && r.entityId === entityId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Get aggregate rating statistics for an entity.
 */
export function getAggregate(
  ratings: CenterRating[],
  entityType: string,
  entityId: string,
): RatingsAggregate {
  const entityRatings = ratings.filter(
    r => r.entityType === entityType && r.entityId === entityId
  );

  if (entityRatings.length === 0) {
    return { avg: 0, count: 0, distribution: [0, 0, 0, 0, 0] };
  }

  const sum = entityRatings.reduce((s, r) => s + r.score, 0);
  const distribution = [0, 0, 0, 0, 0];
  entityRatings.forEach(r => {
    if (r.score >= 1 && r.score <= 5) distribution[r.score - 1]++;
  });

  return {
    avg: Math.round((sum / entityRatings.length) * 10) / 10,
    count: entityRatings.length,
    distribution,
  };
}

/**
 * Get a specific user's rating for an entity, or null.
 */
export function getUserRating(
  ratings: CenterRating[],
  entityType: string,
  entityId: string,
  userId: string,
): CenterRating | null {
  return ratings.find(
    r => r.entityType === entityType && r.entityId === entityId && r.userId === userId
  ) ?? null;
}
