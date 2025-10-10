import { ParityChecker } from '../parity-checker';
import { Story, ClickUpTask } from '../schema';
import { ResolvedFieldIds } from '../config';

describe('ParityChecker', () => {
  const mockFieldIds: ResolvedFieldIds = {
    points: 'field-points',
    businessValue: 'field-value',
    externalId: 'field-id',
  };

  const createMockTask = (overrides: Partial<ClickUpTask> = {}): ClickUpTask => ({
    id: 'task-1',
    name: 'Test Task',
    status: { status: 'Backlog', type: 'open' },
    custom_fields: [
      { id: 'field-id', name: 'External ID', type: 'text', value: 'story-001' },
      { id: 'field-points', name: 'Points', type: 'number', value: 5 },
      { id: 'field-value', name: 'Business Value', type: 'drop_down', value: { name: 'Critical' } },
    ],
    tags: [],
    checklists: [],
    ...overrides,
  });

  const createMockStory = (overrides: Partial<Story> = {}): Story => ({
    id: 'story-001',
    title: 'Test Task',
    userStory: 'As a user, I want to test',
    points: 5,
    businessValue: 'Critical',
    status: 'Backlog',
    acceptanceCriteria: [],
    ...overrides,
  });

  describe('checkParity', () => {
    it('should report perfect parity when stories match', () => {
      const checker = new ParityChecker(mockFieldIds);
      const stories = [createMockStory()];
      const tasks = [createMockTask()];

      const report = checker.checkParity(stories, tasks);

      expect(report.summary.totalDiffs).toBe(0);
      expect(report.summary.totalInJson).toBe(1);
      expect(report.summary.totalInClickUp).toBe(1);
    });

    it('should detect missing in ClickUp', () => {
      const checker = new ParityChecker(mockFieldIds);
      const stories = [createMockStory(), createMockStory({ id: 'story-002', title: 'Missing Story' })];
      const tasks = [createMockTask()];

      const report = checker.checkParity(stories, tasks);

      expect(report.summary.missingInClickUp).toBe(1);
      expect(report.diffs).toContainEqual(
        expect.objectContaining({
          storyId: 'story-002',
          type: 'missing_in_clickup',
        })
      );
    });

    it('should detect orphans in ClickUp', () => {
      const checker = new ParityChecker(mockFieldIds);
      const stories = [createMockStory()];
      const tasks = [
        createMockTask(),
        createMockTask({
          id: 'task-2',
          name: 'Orphan Task',
          custom_fields: [
            { id: 'field-id', name: 'External ID', type: 'text', value: 'story-orphan' },
            { id: 'field-points', name: 'Points', type: 'number', value: 3 },
            { id: 'field-value', name: 'Business Value', type: 'drop_down', value: { name: 'Important' } },
          ],
        }),
      ];

      const report = checker.checkParity(stories, tasks);

      expect(report.summary.orphansInClickUp).toBe(1);
      expect(report.diffs).toContainEqual(
        expect.objectContaining({
          storyId: 'story-orphan',
          type: 'orphan_in_clickup',
        })
      );
    });

    it('should detect title mismatch', () => {
      const checker = new ParityChecker(mockFieldIds);
      const stories = [createMockStory({ title: 'Story Title' })];
      const tasks = [createMockTask({ name: 'Different Title' })];

      const report = checker.checkParity(stories, tasks);

      expect(report.summary.fieldMismatches).toBe(1);
      expect(report.diffs).toContainEqual(
        expect.objectContaining({
          type: 'title_mismatch',
          jsonValue: 'Story Title',
          clickupValue: 'Different Title',
        })
      );
    });

    it('should detect points mismatch', () => {
      const checker = new ParityChecker(mockFieldIds);
      const stories = [createMockStory({ points: 8 })];
      const tasks = [
        createMockTask({
          custom_fields: [
            { id: 'field-id', name: 'External ID', type: 'text', value: 'story-001' },
            { id: 'field-points', name: 'Points', type: 'number', value: 5 },
            { id: 'field-value', name: 'Business Value', type: 'drop_down', value: { name: 'Critical' } },
          ],
        }),
      ];

      const report = checker.checkParity(stories, tasks);

      expect(report.summary.fieldMismatches).toBe(1);
      expect(report.diffs).toContainEqual(
        expect.objectContaining({
          type: 'points_mismatch',
          jsonValue: 8,
          clickupValue: 5,
        })
      );
    });

    it('should detect business value mismatch', () => {
      const checker = new ParityChecker(mockFieldIds);
      const stories = [createMockStory({ businessValue: 'Important' })];
      const tasks = [
        createMockTask({
          custom_fields: [
            { id: 'field-id', name: 'External ID', type: 'text', value: 'story-001' },
            { id: 'field-points', name: 'Points', type: 'number', value: 5 },
            { id: 'field-value', name: 'Business Value', type: 'drop_down', value: { name: 'Critical' } },
          ],
        }),
      ];

      const report = checker.checkParity(stories, tasks);

      expect(report.summary.fieldMismatches).toBe(1);
      expect(report.diffs).toContainEqual(
        expect.objectContaining({
          type: 'business_value_mismatch',
          jsonValue: 'Important',
          clickupValue: 'Critical',
        })
      );
    });

    it('should detect acceptance criteria mismatch', () => {
      const checker = new ParityChecker(mockFieldIds);
      const stories = [createMockStory({ acceptanceCriteria: ['Criterion 1', 'Criterion 2'] })];
      const tasks = [
        createMockTask({
          checklists: [
            {
              id: 'checklist-1',
              name: 'Acceptance Criteria',
              items: [{ id: 'item-1', name: 'Criterion 1', resolved: false }],
            },
          ],
        }),
      ];

      const report = checker.checkParity(stories, tasks);

      expect(report.summary.fieldMismatches).toBe(1);
      expect(report.diffs).toContainEqual(
        expect.objectContaining({
          type: 'acceptance_criteria_mismatch',
        })
      );
    });

    it('should detect tags mismatch', () => {
      const checker = new ParityChecker(mockFieldIds);
      const stories = [createMockStory({ tags: ['tag1', 'tag2'] })];
      const tasks = [createMockTask({ tags: [{ name: 'tag1' }] })];

      const report = checker.checkParity(stories, tasks);

      expect(report.summary.fieldMismatches).toBe(1);
      expect(report.diffs).toContainEqual(
        expect.objectContaining({
          type: 'tags_mismatch',
        })
      );
    });
  });
});
