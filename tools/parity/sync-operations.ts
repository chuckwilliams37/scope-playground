import { Story, ClickUpTask, StoriesArraySchema, ConsolidatedStoriesSchema } from './schema';
import { ClickUpClient } from './clickup-client';
import { ResolvedFieldIds } from './config';
import { normalizeTitle } from './normalize';
import statusMap from './status-map.json';
import * as fs from 'fs';

/**
 * Sync operations: pull from ClickUp, push to ClickUp
 */

export class SyncOperations {
  private client: ClickUpClient;
  private fieldIds: ResolvedFieldIds;
  private listId: string;
  private spaceId: string | null = null;

  constructor(client: ClickUpClient, fieldIds: ResolvedFieldIds, listId: string) {
    this.client = client;
    this.fieldIds = fieldIds;
    this.listId = listId;
  }

  /**
   * Get space ID (lazy load)
   */
  private async getSpaceId(): Promise<string> {
    if (!this.spaceId) {
      this.spaceId = await this.client.getSpaceIdForList(this.listId);
    }
    return this.spaceId;
  }

  /**
   * Convert ClickUp task to Story
   */
  private taskToStory(task: ClickUpTask): Story | null {
    // Get External ID
    const externalIdField = task.custom_fields.find((f) => f.id === this.fieldIds.externalId);
    const id = externalIdField?.value;

    if (!id) {
      console.warn(`⚠️  Task "${task.name}" has no External ID, skipping`);
      return null;
    }

    // Get points
    const pointsField = task.custom_fields.find((f) => f.id === this.fieldIds.points);
    const points = pointsField?.value != null ? Number(pointsField.value) : 0;

    // Get business value
    const valueField = task.custom_fields.find((f) => f.id === this.fieldIds.businessValue);
    let businessValue: Story['businessValue'] = 'Nice to Have';

    if (valueField?.value) {
      if (typeof valueField.value === 'object' && valueField.value.name) {
        businessValue = valueField.value.name as Story['businessValue'];
      } else if (typeof valueField.value === 'string') {
        businessValue = valueField.value as Story['businessValue'];
      }
    }

    // Get status
    const clickupStatus = task.status.status;
    const mapping = statusMap as Record<string, string>;
    let status: Story['status'] = 'Backlog';

    for (const [key, value] of Object.entries(mapping)) {
      if (key.toLowerCase() === clickupStatus.toLowerCase()) {
        status = value as Story['status'];
        break;
      }
    }

    // Get acceptance criteria
    const checklist = task.checklists?.find(
      (cl) => cl.name.toLowerCase() === 'acceptance criteria'
    );
    const acceptanceCriteria = checklist?.items.map((item) => item.name) || [];

    // Get tags
    const tags = task.tags?.map((t) => t.name) || [];

    // Build story
    const story: Story = {
      id,
      title: normalizeTitle(task.name),
      userStory: task.name, // Use task name as user story for now
      points,
      businessValue,
      status,
      acceptanceCriteria,
      tags: tags.length > 0 ? tags : undefined,
    };

    return story;
  }

  /**
   * Pull stories from ClickUp and export to JSON
   */
  async pull(outputPath: string): Promise<Story[]> {
    console.log('Pulling stories from ClickUp...');

    const tasks = await this.client.getListTasks(this.listId);
    console.log(`✓ Fetched ${tasks.length} tasks from ClickUp`);

    const stories: Story[] = [];
    for (const task of tasks) {
      const story = this.taskToStory(task);
      if (story) {
        stories.push(story);
      }
    }

    console.log(`✓ Converted ${stories.length} tasks to stories`);

    // Write to file
    const output = {
      modelVersion: '1.0.0',
      lastUpdated: new Date().toISOString().split('T')[0],
      description: 'Stories pulled from ClickUp',
      stories,
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`✓ Wrote ${stories.length} stories to ${outputPath}`);

    return stories;
  }

  /**
   * Push stories to ClickUp (create missing, update mismatches)
   */
  async push(
    jsonStories: Story[],
    options: { forceDeleteOrphans?: boolean } = {}
  ): Promise<void> {
    console.log('Pushing stories to ClickUp...');

    // Get existing tasks
    const tasks = await this.client.getListTasks(this.listId);
    console.log(`✓ Fetched ${tasks.length} existing tasks from ClickUp`);

    // Build map of existing tasks by External ID
    const taskMap = new Map<string, ClickUpTask>();
    for (const task of tasks) {
      const externalIdField = task.custom_fields.find((f) => f.id === this.fieldIds.externalId);
      const externalId = externalIdField?.value;
      if (externalId) {
        taskMap.set(externalId, task);
      }
    }

    const spaceId = await this.getSpaceId();

    // Process each story
    for (const story of jsonStories) {
      const storyId = story.id || story.title; // Use title as fallback if no ID
      const existingTask = taskMap.get(storyId);

      if (existingTask) {
        // Update existing task
        await this.updateTask(existingTask, story, spaceId);
      } else {
        // Create new task
        await this.createTask(story, spaceId);
      }
    }

    // Handle orphans
    if (options.forceDeleteOrphans) {
      const jsonIds = new Set(jsonStories.map((s) => s.id || s.title));
      const orphans = Array.from(taskMap.entries()).filter(([id]) => !jsonIds.has(id));

      if (orphans.length > 0) {
        console.log(`\n⚠️  Found ${orphans.length} orphan tasks in ClickUp`);
        console.log('Delete functionality not implemented (requires explicit confirmation)');
        console.log('Orphan task IDs:', orphans.map(([id]) => id).join(', '));
      }
    }

    console.log('\n✅ Push complete!');
  }

