import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ClickUpCustomField } from './schema';

// Load .env.local file if it exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

/**
 * Configuration loader and custom field ID resolver
 * Loads environment variables and caches resolved field IDs to .clickup.fields.json
 */

export interface ParityConfig {
  clickupApiToken: string;
  clickupListId: string;
  customFieldIds: {
    points?: string;
    businessValue?: string;
    externalId?: string;
  };
}

export interface ResolvedFieldIds {
  points: string;
  businessValue: string;
  externalId: string;
}

const FIELD_CACHE_PATH = path.join(process.cwd(), '.clickup.fields.json');

/**
 * Load configuration from environment variables
 */
export function loadConfig(): ParityConfig {
  const config: ParityConfig = {
    clickupApiToken: process.env.CLICKUP_API_TOKEN || '',
    clickupListId: process.env.CLICKUP_LIST_ID || '',
    customFieldIds: {
      points: process.env.CLICKUP_CF_POINTS,
      businessValue: process.env.CLICKUP_CF_BUSINESS_VALUE,
      externalId: process.env.CLICKUP_CF_EXTERNAL_ID,
    },
  };

  if (!config.clickupApiToken) {
    throw new Error('CLICKUP_API_TOKEN environment variable is required');
  }

  if (!config.clickupListId) {
    throw new Error('CLICKUP_LIST_ID environment variable is required');
  }

  return config;
}

/**
 * Load cached field IDs from .clickup.fields.json
 */
export function loadCachedFieldIds(): ResolvedFieldIds | null {
  try {
    if (fs.existsSync(FIELD_CACHE_PATH)) {
      const data = fs.readFileSync(FIELD_CACHE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Failed to load cached field IDs:', error);
  }
  return null;
}

/**
 * Save field IDs to cache
 */
export function saveCachedFieldIds(fieldIds: ResolvedFieldIds): void {
  try {
    fs.writeFileSync(FIELD_CACHE_PATH, JSON.stringify(fieldIds, null, 2), 'utf-8');
    console.log(`✓ Cached field IDs to ${FIELD_CACHE_PATH}`);
  } catch (error) {
    console.warn('Failed to save field IDs to cache:', error);
  }
}

/**
 * Resolve custom field IDs from ClickUp API or cache
 */
export function resolveFieldIds(
  customFields: ClickUpCustomField[],
  configFieldIds: ParityConfig['customFieldIds']
): ResolvedFieldIds {
  // Try to use IDs from environment first
  if (configFieldIds.points && configFieldIds.businessValue && configFieldIds.externalId) {
    return {
      points: configFieldIds.points,
      businessValue: configFieldIds.businessValue,
      externalId: configFieldIds.externalId,
    };
  }

  // Try cached IDs
  const cached = loadCachedFieldIds();
  if (cached) {
    console.log('✓ Using cached field IDs');
    return cached;
  }

  // Discover from API
  console.log('Discovering custom field IDs from ClickUp...');
  const fieldMap = new Map(customFields.map((f) => [f.name.toLowerCase(), f.id]));

  const pointsId =
    configFieldIds.points ||
    fieldMap.get('points') ||
    fieldMap.get('story points') ||
    fieldMap.get('storypoints');

  const businessValueId =
    configFieldIds.businessValue ||
    fieldMap.get('business value') ||
    fieldMap.get('businessvalue') ||
    fieldMap.get('value');

  const externalIdId =
    configFieldIds.externalId ||
    fieldMap.get('external id') ||
    fieldMap.get('externalid') ||
    fieldMap.get('id');

  if (!pointsId || !businessValueId || !externalIdId) {
    const missing: string[] = [];
    if (!pointsId) missing.push('Points');
    if (!businessValueId) missing.push('Business Value');
    if (!externalIdId) missing.push('External ID');

    console.error('\n❌ Missing required custom fields in ClickUp:');
    console.error(`   ${missing.join(', ')}\n`);
    console.error('Available custom fields:');
    customFields.forEach((f) => console.error(`   - ${f.name} (${f.type})`));
    console.error('\nRemediation steps:');
    console.error('1. Go to your ClickUp list settings');
    console.error('2. Create the following custom fields:');
    if (!pointsId) console.error('   - "Points" (Number type)');
    if (!businessValueId)
      console.error('   - "Business Value" (Drop Down type with options: Critical, Important, Nice to Have)');
    if (!externalIdId) console.error('   - "External ID" (Text type)');
    console.error('3. Re-run this command\n');

    throw new Error(`Missing required custom fields: ${missing.join(', ')}`);
  }

  const resolved: ResolvedFieldIds = {
    points: pointsId,
    businessValue: businessValueId,
    externalId: externalIdId,
  };

  // Cache for future use
  saveCachedFieldIds(resolved);

  return resolved;
}

/**
 * Validate Business Value custom field has correct options
 */
export function validateBusinessValueOptions(customFields: ClickUpCustomField[], fieldId: string): void {
  const field = customFields.find((f) => f.id === fieldId);
  if (!field) {
    throw new Error(`Business Value field with ID ${fieldId} not found`);
  }

  const options = field.type_config?.options || [];
  const optionNames = options.map((o) => o.name);

  const requiredOptions = ['Critical', 'Important', 'Nice to Have'];
  const missingOptions = requiredOptions.filter((opt) => !optionNames.includes(opt));

  if (missingOptions.length > 0) {
    console.warn('\n⚠️  Business Value field is missing required options:');
    console.warn(`   ${missingOptions.join(', ')}\n`);
    console.warn('Current options:', optionNames.join(', '));
    console.warn('\nRemediation steps:');
    console.warn('1. Go to your ClickUp list settings');
    console.warn('2. Edit the "Business Value" custom field');
    console.warn('3. Add the missing options: ' + missingOptions.join(', '));
    console.warn('4. Re-run this command\n');

    throw new Error(`Business Value field missing options: ${missingOptions.join(', ')}`);
  }

  console.log('✓ Business Value field has all required options');
}
