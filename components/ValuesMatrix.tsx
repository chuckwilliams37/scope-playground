import { useDroppable } from '@dnd-kit/core';
import { StoryCard } from './StoryCard';
import { useState } from 'react';

type Story = {
  _id?: string;
  id?: string;
  title: string;
  businessValue?: string;
  storyPoints?: number;
  points?: number;
  notes?: string;
  userStory?: string;
  category?: string;
};

type ValueMatrixProps = {
  getStoriesInCell: (value: string, effort: string) => Story[];
  totalPoints?: number;
  totalEffort?: number;
};

export function ValuesMatrix({ getStoriesInCell, totalPoints = 0, totalEffort = 0 }: ValueMatrixProps) {
  // Track which stories are expanded
  const [expandedStoryIds, setExpandedStoryIds] = useState<Set<string>>(new Set());

  // Toggle story expansion
  const toggleStoryExpansion = (storyId: string) => {
    setExpandedStoryIds(prevState => {
      const newState = new Set(prevState);
      if (newState.has(storyId)) {
        newState.delete(storyId);
      } else {
        newState.add(storyId);
      }
      return newState;
    });
  };

  // Define the value and effort levels
  const valueLevels = ['high', 'medium', 'low'];
  const effortLevels = ['low', 'medium', 'high'];

  // Create a grid of droppable cells
  const grid = valueLevels.map(value => (
    <div key={`row-${value}`} className="grid grid-cols-3 gap-2">
      {effortLevels.map(effort => {
        // Get the droppable properties for this cell
        const { isOver, setNodeRef } = useDroppable({
          id: `cell-${value}-${effort}`,
        });

        // Get stories for this cell
        const stories = getStoriesInCell(value, effort);

        // Determine cell styling based on value and effort
        const getCellStyle = () => {
          // Value determines the base color
          const valueColors = {
            high: 'bg-green-50 border-green-200',
            medium: 'bg-yellow-50 border-yellow-200',
            low: 'bg-red-50 border-red-200',
          };

          // Effort adjusts the intensity (darker for high effort)
          const effortModifier = isOver ? 'ring-2 ring-blue-400' : '';

          return `${valueColors[value as keyof typeof valueColors]} ${effortModifier}`;
        };

        // Get the label for this cell
        const getCellLabel = () => {
          const valueLabels = {
            high: 'High Value',
            medium: 'Medium Value',
            low: 'Low Value',
          };

          const effortLabels = {
            low: 'Low Effort',
            medium: 'Medium Effort',
            high: 'High Effort',
          };

          return {
            value: valueLabels[value as keyof typeof valueLabels],
            effort: effortLabels[effort as keyof typeof effortLabels],
          };
        };

        const labels = getCellLabel();

        return (
          <div
            key={`cell-${value}-${effort}`}
            ref={setNodeRef}
            className={`p-3 border rounded-lg ${getCellStyle()} min-h-[200px] transition-all`}
          >
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold uppercase text-gray-500">
                  {labels.value} / {labels.effort}
                </span>
                <span className="text-xs bg-white rounded-full px-2 py-0.5 shadow-sm">
                  {stories.length} stories
                </span>
              </div>
              <div className="space-y-2 overflow-y-auto flex-grow">
                {stories.map(story => (
                  <StoryCard
                    key={story._id || story.id}
                    story={story}
                    position={{ value, effort }}
                    isExpanded={expandedStoryIds.has(story._id || story.id || '')}
                    onToggleExpand={() => toggleStoryExpansion(story._id || story.id || '')}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  ));

  return (
    <div className="flex flex-col space-y-4">
      <div className="grid grid-cols-3 gap-2 mb-1">
        <div className="text-center text-sm font-medium text-gray-500">Low Effort</div>
        <div className="text-center text-sm font-medium text-gray-500">Medium Effort</div>
        <div className="text-center text-sm font-medium text-gray-500">High Effort</div>
      </div>
      <div className="space-y-2">
        {grid}
      </div>
      <div className="flex justify-between mt-4 text-sm text-gray-700">
        <div>
          <span className="font-medium">Total Points:</span> {totalPoints}
        </div>
        <div>
          <span className="font-medium">Total Effort:</span> {totalEffort} hours
        </div>
      </div>
    </div>
  );
}
