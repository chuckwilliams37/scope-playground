import { useDroppable } from '@dnd-kit/core';
import { StoryCard } from './StoryCard';
import { MismatchAlert } from './MismatchAlert';
import React, { useState, useCallback, ReactNode } from 'react';

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
  [key: string]: any;
};

type ValueMatrixProps = {
  stories: Story[];
  storyPositions: Record<string, { value: string, effort: string, rank?: number }>;
  onAdjustPoints?: (storyId: string, newPoints: number, reason: string) => void;
  onUpdateStory?: (story: Story) => Promise<boolean>;
  onEditStory?: (story: Story) => void;
  readOnly?: boolean;
  expandedStoryIds?: Set<string>;
  toggleStoryExpansion?: (storyId: string) => void;
  totalPoints?: number;
  totalEffort?: number;
};

// Function to fix any React node rendering issues
function safeRender(content: React.ReactNode): React.ReactNode {
  return content;
}

// Type for cell stories
type CellStories = {
  renderContent: (value: string, effort: string) => JSX.Element | null;
};

// Cell component to help with typing
const MatrixCell = ({ 
  value, 
  effort, 
  className, 
  showAlert, 
  isDismissed, 
  onDismiss,
  children,
  setNodeRef 
}: {
  value: string;
  effort: string;
  className: string;
  showAlert: boolean;
  isDismissed: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  setNodeRef?: (element: HTMLElement | null) => void;
}) => {
  return (
    <div ref={setNodeRef} className={className}>
      {showAlert && !isDismissed && (
        <MismatchAlert 
          storyValue={value}
          cellValue={effort}
          onDismiss={onDismiss}
        />
      )}
      <div className="space-y-2 mt-2">
        {children}
      </div>
    </div>
  );
};

