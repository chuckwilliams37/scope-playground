import { Story, ClickUpTask, ParityDiff, ParityReport, DiffType } from './schema';
import { titlesMatch, stringArraysMatch, getArrayDiff } from './normalize';
import { ResolvedFieldIds } from './config';
import statusMap from './status-map.json';

/**
 * Parity checker - compares JSON stories with ClickUp tasks
 * Generates detailed diff reports
 */

export class ParityChecker {
  private fieldIds: ResolvedFieldIds;

  constructor(fieldIds: ResolvedFieldIds) {
    this.fieldIds = fieldIds;
  }

  /**
   * Extract External ID from ClickUp task
   */
  private getExternalId(task: ClickUpTask): string | null {
    const field = task.custom_fields.find((f) => f.id === this.fieldIds.externalId);
    return field?.value || null;
  }

  /**
   * Extract points from ClickUp task
   */
  private getPoints(task: ClickUpTask): number | null {
    const field = task.custom_fields.find((f) => f.id === this.fieldIds.points);
    return field?.value != null ? Number(field.value) : null;
  }

  /**
   * Extract business value from ClickUp task
   */
  private getBusinessValue(task: ClickUpTask): string | null {
    const field = task.custom_fields.find((f) => f.id === this.fieldIds.businessValue);
    
    // Handle both direct value and type_config structure
    if (field?.value) {
      // If value is an object with name property (single-select)
      if (typeof field.value === 'object' && field.value.name) {
        return field.value.name;
      }
      // If value is a string
      if (typeof field.value === 'string') {
        return field.value;
      }
      // If value is a number (option ID), look up in type_config
      if (typeof field.value === 'number' && field.type_config?.options) {
        const option = field.type_config.options.find((o: any) => o.orderindex === field.value);
        return option?.name || null;
      }
    }
    
    return null;
  }

  /**
   * Extract status from ClickUp task
   */
  private getStatus(task: ClickUpTask): string {
    return task.status.status;
  }

  /**
   * Extract acceptance criteria from ClickUp task
   */
  private getAcceptanceCriteria(task: ClickUpTask): string[] {
    const checklist = task.checklists?.find(
      (cl) => cl.name.toLowerCase() === 'acceptance criteria'
    );
    return checklist?.items.map((item) => item.name) || [];
  }

  /**
   * Extract tags from ClickUp task
   */
  private getTags(task: ClickUpTask): string[] {
    return task.tags?.map((t) => t.name) || [];
  }

  /**
   * Map ClickUp status to canonical status
   */
  private mapStatus(clickupStatus: string): string | null {
    const mapping = statusMap as Record<string, string>;
    
    // Try exact match first
    if (mapping[clickupStatus]) {
      return mapping[clickupStatus];
    }
    
    // Try case-insensitive match
    const lowerStatus = clickupStatus.toLowerCase();
    for (const [key, value] of Object.entries(mapping)) {
      if (key.toLowerCase() === lowerStatus) {
        return value;
      }
    }
    
    return null;
  }

  /**
   * Check parity between JSON stories and ClickUp tasks
   */
  checkParity(jsonStories: Story[], clickupTasks: ClickUpTask[]): ParityReport {
    const diffs: ParityDiff[] = [];

    // Build maps for efficient lookup
    const jsonMap = new Map(jsonStories.map((s) => [s.id, s]));
    const clickupMap = new Map<string, ClickUpTask>();

    // Map ClickUp tasks by External ID
    for (const task of clickupTasks) {
      const externalId = this.getExternalId(task);
      if (externalId) {
        clickupMap.set(externalId, task);
      }
    }

    // Check for missing in ClickUp
    for (const story of jsonStories) {
      if (!clickupMap.has(story.id)) {
        diffs.push({
          storyId: story.id,
          type: 'missing_in_clickup',
          jsonValue: story.title,
          details: `Story "${story.title}" exists in JSON but not in ClickUp`,
        });
        continue;
      }

      // Story exists in both - check fields
      const task = clickupMap.get(story.id)!;
      this.compareStoryAndTask(story, task, diffs);
    }

    // Check for orphans in ClickUp
    for (const [externalId, task] of clickupMap) {
      if (!jsonMap.has(externalId)) {
        diffs.push({
          storyId: externalId,
          type: 'orphan_in_clickup',
          clickupValue: task.name,
          details: `Task "${task.name}" exists in ClickUp but not in JSON`,
        });
      }
    }

    // Generate summary
    const summary = {
      totalInJson: jsonStories.length,
      totalInClickUp: clickupMap.size,
      missingInClickUp: diffs.filter((d) => d.type === 'missing_in_clickup').length,
      orphansInClickUp: diffs.filter((d) => d.type === 'orphan_in_clickup').length,
      fieldMismatches: diffs.filter(
        (d) => d.type !== 'missing_in_clickup' && d.type !== 'orphan_in_clickup'
      ).length,
      totalDiffs: diffs.length,
    };

    return {
      timestamp: new Date().toISOString(),
      summary,
      diffs,
    };
  }