  /**
   * Create a new task in ClickUp
   */
  private async createTask(story: Story, spaceId: string): Promise<void> {
    console.log(`\n📝 Creating task: ${story.title}`);

    // Reverse lookup status
    const mapping = statusMap as Record<string, string>;
    const clickupStatus = Object.keys(mapping).find((k) => mapping[k] === story.status) || 'Backlog';

    const task = await this.client.createTask(this.listId, {
      name: story.title,
      description: story.userStory,
      status: clickupStatus,
      tags: story.tags || [],
    });

    console.log(`  ✓ Created task ${task.id}`);

    // Set custom fields
    const storyId = story.id || story.title;
    await this.client.setCustomField(task.id, this.fieldIds.externalId, storyId);
    console.log(`  ✓ Set External ID: ${storyId}`);

    await this.client.setCustomField(task.id, this.fieldIds.points, story.points);
    console.log(`  ✓ Set Points: ${story.points}`);

    await this.client.setCustomField(task.id, this.fieldIds.businessValue, story.businessValue);
    console.log(`  ✓ Set Business Value: ${story.businessValue}`);

    // Set acceptance criteria
    if (story.acceptanceCriteria.length > 0) {
      await this.client.replaceAcceptanceChecklist(task.id, story.acceptanceCriteria);
      console.log(`  ✓ Set ${story.acceptanceCriteria.length} acceptance criteria`);
    }

    // Set tags
    if (story.tags && story.tags.length > 0) {
      await this.client.addTagsToTask(task.id, spaceId, story.tags);
      console.log(`  ✓ Set tags: ${story.tags.join(', ')}`);
    }
  }

  /**
   * Update an existing task in ClickUp
   */
  private async updateTask(task: ClickUpTask, story: Story, spaceId: string): Promise<void> {
    const changes: string[] = [];

    // Check title
    if (normalizeTitle(task.name) !== normalizeTitle(story.title)) {
      await this.client.updateTask(task.id, { name: story.title });
      changes.push(`title: "${task.name}" → "${story.title}"`);
    }

    // Check points
    const currentPoints = task.custom_fields.find((f) => f.id === this.fieldIds.points)?.value;
    if (Number(currentPoints) !== story.points) {
      await this.client.setCustomField(task.id, this.fieldIds.points, story.points);
      changes.push(`points: ${currentPoints} → ${story.points}`);
    }

    // Check business value
    const currentValueField = task.custom_fields.find((f) => f.id === this.fieldIds.businessValue);
    let currentValue = null;
    if (currentValueField?.value) {
      if (typeof currentValueField.value === 'object' && currentValueField.value.name) {
        currentValue = currentValueField.value.name;
      } else if (typeof currentValueField.value === 'string') {
        currentValue = currentValueField.value;
      }
    }

    if (currentValue !== story.businessValue) {
      await this.client.setCustomField(task.id, this.fieldIds.businessValue, story.businessValue);
      changes.push(`business value: ${currentValue} → ${story.businessValue}`);
    }

    // Check status
    const mapping = statusMap as Record<string, string>;
    const clickupStatus = Object.keys(mapping).find((k) => mapping[k] === story.status) || 'Backlog';
    
    if (task.status.status !== clickupStatus) {
      await this.client.updateTask(task.id, { status: clickupStatus });
      changes.push(`status: ${task.status.status} → ${clickupStatus}`);
    }

    // Check acceptance criteria
    const currentCriteria = task.checklists
      ?.find((cl) => cl.name.toLowerCase() === 'acceptance criteria')
      ?.items.map((item) => item.name) || [];

    const criteriaMatch =
      currentCriteria.length === story.acceptanceCriteria.length &&
      currentCriteria.every((c, i) => c === story.acceptanceCriteria[i]);

    if (!criteriaMatch) {
      await this.client.replaceAcceptanceChecklist(task.id, story.acceptanceCriteria);
      changes.push(
        `acceptance criteria: ${currentCriteria.length} → ${story.acceptanceCriteria.length} items`
      );
    }

    // Check tags
    const currentTags = task.tags?.map((t) => t.name) || [];
    const storyTags = story.tags || [];
    const tagsMatch =
      currentTags.length === storyTags.length &&
      currentTags.every((t) => storyTags.includes(t));

    if (!tagsMatch) {
      await this.client.addTagsToTask(task.id, spaceId, storyTags);
      changes.push(`tags: [${currentTags.join(', ')}] → [${storyTags.join(', ')}]`);
    }

    if (changes.length > 0) {
      console.log(`\n🔄 Updated task: ${story.title}`);
      changes.forEach((change) => console.log(`  ✓ ${change}`));
    }
  }
}

/**
 * Load stories from JSON file (supports both array and consolidated format)
 */
export function loadStoriesFromJson(filePath: string): Story[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  // Check if it's consolidated format (has 'stories' property)
  if (data.stories && Array.isArray(data.stories)) {
    // Consolidated format
    const consolidated = ConsolidatedStoriesSchema.parse(data);
    return consolidated.stories;
  } else if (Array.isArray(data)) {
    // Array format
    return StoriesArraySchema.parse(data);
  } else {
    throw new Error('Invalid JSON format. Expected either an array of stories or an object with a "stories" array property.');
  }
}
