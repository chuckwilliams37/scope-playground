import * as fs from 'fs';
import { ParsedReport, ReportDirective } from './types';

/**
 * Parse the simple-parity-report.md to extract directives
 */
export function parseReport(reportPath: string): ParsedReport {
  const content = fs.readFileSync(reportPath, 'utf-8');
  const lines = content.split('\n');

  const missingInClickUp: string[] = [];
  const orphansInClickUp: string[] = [];
  const fieldDirectives: ReportDirective[] = [];

  let currentSection: 'missing' | 'orphans' | 'differences' | null = null;
  let currentStoryTitle: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect sections
    if (line.startsWith('## Missing in ClickUp')) {
      currentSection = 'missing';
      continue;
    }
    
    if (line.startsWith('## Orphans in ClickUp')) {
      currentSection = 'orphans';
      continue;
    }
    
    if (line.startsWith('## Field Differences')) {
      currentSection = 'differences';
      continue;
    }

    // Parse based on current section
    if (currentSection === 'missing') {
      // Lines like: - **ENHANCEMENT: Admin View of Employee Profiles**
      const match = line.match(/^-\s+\*\*(.+?)\*\*/);
      if (match) {
        missingInClickUp.push(match[1]);
      }
    } else if (currentSection === 'orphans') {
      // Lines like: - **COMMENTS - NOTES (FOR EQUIPMENT, MAINTENANCE REQUESTS, ETC)**
      const match = line.match(/^-\s+\*\*(.+?)\*\*/);
      if (match) {
        orphansInClickUp.push(match[1]);
      }
    } else if (currentSection === 'differences') {
      // Story title: ### Employee Equipment Assignment
      if (line.startsWith('###')) {
        currentStoryTitle = line.replace(/^###\s+/, '').trim();
        continue;
      }

      // Field directives like:
      // 🔵 **description** - Description differs...
      // - **Recommendation:** USE CLICKUP
      if (currentStoryTitle) {
        // Match field line
        const fieldMatch = line.match(/^[🔵📝⚠️]\s+\*\*(.+?)\*\*\s+-\s+(.+)/);
        if (fieldMatch) {
          const field = fieldMatch[1];
          const description = fieldMatch[2];
          
          // Look ahead for recommendation
          let action: 'USE_JSON' | 'USE_CLICKUP' | 'REVIEW' = 'REVIEW';
          let jsonValue: any;
          let clickupValue: any;

          for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
            const nextLine = lines[j].trim();
            
            // Extract values
            if (nextLine.startsWith('- JSON:')) {
              jsonValue = nextLine.replace(/^-\s+JSON:\s+/, '').replace(/^"(.+)"$/, '$1');
            }
            if (nextLine.startsWith('- ClickUp:')) {
              clickupValue = nextLine.replace(/^-\s+ClickUp:\s+/, '').replace(/^"(.+)"$/, '$1');
            }
            
            // Extract recommendation
            if (nextLine.includes('**Recommendation:**')) {
              if (nextLine.includes('USE JSON') || nextLine.includes('USE_JSON')) {
                action = 'USE_JSON';
              } else if (nextLine.includes('USE CLICKUP') || nextLine.includes('USE_CLICKUP')) {
                action = 'USE_CLICKUP';
              } else if (nextLine.includes('REVIEW')) {
                action = 'REVIEW';
              }
              break;
            }
            
            // Stop if we hit another field or story
            if (nextLine.startsWith('###') || nextLine.match(/^[🔵📝⚠️]\s+\*\*/)) {
              break;
            }
          }

          fieldDirectives.push({
            storyTitle: currentStoryTitle,
            field,
            action,
            jsonValue,
            clickupValue,
          });
        }
      }
    }
  }

  return {
    missingInClickUp,
    orphansInClickUp,
    fieldDirectives,
  };
}

/**
 * Find directives for a specific story and field
 */
export function findDirective(
  directives: ReportDirective[],
  storyTitle: string,
  field: string
): ReportDirective | undefined {
  return directives.find(
    d => d.storyTitle === storyTitle && d.field === field
  );
}