  /**
   * Compare a JSON story with a ClickUp task and record diffs
   */
  private compareStoryAndTask(story: Story, task: ClickUpTask, diffs: ParityDiff[]): void {
    const storyId = story.id;

    // Compare title
    if (!titlesMatch(story.title, task.name)) {
      diffs.push({
        storyId,
        type: 'title_mismatch',
        jsonValue: story.title,
        clickupValue: task.name,
        details: `Title mismatch`,
      });
    }

    // Compare points
    const clickupPoints = this.getPoints(task);
    if (clickupPoints !== story.points) {
      diffs.push({
        storyId,
        type: 'points_mismatch',
        jsonValue: story.points,
        clickupValue: clickupPoints,
        details: `Points mismatch: JSON=${story.points}, ClickUp=${clickupPoints}`,
      });
    }

    // Compare business value
    const clickupValue = this.getBusinessValue(task);
    if (clickupValue !== story.businessValue) {
      diffs.push({
        storyId,
        type: 'business_value_mismatch',
        jsonValue: story.businessValue,
        clickupValue: clickupValue,
        details: `Business value mismatch: JSON=${story.businessValue}, ClickUp=${clickupValue}`,
      });
    }

    // Compare status
    const clickupStatus = this.getStatus(task);
    const mappedStatus = this.mapStatus(clickupStatus);
    
    if (!mappedStatus) {
      diffs.push({
        storyId,
        type: 'status_mismatch',
        jsonValue: story.status,
        clickupValue: clickupStatus,
        details: `Unmapped ClickUp status: "${clickupStatus}"`,
      });
    } else if (mappedStatus !== story.status) {
      diffs.push({
        storyId,
        type: 'status_mismatch',
        jsonValue: story.status,
        clickupValue: mappedStatus,
        details: `Status mismatch: JSON=${story.status}, ClickUp=${mappedStatus}`,
      });
    }

    // Compare acceptance criteria
    const clickupCriteria = this.getAcceptanceCriteria(task);
    if (!stringArraysMatch(story.acceptanceCriteria, clickupCriteria)) {
      const diff = getArrayDiff(story.acceptanceCriteria, clickupCriteria);
      diffs.push({
        storyId,
        type: 'acceptance_criteria_mismatch',
        jsonValue: story.acceptanceCriteria,
        clickupValue: clickupCriteria,
        details: `Acceptance criteria mismatch: ${diff.inAOnly.length} in JSON only, ${diff.inBOnly.length} in ClickUp only`,
      });
    }

    // Compare tags
    const storyTags = story.tags || [];
    const clickupTags = this.getTags(task);
    if (!stringArraysMatch(storyTags, clickupTags)) {
      const diff = getArrayDiff(storyTags, clickupTags);
      diffs.push({
        storyId,
        type: 'tags_mismatch',
        jsonValue: storyTags,
        clickupValue: clickupTags,
        details: `Tags mismatch: ${diff.inAOnly.length} in JSON only, ${diff.inBOnly.length} in ClickUp only`,
      });
    }
  }
}