export function ValuesMatrix({ 
  stories = [], 
  storyPositions = {},
  onAdjustPoints,
  onUpdateStory, 
  onEditStory,
  readOnly = false,
  expandedStoryIds = new Set(),
  toggleStoryExpansion = () => {},
  totalPoints,
  totalEffort,
}: ValueMatrixProps) {
  // --- DEBUG LOGGING START (RE-ADDED) ---
  console.log('[ValuesMatrix Render] Received storyPositions prop:', storyPositions);
  // --- DEBUG LOGGING END (RE-ADDED) ---

  // Track which mismatch alerts are dismissed
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Dismiss a mismatch alert
  const handleDismissAlert = (storyId: string) => {
    setDismissedAlerts(prevState => {
      const newState = new Set(prevState);
      newState.add(storyId);
      return newState;
    });
  };

  // Define the value and effort levels
  const valueLevels = ['high', 'medium', 'low'];
  const effortLevels = ['low', 'medium', 'high'];
  
  // Define point ranges for effort levels
  const pointRanges: Record<string, string> = {
    'low': '1-3',
    'medium': '5-8',
    'high': '13-21'
  };
  
  // Map business value to readable labels
  const businessValueLabels: Record<string, string> = {
    'high': 'Critical',
    'medium': 'Important',
    'low': 'Nice to Have'
  };

  // Define effort level labels for consistent display
  const effortLabels: Record<string, string> = {
    'low': 'Small (1-3 pts)',
    'medium': 'Medium (5-8 pts)',
    'high': 'Large (8+ pts)'
  };

  // Define color classes for the matrix cells
  const getColorClass = (valueLevel: string) => {
    // Use standardized terminology with specific colors
    if (valueLevel === 'Critical' || valueLevel === 'high') {
      return 'bg-green-100 border-green-300';
    } else if (valueLevel === 'Important' || valueLevel === 'medium') {
      return 'bg-yellow-100 border-yellow-300';
    } else {
      // "Nice to Have" or "low"
      return 'bg-red-100 border-red-300';
    }
  };

  // Get text color class based on value level
  const getTextColorClass = (valueLevel: string) => {
    if (valueLevel === 'high' || valueLevel === 'Critical') {
      return 'text-green-800';
    } else if (valueLevel === 'medium' || valueLevel === 'Important') {
      return 'text-yellow-800';
    } else {
      return 'text-red-800'; // "Nice to Have" or "low"
    }
  };

  const renderCell = (value: string, effort: string) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `cell-${value}-${effort}`,
      data: {
        value,
        effort,
        type: 'matrix-cell'
      }
    });

    // Robustly get story ID
    const getStoryId = (story: Story): string | undefined => story._id || story.id;

    // Filter stories for the current cell, handling ID and value mapping
    const cellStories = stories.filter(story => {
      const storyId = getStoryId(story);
      if (!storyId) return false; // Skip stories without an ID

      const position = storyPositions[storyId];
      if (!position) return false; // Skip stories not in storyPositions

      // Map cell's value level ('high', 'medium', 'low') to stored position value ('critical', 'important', 'nice-to-have')
      const matchesValue = 
        (value === 'high' && position.value === 'critical') ||
        (value === 'medium' && position.value === 'important') ||
        (value === 'low' && position.value === 'nice-to-have');

      // Check if effort matches
      const matchesEffort = position.effort === effort;

      return matchesValue && matchesEffort;
    });

    // Sort stories by rank if available (using robust ID check)
    const sortedStories = [...cellStories].sort((a, b) => {
      const idA = getStoryId(a);
      const idB = getStoryId(b);
      const rankA = idA ? storyPositions[idA]?.rank || 0 : 0;
      const rankB = idB ? storyPositions[idB]?.rank || 0 : 0;
      return rankA - rankB;
    });

    const valueKey = valueLevels.indexOf(value);
    const effortKey = effortLevels.indexOf(effort);
    
    // Get color class based on the value level
    const colorClass = getColorClass(businessValueLabels[value] || value);
    
    return (
      <div
        ref={setNodeRef}
        className={`p-3 h-full rounded border-2 ${colorClass} ${isOver ? 'ring-2 ring-blue-500' : ''} relative transition-all duration-200`}
        style={{ minHeight: '120px' }}
      >
        {isOver && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="border-2 border-blue-400 border-dashed rounded-lg w-full h-full animate-pulse bg-blue-50 bg-opacity-40"></div>
          </div>
        )}
        <div className="text-xs text-gray-500 mb-2 relative z-5 flex justify-between items-center">
          <span>{businessValueLabels[value] || value} / {effortLabels[effort] || effort}</span>
          <span className="bg-gray-100 px-1 py-0.5 rounded text-xs font-medium">
            {sortedStories.length > 0 ? (
              <>
                {sortedStories.length} {sortedStories.length === 1 ? 'story' : 'stories'} • 
                {sortedStories.reduce((sum, story) => sum + (story.points || 0), 0)} pts
              </>
            ) : ''}
          </span>
        </div>
        
        {/* Render stories positioned in this cell */}
        <div className="space-y-2">
          {sortedStories.map(story => {
            const storyId = getStoryId(story);
            if (!storyId) return null; // Should not happen due to filter, but belts and suspenders
            const position = storyPositions[storyId]; // Get the actual position data
            if (!position) return null; // Belts and suspenders

            return (
              <StoryCard
                key={storyId} // Use robust ID
                story={story}
                // Pass normalized position data with matrix-to-story value mapping
                position={{
                  value: position.value,
                  effort: position.effort
                }}
                // Use the new onAdjustPoints handler passed from the parent
                onAdjustPoints={!readOnly && onAdjustPoints ? onAdjustPoints : undefined} 
                inMatrix={true} // Indicate this card is in the matrix
                onEdit={onEditStory ? () => onEditStory(story) : undefined}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // Handle rendering of the matrix header
  const renderValueHeader = (value: string, index: number) => {
    const valueLabel = businessValueLabels[value];
    return (
      <div 
        key={`value-header-${index}`} 
        className={`p-2 text-center font-semibold ${getTextColorClass(value)}`}
      >
        {valueLabel}
      </div>
    );
  };

  // Handle rendering of the matrix effort row headers
  const renderEffortHeader = (effort: string, index: number) => {
    const capitalizedEffort = effort.charAt(0).toUpperCase() + effort.slice(1);
    return (
      <div 
        key={`effort-header-${index}`} 
        className="p-2 text-right text-gray-700 font-medium"
      >
        {capitalizedEffort} <span className="text-xs">({pointRanges[effort]})</span>
      </div>
    );
  };

  // Structure of the matrix - main grid wrapper with header row, header column, and cells
  return (
    <div className="bg-white border rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Business Value Matrix</h3>
        <div className="text-sm text-gray-600">
          {Object.keys(storyPositions).length}{' '} 
          {Object.keys(storyPositions).length === 1 ? 'story' : 'stories'} • {' '}
          {Object.keys(storyPositions).reduce((sum, storyId) => {
            const story = stories.find(s => s._id === storyId);
            return sum + (story?.storyPoints || story?.points || 0);
          }, 0)}{' '} 
          total points
        </div> 
      </div>
      <div className="bg-white rounded-lg">
        {/* Table header with effort levels */}
        <div className="grid grid-cols-4 gap-0 border-b">
          <div className="py-2 px-2 font-bold text-center">Business Value ↓</div>
          <div className="py-2 px-2 text-center font-semibold border-l">
            {effortLabels['low']}
          </div>
          <div className="py-2 px-2 text-center font-semibold border-l">
            {effortLabels['medium']}
          </div>
          <div className="py-2 px-2 text-center font-semibold border-l">
            {effortLabels['high']}
          </div>
        </div>
        
        {/* Business value rows with effort cells */}
        <div className="divide-y">
          {/* Critical row */}
          <div className="grid grid-cols-4 gap-0">
            <div className="p-2 font-semibold text-green-800">
              {businessValueLabels['high']}
            </div>
            <div className="border-l min-h-[150px]">
              {renderCell('high', 'low')}
            </div>
            <div className="border-l min-h-[150px]">
              {renderCell('high', 'medium')}
            </div>
            <div className="border-l min-h-[150px]">
              {renderCell('high', 'high')}
            </div>
          </div>
          
          {/* Important row */}
          <div className="grid grid-cols-4 gap-0">
            <div className="p-2 font-semibold text-yellow-800">
              {businessValueLabels['medium']}
            </div>
            <div className="border-l min-h-[150px]">
              {renderCell('medium', 'low')}
            </div>
            <div className="border-l min-h-[150px]">
              {renderCell('medium', 'medium')}
            </div>
            <div className="border-l min-h-[150px]">
              {renderCell('medium', 'high')}
            </div>
          </div>
          
          {/* Nice to Have row */}
          <div className="grid grid-cols-4 gap-0">
            <div className="p-2 font-semibold text-red-800">
              {businessValueLabels['low']}
            </div>
            <div className="border-l min-h-[150px]">
              {renderCell('low', 'low')}
            </div>
            <div className="border-l min-h-[150px]">
              {renderCell('low', 'medium')}
            </div>
            <div className="border-l min-h-[150px]">
              {renderCell('low', 'high')}
            </div>
          </div>
        </div>
      
        {/* Footer with totals */}
        {(totalPoints || totalEffort) && (
          <div className="mt-4 border-t pt-4 grid grid-cols-2 gap-4 p-3">
            {totalPoints && (
              <div className="text-sm">
                <span className="font-semibold">Total Points:</span> {totalPoints}
              </div>
            )}
            {totalEffort && (
              <div className="text-sm text-right">
                <span className="font-semibold">Total Effort:</span> {totalEffort}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
