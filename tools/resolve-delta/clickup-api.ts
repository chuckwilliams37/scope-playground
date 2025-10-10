import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';

/**
 * ClickUp API Client - Direct REST API calls
 * Used for features not available in MCP (like custom fields)
 */

interface CustomField {
  id: string;
  name: string;
  type: string;
  type_config?: any;
}

/**
 * Get custom fields for a list
 */
export async function getListCustomFields(listId: string): Promise<CustomField[]> {
  const response = await fetch(`${CLICKUP_API_BASE}/list/${listId}/field`, {
    headers: {
      'Authorization': CLICKUP_API_TOKEN || '',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get custom fields: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { fields?: CustomField[] };
  return data.fields || [];
}

/**
 * Find Sprint Points or Story Points custom field
 */
export async function findPointsField(listId: string): Promise<CustomField | null> {
  const fields = await getListCustomFields(listId);
  
  // Look for Sprint Points or Story Points field
  const pointsField = fields.find(f => 
    f.name.toLowerCase().includes('sprint points') ||
    f.name.toLowerCase().includes('story points') ||
    f.name.toLowerCase() === 'points'
  );
  
  return pointsField || null;
}

/**
 * Set a custom field value on a task
 */
export async function setCustomField(
  taskId: string,
  fieldId: string,
  value: any
): Promise<void> {
  const response = await fetch(`${CLICKUP_API_BASE}/task/${taskId}/field/${fieldId}`, {
    method: 'POST',
    headers: {
      'Authorization': CLICKUP_API_TOKEN || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to set custom field: ${response.status} ${response.statusText} - ${errorText}`);
  }
}

/**
 * Set Sprint Points on a task (built-in ClickUp field)
 */
export async function setSprintPoints(
  taskId: string,
  points: number
): Promise<boolean> {
  try {
    const response = await fetch(`${CLICKUP_API_BASE}/task/${taskId}`, {
      method: 'PUT',
      headers: {
        'Authorization': CLICKUP_API_TOKEN || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ points }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to set Sprint Points: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error(`  ❌ Failed to set Sprint Points:`, error);
    return false;
  }
}

/**
 * Alias for consistency with old code
 */
export async function setSprintPointsCached(
  taskId: string,
  listId: string, // Not needed but kept for compatibility
  points: number
): Promise<boolean> {
  return setSprintPoints(taskId, points);
}
