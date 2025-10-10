import { Story } from './types';
import { normalizeBusinessValue } from './normalize';

/**
 * ClickUp MCP Client Wrapper
 * Provides typed interface to ClickUp MCP server tools
 */

/**
 * Fetch tasks from a ClickUp list
 */
export async function fetchClickUpList(listId: string): Promise<Story[]> {
  // Use MCP searchTasks to get all tasks in the list
  const result = await (global as any).mcp0_searchTasks({
    list_ids: [listId],
  });

  if (!result || !result.tasks) {
    return [];
  }

  // Convert ClickUp tasks to Story format
  const stories: Story[] = [];
  
  for (const task of result.tasks) {
    try {
      // Extract custom fields
      const customFields = task.custom_fields || [];
      const externalIdField = customFields.find((f: any) => 
        f.name.toLowerCase().includes('external') && f.name.toLowerCase().includes('id')
      );
      const businessValueField = customFields.find((f: any) =>
        f.name.toLowerCase().includes('business') && f.name.toLowerCase().includes('value')
      );

      // Get acceptance criteria from checklists
      const acceptanceCriteria: string[] = [];
      const checklists = task.checklists || [];
      for (const checklist of checklists) {
        if (checklist.name.toLowerCase().includes('acceptance') || 
            checklist.name.toLowerCase().includes('criteria')) {
          for (const item of checklist.items || []) {
            if (item.name) {
              acceptanceCriteria.push(item.name.trim());
            }
          }
        }
      }

      // Build story
      const story: Story = {
        id: externalIdField?.value || task.id,
        title: task.name,
        userStory: task.description || task.name,
        category: task.list?.name,
        points: task.points || 0,
        businessValue: normalizeBusinessValue(businessValueField?.value || 'Important'),
        status: task.status?.status || 'captured',
        acceptanceCriteria,
        tags: task.tags?.map((t: any) => t.name) || [],
        _meta: {
          source: 'clickup',
          updatedAt: task.date_updated || new Date().toISOString(),
        },
      };

      stories.push(story);
    } catch (error) {
      console.warn(`⚠️  Failed to parse task ${task.id}:`, error);
    }
  }

  return stories;
}

/**
 * Build a rich description for ClickUp task
 * Includes user story, business value, category, points, and AC reference
 */
function buildTaskDescription(story: Story): string {
  const descriptionParts: string[] = [];
  
  // User story (main narrative)
  if (story.userStory) {
    descriptionParts.push(`## User Story\n${story.userStory}`);
  }
  
  // Story metadata
  const metadata: string[] = [];
  if (story.businessValue) {
    metadata.push(`**Business Value:** ${story.businessValue}`);
  }
  if (story.category) {
    metadata.push(`**Category:** ${story.category}`);
  }
  if (story.points && story.points > 0) {
    metadata.push(`**Story Points:** ${story.points}`);
  }
  
  if (metadata.length > 0) {
    descriptionParts.push(`\n## Story Details\n${metadata.join(' | ')}`);
  }
  
  // Note about acceptance criteria
  if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
    descriptionParts.push(`\n## Acceptance Criteria\nSee ${story.acceptanceCriteria.length} subtask(s) below for detailed acceptance criteria.`);
  }
  
  return descriptionParts.join('\n');
}

/**
 * Create a new task in ClickUp
 */
export async function createClickUpTask(
  listId: string,
  story: Story,
  batchId: string
): Promise<{ taskId: string; url: string }> {
  const description = buildTaskDescription(story);

  // Create main task with Sprint Points
  const taskData: any = {
    list_id: listId,
    name: story.title,
    description: description,
    status: story.status,
    priority: story.businessValue === 'Critical' ? 'urgent' : 
              story.businessValue === 'Important' ? 'high' : 'normal',
    tags: [...(story.tags || []), `sync-batch-${batchId}`],
  };

  // Add Sprint Points if available (ClickUp's built-in points field)
  if (story.points && story.points > 0) {
    taskData.points = story.points;
  }

  const result = await (global as any).mcp0_createTask(taskData);

  // Set Sprint Points via ClickUp API (custom field)
  if (story.points && story.points > 0) {
    const { setSprintPointsCached } = await import('./clickup-api');
    const success = await setSprintPointsCached(result.id, listId, story.points);
    if (success) {
      console.log(`  ⭐ Sprint Points set: ${story.points}`);
    }
  }

  // Add acceptance criteria as subtasks
  if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
    console.log(`  📋 Creating ${story.acceptanceCriteria.length} acceptance criteria as subtasks...`);
    
    for (const criterion of story.acceptanceCriteria) {
      try {
        await (global as any).mcp0_createTask({
          list_id: listId,
          name: criterion,
          parent_task_id: result.id,
          status: 'captured', // Default status for AC subtasks
          tags: [`sync-batch-${batchId}`, 'acceptance-criteria'],
        });
      } catch (error) {
        console.warn(`    ⚠️  Failed to create AC subtask: ${criterion.substring(0, 50)}...`);
      }
    }
    
    console.log(`    ✓ Created ${story.acceptanceCriteria.length} AC subtasks`);
  }

  return {
    taskId: result.id,
    url: result.url,
  };
}

