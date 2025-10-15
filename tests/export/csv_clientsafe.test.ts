/**
 * Tests for Client-Safe CSV Export
 */

import { exportStoriesToCSV, exportMetricsToCSV } from '../../utils/export/csv';

describe('CSV Export - Client-Safe Mode', () => {
  const mockStories = [
    {
      _id: 'story-001',
      title: 'Test Story 1',
      userStory: 'As a user, I want to test',
      businessValue: 'Critical',
      category: 'Testing',
      points: 5,
      acceptanceCriteria: ['Criterion 1', 'Criterion 2']
    },
    {
      _id: 'story-002',
      title: 'Test Story 2',
      userStory: 'As a user, I want another test',
      businessValue: 'Important',
      category: 'Testing',
      points: 3,
      acceptanceCriteria: []
    }
  ];

  const mockPositions = {
    'story-001': { value: 'Critical', effort: 'Medium', rank: 1 }
  };

  describe('exportStoriesToCSV', () => {
    it('should export stories with basic columns', () => {
      const csv = exportStoriesToCSV(mockStories, mockPositions, { clientSafe: true });
      
      expect(csv).toContain('ID,Title,User Story,Business Value,Category,Story Points');
      expect(csv).toContain('Test Story 1');
      expect(csv).toContain('Test Story 2');
    });

    it('should include matrix position for positioned stories', () => {
      const csv = exportStoriesToCSV(mockStories, mockPositions, { clientSafe: true });
      
      expect(csv).toContain('Yes'); // story-001 is in matrix
      expect(csv).toContain('Critical'); // value position
      expect(csv).toContain('Medium'); // effort position
    });

    it('should handle stories not in matrix', () => {
      const csv = exportStoriesToCSV(mockStories, mockPositions, { clientSafe: true });
      
      // Check that the CSV contains the story
      expect(csv).toContain('Test Story 2');
      
      const lines = csv.split('\n');
      const story2Line = lines.find(line => line.includes('Test Story 2'));
      
      expect(story2Line).toBeDefined();
      expect(story2Line).toContain('No'); // not in matrix
    });

    it('should escape CSV special characters', () => {
      const storiesWithSpecialChars = [{
        _id: 'story-003',
        title: 'Story with, comma',
        userStory: 'Story with "quotes"',
        businessValue: 'Critical',
        category: 'Testing',
        points: 2,
        acceptanceCriteria: []
      }];

      const csv = exportStoriesToCSV(storiesWithSpecialChars, {}, { clientSafe: true });
      
      expect(csv).toContain('"Story with, comma"');
      expect(csv).toContain('""quotes""');
    });

    it('should not contain forbidden tokens in client-safe mode', () => {
      const csv = exportStoriesToCSV(mockStories, mockPositions, { clientSafe: true });
      
      expect(csv.toLowerCase()).not.toContain('hourly rate');
      expect(csv.toLowerCase()).not.toContain('contributor cost');
      expect(csv.toLowerCase()).not.toContain('overhead');
    });
  });

  describe('exportMetricsToCSV', () => {
    const mockMetrics = {
      totalStories: 10,
      totalPoints: 50,
      adjustedEffort: 400,
      totalDays: 20,
      totalCost: 50000,
      aiProductivityGain: 50,
      effectiveContributorCount: 2.5,
      productivityLossPercent: 15,
      communicationOverhead: 0.1,
      managementOverhead: 0.05
    };

    const mockSettings = {
      contributorCost: 1000,
      contributorCount: 3,
      hoursPerDay: 8,
      contributorAllocation: 80,
      pointsToHoursConversion: 8,
      aiSimulationEnabled: true,
      aiProductivityFactors: {
        linesOfCode: 30,
        testing: 25,
        debugging: 20,
        systemDesign: 15,
        documentation: 35
      }
    };

    it('should include core metrics in client-safe mode', () => {
      const csv = exportMetricsToCSV(mockMetrics, mockSettings, { clientSafe: true });
      
      expect(csv).toContain('Total Stories,10');
      expect(csv).toContain('Total Points,50');
      expect(csv).toContain('Estimated Days,20');
      expect(csv).toContain('Estimated Cost,$50000');
      expect(csv).toContain('Team Size,3');
    });

    it('should NOT include sensitive metrics in client-safe mode', () => {
      const csv = exportMetricsToCSV(mockMetrics, mockSettings, { clientSafe: true });
      
      expect(csv).not.toContain('Contributor Cost');
      expect(csv).not.toContain('Hours Per Day');
      expect(csv).not.toContain('Contributor Allocation');
      expect(csv).not.toContain('AI Productivity');
      expect(csv).not.toContain('Communication Overhead');
      expect(csv).not.toContain('Management Overhead');
    });

    it('should include all metrics when client-safe is disabled', () => {
      const csv = exportMetricsToCSV(mockMetrics, mockSettings, { clientSafe: false });
      
      expect(csv).toContain('Contributor Cost');
      expect(csv).toContain('Hours Per Day');
      expect(csv).toContain('AI Productivity Factors');
      expect(csv).toContain('Lines of Code,30%');
      expect(csv).toContain('Communication Overhead');
    });

    it('should not contain forbidden tokens in client-safe mode', () => {
      const csv = exportMetricsToCSV(mockMetrics, mockSettings, { clientSafe: true });
      
      expect(csv.toLowerCase()).not.toContain('hourly');
      expect(csv.toLowerCase()).not.toContain('rate');
      expect(csv.toLowerCase()).not.toContain('overhead');
      expect(csv.toLowerCase()).not.toContain('allocation');
      expect(csv.toLowerCase()).not.toContain('ai productivity');
    });

    it('should format currency values correctly', () => {
      const csv = exportMetricsToCSV(mockMetrics, mockSettings, { clientSafe: true });
      
      expect(csv).toContain('$50000.00');
    });
  });
});
