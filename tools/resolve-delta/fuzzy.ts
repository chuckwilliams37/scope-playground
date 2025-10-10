import { Story, StoryMatch, POLICIES } from './types';
import { normalizeText } from './normalize';

/**
 * Calculate similarity score between two strings (0-1)
 * Uses word-based matching
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeText(str1).toLowerCase();
  const norm2 = normalizeText(str2).toLowerCase();

  if (norm1 === norm2) return 1.0;

  // Split into words (ignore short words)
  const words1 = norm1.split(' ').filter(w => w.length > 2);
  const words2 = norm2.split(' ').filter(w => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return 0;

  // Count matching words
  let matches = 0;
  for (const word1 of words1) {
    if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
      matches++;
    }
  }

  // Similarity ratio
  const totalWords = Math.max(words1.length, words2.length);
  return matches / totalWords;
}

/**
 * Match JSON stories with ClickUp stories using fuzzy logic
 * Two-pass: exact ID match, then fuzzy title/userStory
 */
export function matchStories(
  jsonStories: Story[],
  clickupStories: Story[]
): StoryMatch[] {
  const matches: StoryMatch[] = [];
  const unmatchedJson = new Set(jsonStories);
  const unmatchedClickup = new Set(clickupStories);

  // Pass 1: Exact ID match
  for (const jsonStory of jsonStories) {
    if (!jsonStory.id) continue;

    const clickupStory = clickupStories.find(
      cs => cs.id === jsonStory.id
    );

    if (clickupStory) {
      matches.push({
        jsonStory,
        clickupStory,
        matchType: 'exact_id',
        similarityScore: 1.0,
      });
      unmatchedJson.delete(jsonStory);
      unmatchedClickup.delete(clickupStory);
    }
  }

  // Pass 2: Fuzzy match on remaining
  for (const jsonStory of Array.from(unmatchedJson)) {
    let bestMatch: Story | undefined;
    let bestScore = 0;
    let bestType: 'fuzzy_title' | 'fuzzy_story' = 'fuzzy_title';
    const candidates: Array<{ story: Story; score: number }> = [];

    for (const clickupStory of Array.from(unmatchedClickup)) {
      // Title similarity
      const titleScore = calculateSimilarity(jsonStory.title, clickupStory.title);
      
      // UserStory similarity
      const storyScore = calculateSimilarity(
        jsonStory.userStory,
        clickupStory.userStory
      );

      // Combined score (weighted: title 60%, userStory 40%)
      const combinedScore = titleScore * 0.6 + storyScore * 0.4;

      if (titleScore >= POLICIES.fuzzyThresholds.title) {
        candidates.push({ story: clickupStory, score: combinedScore });
        
        if (combinedScore > bestScore) {
          bestScore = combinedScore;
          bestMatch = clickupStory;
          bestType = titleScore > storyScore ? 'fuzzy_title' : 'fuzzy_story';
        }
      }
    }

    if (bestMatch) {
      // Check for ambiguity (multiple candidates with similar scores)
      const ambiguous = candidates.filter(
        c => c.story !== bestMatch && Math.abs(c.score - bestScore) < 0.1
      ).length > 0;

      matches.push({
        jsonStory,
        clickupStory: bestMatch,
        matchType: bestType,
        similarityScore: bestScore,
        ambiguous,
      });
      unmatchedJson.delete(jsonStory);
      unmatchedClickup.delete(bestMatch);
    }
  }

  // Add unmatched JSON stories
  for (const jsonStory of Array.from(unmatchedJson)) {
    matches.push({
      jsonStory,
      matchType: 'unmatched',
    });
  }

  // Add unmatched ClickUp stories (orphans)
  for (const clickupStory of Array.from(unmatchedClickup)) {
    matches.push({
      clickupStory,
      matchType: 'unmatched',
    });
  }

  return matches;
}

/**
 * Find a story by title using fuzzy matching
 */
export function findStoryByTitle(
  title: string,
  stories: Story[],
  threshold = 0.6
): Story | undefined {
  let bestMatch: Story | undefined;
  let bestScore = 0;

  for (const story of stories) {
    const score = calculateSimilarity(title, story.title);
    if (score >= threshold && score > bestScore) {
      bestScore = score;
      bestMatch = story;
    }
  }

  return bestMatch;
}