/**
 * Update an existing task in ClickUp
 */
export async function updateClickUpTask(
  taskId: string,
  changes: Array<{ field: string; after: any; before?: any }>,
  batchId: string,
  listId?: string
): Promise<void> {
  const updateData: any = {};
  let acceptanceCriteriaChange: { after: any; before?: any } | undefined;

  for (const change of changes) {
    switch (change.field) {
      case 'title':
        updateData.name = change.after;
        break;
      case 'userStory':
        updateData.append_description = change.after;
        break;
      case 'status':
        updateData.status = change.after;
        break;
      case 'points':
        // Sprint Points will be set via API after main update
        // (stored separately to handle via clickup-api)
        break;
      case 'tags':
        updateData.tags = [...change.after, `sync-batch-${batchId}`];
        break;
      case 'acceptanceCriteria':
        acceptanceCriteriaChange = change;
        break;
    }
  }

  // Update main task fields
  if (Object.keys(updateData).length > 0) {
    await (global as any).mcp0_updateTask({
      task_id: taskId,
      ...updateData,
    });
  }

  // Handle Sprint Points update via API
  const pointsChange = changes.find(c => c.field === 'points');
  if (pointsChange && listId) {
    const { setSprintPointsCached } = await import('./clickup-api');
    const success = await setSprintPointsCached(taskId, listId, pointsChange.after);
    if (success) {
      console.log(`  ⭐ Sprint Points updated: ${pointsChange.before} → ${pointsChange.after}`);
    }
  }

  // Handle acceptance criteria updates (create as subtasks)
  if (acceptanceCriteriaChange && listId) {
    const newCriteria = acceptanceCriteriaChange.after || [];
    const oldCriteria = acceptanceCriteriaChange.before || [];

    // Find criteria to add (in new but not in old)
    const criteriaToAdd = newCriteria.filter((c: string) => !oldCriteria.includes(c));

    if (criteriaToAdd.length > 0) {
      console.log(`  📋 Adding ${criteriaToAdd.length} new acceptance criteria as subtasks...`);
      
      for (const criterion of criteriaToAdd) {
        try {
          await (global as any).mcp0_createTask({
            list_id: listId,
            name: criterion,
            parent_task_id: taskId,
            status: 'captured',
            tags: [`sync-batch-${batchId}`, 'acceptance-criteria'],
          });
        } catch (error) {
          console.warn(`    ⚠️  Failed to create AC subtask: ${criterion.substring(0, 50)}...`);
        }
      }
      
      console.log(`    ✓ Added ${criteriaToAdd.length} AC subtasks`);
    }
  }
}

/**
 * Add a comment to a task
 */
export async function addTaskComment(
  taskId: string,
  comment: string
): Promise<void> {
  await (global as any).mcp0_addComment({
    task_id: taskId,
    comment,
  });
}

/**
 * Get task details by ID
 */
export async function getTaskById(taskId: string): Promise<any> {
  return await (global as any).mcp0_getTaskById({
    id: taskId,
  });
}

/**
 * Tag a task as orphan (prefix title)
 */
export async function tagAsOrphan(
  taskId: string,
  currentTitle: string,
  batchId: string
): Promise<void> {
  const orphanPrefix = '(ORPHAN) ';
  
  // Check if already prefixed
  if (currentTitle.startsWith(orphanPrefix)) {
    return;
  }

  await (global as any).mcp0_updateTask({
    task_id: taskId,
    name: `${orphanPrefix}${currentTitle}`,
    tags: [`sync-batch-${batchId}`],
  });

  await addTaskComment(
    taskId,
    `⚠️ Marked as orphan by MCP reconciliation (batch ${batchId}). This task exists in ClickUp but not in the source JSON.`
  );
}

/**
 * Remove orphan prefix from task
 */
export async function removeOrphanTag(
  taskId: string,
  currentTitle: string,
  batchId: string
): Promise<void> {
  const orphanPrefix = '(ORPHAN) ';
  
  if (!currentTitle.startsWith(orphanPrefix)) {
    return;
  }

  const newTitle = currentTitle.substring(orphanPrefix.length);

  await (global as any).mcp0_updateTask({
    task_id: taskId,
    name: newTitle,
  });

  await addTaskComment(
    taskId,
    `♻️ Orphan tag removed on revert of batch ${batchId}.`
  );
}

/**
 * Generate change summary for a task comment
 */
export function generateChangeSummary(
  changes: Array<{ field: string; before: any; after: any }>,
  batchId: string
): string {
  const lines = [`✅ Synced by MCP reconciliation (batch ${batchId})\n`];
  
  for (const change of changes) {
    const beforeStr = JSON.stringify(change.before);
    const afterStr = JSON.stringify(change.after);
    lines.push(`• **${change.field}**: ${beforeStr} → ${afterStr}`);
  }

  return lines.join('\n');
}
