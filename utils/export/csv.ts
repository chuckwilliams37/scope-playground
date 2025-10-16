/**
 * CSV Export Utilities with Client-Safe Mode Support
 */

interface Story {
  id?: string;
  _id: string;
  title: string;
  userStory: string;
  businessValue: string;
  category: string;
  points?: number;
  storyPoints?: number;
  notes?: string;
  adjustmentReason?: string;
  originalPoints?: number;
  acceptanceCriteria?: string[];
}

interface StoryPosition {
  value: string;
  effort: string;
  rank?: number;
}

interface ExportOptions {
  clientSafe?: boolean;
  includeMetrics?: boolean;
  includeSettings?: boolean;
}

/**
 * Export stories to CSV format
 */
export function exportStoriesToCSV(
  stories: Story[],
  storyPositions: Record<string, StoryPosition>,
  options: ExportOptions = { clientSafe: true }
): string {
  const { clientSafe = true } = options;
  
  // Define headers based on client-safe mode
  const headers = [
    'ID',
    'Title',
    'User Story',
    'Business Value',
    'Category',
    'Story Points',
    'In Matrix',
    'Matrix Position (Value)',
    'Matrix Position (Effort)',
    'Rank'
  ];
  
  // Add acceptance criteria column
  headers.push('Acceptance Criteria');
  
  // Build CSV rows
  const rows: string[][] = [headers];
  
  stories.forEach(story => {
    const storyId = story._id || story.id || '';
    const position = storyPositions[storyId];
    const points = story.points || story.storyPoints || 0;
    
    const row = [
      escapeCSV(storyId.substring(0, 8)),
      escapeCSV(story.title),
      escapeCSV(story.userStory),
      escapeCSV(story.businessValue),
      escapeCSV(story.category),
      points.toString(),
      position ? 'Yes' : 'No',
      position ? escapeCSV(position.value) : '',
      position ? escapeCSV(position.effort) : '',
      position?.rank ? position.rank.toString() : ''
    ];
    
    // Add acceptance criteria
    const criteria = story.acceptanceCriteria && story.acceptanceCriteria.length > 0
      ? story.acceptanceCriteria.join('; ')
      : '';
    row.push(escapeCSV(criteria));
    
    rows.push(row);
  });
  
  // Convert to CSV string
  return rows.map(row => row.join(',')).join('\n');
}

/**
 * Export metrics to CSV format
 */
export function exportMetricsToCSV(
  metrics: any,
  settings: any,
  options: ExportOptions = { clientSafe: true }
): string {
  const { clientSafe = true } = options;
  
  const rows: string[][] = [['Metric', 'Value']];
  
  // Core metrics (always included)
  rows.push(['Total Stories', metrics.totalStories?.toString() || '0']);
  rows.push(['Total Points', metrics.totalPoints?.toString() || '0']);
  rows.push(['Project Hours', (metrics as any).billableHours?.toFixed(1) || metrics.adjustedEffort?.toFixed(1) || '0']);
  if (!options.clientSafe && (metrics as any).productiveHours) {
    rows.push(['Productive Hours', `${(metrics as any).productiveHours.toFixed(1)} (${((metrics as any).efficiencyPercent * 100).toFixed(0)}% efficiency)`]);
  }
  rows.push(['Estimated Days', metrics.totalDays?.toFixed(1) || '0']);
  rows.push(['Estimated Cost', `$${metrics.totalCost?.toFixed(2) || '0'}`]);
  rows.push(['Team Size', settings.contributorCount?.toString() || '1']);
  
  // Sensitive metrics (only in non-client-safe mode)
  if (!clientSafe) {
    rows.push(['', '']); // Blank row
    rows.push(['Internal Settings', '']);
    rows.push(['Contributor Cost (Daily)', `$${settings.contributorCost?.toFixed(2) || '0'}`]);
    rows.push(['Hours Per Day', settings.hoursPerDay?.toString() || '8']);
    rows.push(['Contributor Allocation', `${settings.contributorAllocation || 100}%`]);
    rows.push(['Points to Hours Conversion', settings.pointsToHoursConversion?.toString() || '8']);
    
    if (settings.aiSimulationEnabled) {
      rows.push(['', '']); // Blank row
      rows.push(['AI Productivity Factors', '']);
      rows.push(['Lines of Code', `${settings.aiProductivityFactors?.linesOfCode || 0}%`]);
      rows.push(['Testing', `${settings.aiProductivityFactors?.testing || 0}%`]);
      rows.push(['Debugging', `${settings.aiProductivityFactors?.debugging || 0}%`]);
      rows.push(['System Design', `${settings.aiProductivityFactors?.systemDesign || 0}%`]);
      rows.push(['Documentation', `${settings.aiProductivityFactors?.documentation || 0}%`]);
    }
    
    if (metrics.effectiveContributorCount) {
      rows.push(['', '']); // Blank row
      rows.push(['Team Overhead', '']);
      rows.push(['Effective Team Size', metrics.effectiveContributorCount?.toFixed(2) || '0']);
      rows.push(['Productivity Loss', `${metrics.productivityLossPercent || 0}%`]);
      rows.push(['Communication Overhead', `${((metrics.communicationOverhead || 0) * 100).toFixed(1)}%`]);
      rows.push(['Management Overhead', `${((metrics.managementOverhead || 0) * 100).toFixed(1)}%`]);
    }
  }
  
  return rows.map(row => row.join(',')).join('\n');
}

/**
 * Escape CSV field value
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  
  // Convert to string if not already
  const str = String(value);
  
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
