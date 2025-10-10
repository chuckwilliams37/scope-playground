import { Story, StoryMatch, FieldChange, ReportDirective, POLICIES } from './types';
import { findDirective } from './parseReport';
import { areEqual, areArraysEqual } from './normalize';

/**
 * Merge a matched pair of stories according to policies and directives
 */
export function mergeStories(
  match: StoryMatch,
  directives: ReportDirective[]
): { merged: Story; changes: FieldChange[] } {
  const { jsonStory, clickupStory } = match;
  
  if (!jsonStory || !clickupStory) {
    throw new Error('Cannot merge: missing story in match');
  }

  const merged: Story = { ...jsonStory };
  const changes: FieldChange[] = [];

  // Merge each field according to policy
  
  // Title (prefer JSON, but check directive)
  const titleChange = mergeField(
    'title',
    jsonStory.title,
    clickupStory.title,
    jsonStory.title, // story identifier for directive lookup
    directives,
    'json'
  );
  if (titleChange) {
    merged.title = titleChange.after;
    changes.push(titleChange);
  }

  // User Story
  const userStoryChange = mergeField(
    'userStory',
    jsonStory.userStory,
    clickupStory.userStory,
    jsonStory.title,
    directives,
    'prefer_longer'
  );
  if (userStoryChange) {
    merged.userStory = userStoryChange.after;
    changes.push(userStoryChange);
  }

  // Points (special rule: if JSON==0 and ClickUp>0, use ClickUp)
  const jsonPoints = jsonStory.points || 0;
  const clickupPoints = clickupStory.points || 0;
  
  if (jsonPoints !== clickupPoints) {
    let finalPoints = jsonPoints;
    let source: 'json' | 'clickup' | 'review_longer' = 'json';
    
    const directive = findDirective(directives, jsonStory.title, 'points');
    
    if (directive?.action === 'USE_CLICKUP') {
      finalPoints = clickupPoints;
      source = 'clickup';
    } else if (directive?.action === 'USE_JSON') {
      finalPoints = jsonPoints;
      source = 'json';
    } else if (jsonPoints === 0 && clickupPoints > 0) {
      // Policy: prefer ClickUp if JSON is zero
      finalPoints = clickupPoints;
      source = 'clickup';
    }
    
    if (finalPoints !== jsonPoints) {
      merged.points = finalPoints;
      changes.push({
        field: 'points',
        before: jsonPoints,
        after: finalPoints,
        source,
        directive: directive?.action,
      });
    }
  }

  // Business Value
  const businessValueChange = mergeField(
    'businessValue',
    jsonStory.businessValue,
    clickupStory.businessValue,
    jsonStory.title,
    directives,
    'json'
  );
  if (businessValueChange) {
    merged.businessValue = businessValueChange.after as any;
    changes.push(businessValueChange);
  }

  // Status
  const statusChange = mergeField(
    'status',
    jsonStory.status,
    clickupStory.status,
    jsonStory.title,
    directives,
    'json'
  );
  if (statusChange) {
    merged.status = statusChange.after;
    changes.push(statusChange);
  }

  // Acceptance Criteria (prefer larger set on REVIEW)
  const jsonCriteria = jsonStory.acceptanceCriteria || [];
  const clickupCriteria = clickupStory.acceptanceCriteria || [];
  
  if (!areArraysEqual(jsonCriteria, clickupCriteria)) {
    let finalCriteria = jsonCriteria;
    let source: 'json' | 'clickup' | 'review_longer' = 'json';
    
    const directive = findDirective(directives, jsonStory.title, 'acceptance_criteria');
    
    if (directive?.action === 'USE_CLICKUP') {
      finalCriteria = clickupCriteria;
      source = 'clickup';
    } else if (directive?.action === 'USE_JSON') {
      finalCriteria = jsonCriteria;
      source = 'json';
    } else if (directive?.action === 'REVIEW') {
      // Prefer larger set
      finalCriteria = jsonCriteria.length >= clickupCriteria.length ? jsonCriteria : clickupCriteria;
      source = 'review_longer';
    }
    
    if (!areArraysEqual(finalCriteria, jsonCriteria)) {
      merged.acceptanceCriteria = finalCriteria;
      changes.push({
        field: 'acceptanceCriteria',
        before: jsonCriteria,
        after: finalCriteria,
        source,
        directive: directive?.action,
      });
    }
  }

  // Tags (union, lowercase, sorted)
  const jsonTags = jsonStory.tags || [];
  const clickupTags = clickupStory.tags || [];
  
  const allTags = Array.from(new Set([...jsonTags, ...clickupTags]));
  const normalizedTags = POLICIES.tags.lowercase
    ? allTags.map(t => t.toLowerCase())
    : allTags;
  const uniqueTags = Array.from(new Set(normalizedTags));
  const finalTags = POLICIES.tags.sorted ? uniqueTags.sort() : uniqueTags;
  
  if (!areArraysEqual(finalTags, jsonTags)) {
    merged.tags = finalTags;
    changes.push({
      field: 'tags',
      before: jsonTags,
      after: finalTags,
      source: 'review_longer', // union
    });
  }

  // Category (prefer JSON)
  if (jsonStory.category !== clickupStory.category) {
    const directive = findDirective(directives, jsonStory.title, 'category');
    if (directive?.action === 'USE_CLICKUP' && clickupStory.category) {
      merged.category = clickupStory.category;
      changes.push({
        field: 'category',
        before: jsonStory.category,
        after: clickupStory.category,
        source: 'clickup',
        directive: directive.action,
      });
    }
  }

  // Set metadata
  merged._meta = {
    source: 'merged',
    updatedAt: new Date().toISOString(),
  };

  return { merged, changes };
}

/**
 * Merge a single field according to directive or default policy
 */
function mergeField(
  fieldName: string,
  jsonValue: any,
  clickupValue: any,
  storyTitle: string,
  directives: ReportDirective[],
  defaultPolicy: 'json' | 'clickup' | 'prefer_longer'
): FieldChange | null {
  // Check if values are equal
  if (typeof jsonValue === 'string' && typeof clickupValue === 'string') {
    if (areEqual(jsonValue, clickupValue)) return null;
  } else if (jsonValue === clickupValue) {
    return null;
  }

  const directive = findDirective(directives, storyTitle, fieldName);
  
  let finalValue = jsonValue;
  let source: 'json' | 'clickup' | 'review_longer' = 'json';

  if (directive?.action === 'USE_CLICKUP') {
    finalValue = clickupValue;
    source = 'clickup';
  } else if (directive?.action === 'USE_JSON') {
    finalValue = jsonValue;
    source = 'json';
  } else if (directive?.action === 'REVIEW' || defaultPolicy === 'prefer_longer') {
    // Prefer longer text
    if (typeof jsonValue === 'string' && typeof clickupValue === 'string') {
      finalValue = jsonValue.length >= clickupValue.length ? jsonValue : clickupValue;
      source = 'review_longer';
    }
  } else if (defaultPolicy === 'clickup') {
    finalValue = clickupValue;
    source = 'clickup';
  }

  // Only return change if value actually changed
  if (finalValue === jsonValue) {
    return null;
  }

  return {
    field: fieldName,
    before: jsonValue,
    after: finalValue,
    source,
    directive: directive?.action,
  };
}
