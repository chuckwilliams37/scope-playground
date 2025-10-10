import { ClickUpTask, ClickUpCustomField } from './schema';

/**
 * Thin wrapper around ClickUp API using native fetch
 * Provides methods for task and custom field management
 */

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';

export class ClickUpClient {
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${CLICKUP_API_BASE}${endpoint}`;
    const headers = {
      Authorization: this.apiToken.startsWith('pk_') ? this.apiToken : `pk_${this.apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ClickUp API error (${response.status}): ${errorText || response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get all tasks in a list
   */
  async getListTasks(listId: string, includeSubtasks = true): Promise<ClickUpTask[]> {
    const params = new URLSearchParams({
      include_subtasks: includeSubtasks.toString(),
      subtasks: 'true',
      include_closed: 'true',
    });

    const response = await this.request<{ tasks: ClickUpTask[] }>(
      `/list/${listId}/task?${params}`
    );
    return response.tasks;
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string): Promise<ClickUpTask> {
    return this.request<ClickUpTask>(`/task/${taskId}`);
  }

  /**
   * Get custom fields for a list
   */
  async getCustomFields(listId: string): Promise<ClickUpCustomField[]> {
    const response = await this.request<{ fields: ClickUpCustomField[] }>(
      `/list/${listId}/field`
    );
    return response.fields;
  }

  /**
   * Create a new task
   */
  async createTask(
    listId: string,
    data: {
      name: string;
      description?: string;
      status?: string;
      tags?: string[];
      custom_fields?: Array<{ id: string; value: any }>;
    }
  ): Promise<ClickUpTask> {
    return this.request<ClickUpTask>(`/list/${listId}/task`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update an existing task
   */
  async updateTask(
    taskId: string,
    data: {
      name?: string;
      description?: string;
      status?: string;
      tags?: string[];
    }
  ): Promise<ClickUpTask> {
    return this.request<ClickUpTask>(`/task/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Set a custom field value on a task
   */
  async setCustomField(taskId: string, fieldId: string, value: any): Promise<void> {
    await this.request(`/task/${taskId}/field/${fieldId}`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    });
  }

  /**
   * Get all tags in a space
   */
  async getTags(spaceId: string): Promise<Array<{ name: string }>> {
    const response = await this.request<{ tags: Array<{ name: string }> }>(
      `/space/${spaceId}/tag`
    );
    return response.tags;
  }

  /**
   * Create a new tag in a space
   */
  async createTag(spaceId: string, tagName: string): Promise<void> {
    await this.request(`/space/${spaceId}/tag`, {
      method: 'POST',
      body: JSON.stringify({ tag: { name: tagName } }),
    });
  }

  /**
   * Get checklists for a task
   */
  async getTaskChecklists(taskId: string): Promise<ClickUpTask['checklists']> {
    const task = await this.getTask(taskId);
    return task.checklists || [];
  }

  /**
   * Create a checklist on a task
   */
  async createChecklist(taskId: string, name: string): Promise<{ id: string }> {
    return this.request<{ id: string }>(`/task/${taskId}/checklist`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  /**
   * Delete a checklist
   */
  async deleteChecklist(checklistId: string): Promise<void> {
    await this.request(`/checklist/${checklistId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Create a checklist item
   */
  async createChecklistItem(checklistId: string, name: string): Promise<void> {
    await this.request(`/checklist/${checklistId}/checklist_item`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  /**
   * Replace the "Acceptance Criteria" checklist with new items
   * Deletes existing "Acceptance Criteria" checklist if it exists, then creates a new one
   */
  async replaceAcceptanceChecklist(taskId: string, criteria: string[]): Promise<void> {
    // Get existing checklists
    const checklists = await this.getTaskChecklists(taskId);

    // Find and delete existing "Acceptance Criteria" checklist
    const existingChecklist = checklists?.find(
      (cl) => cl.name.toLowerCase() === 'acceptance criteria'
    );

    if (existingChecklist) {
      await this.deleteChecklist(existingChecklist.id);
    }

    // Create new checklist if there are criteria
    if (criteria.length > 0) {
      const checklist = await this.createChecklist(taskId, 'Acceptance Criteria');

      // Add all items
      for (const criterion of criteria) {
        await this.createChecklistItem(checklist.id, criterion);
      }
    }
  }

  /**
   * Get the space ID for a list (needed for tag operations)
   */
  async getSpaceIdForList(listId: string): Promise<string> {
    const response = await this.request<{ space: { id: string } }>(`/list/${listId}`);
    return response.space.id;
  }

  /**
   * Add tags to a task (creates tags if they don't exist)
   */
  async addTagsToTask(taskId: string, spaceId: string, tagNames: string[]): Promise<void> {
    // Get existing tags in the space
    const existingTags = await this.getTags(spaceId);
    const existingTagNames = new Set(existingTags.map((t) => t.name.toLowerCase()));

    // Create missing tags
    for (const tagName of tagNames) {
      if (!existingTagNames.has(tagName.toLowerCase())) {
        try {
          await this.createTag(spaceId, tagName);
          console.log(`  ✓ Created tag: ${tagName}`);
        } catch (error) {
          console.warn(`  ⚠️  Failed to create tag "${tagName}":`, error);
        }
      }
    }

    // Update task with all tags
    await this.updateTask(taskId, { tags: tagNames });
  }
}
