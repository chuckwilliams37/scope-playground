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

type RenderPositionedStoriesFunction = (
  value: string,
  effort: string
) => JSX.Element | null;

type ValueMatrixProps = {
  getStoriesInCell: (value: string, effort: string) => any[];
  expandedStoryIds: Set<string>;
  toggleStoryExpansion: (storyId: string) => void;
  totalPoints?: number;
  totalEffort?: number;
  renderPositionedStories?: RenderPositionedStoriesFunction;
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
  getStoriesInCell, 
  expandedStoryIds,
  toggleStoryExpansion,
  totalPoints,
  totalEffort,
  renderPositionedStories 
}: ValueMatrixProps) {
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

  // Check if there's a value mismatch between story's business value and cell's value
  const hasMismatch = (story: Story, cellValue: string) => {
    // Map business values to expected cell values
    const valueMap: Record<string, string> = {
      'Critical': 'high',
      'Important': 'medium',
      'Nice to Have': 'low'
    };
    
    // Get expected cell value based on business value
    const expectedCellValue = valueMap[story.businessValue || 'Nice to Have'] || 'low';
    
    // Return true if there's a significant mismatch
    return expectedCellValue !== cellValue;
  };

  // Define the value and effort levels
  const valueLevels = ['high', 'medium', 'low'];
  const effortLevels = ['low', 'medium', 'high'];
  const businessValueLevels = ['high', 'medium', 'low'];
  
  // Define point ranges for effort levels
  const pointRanges = {
    'low': '1-3',
    'medium': '5-8',
    'high': '13-21'
  };
  
  // Map business value to readable labels
  const businessValueLabels = {
    'high': 'Critical',
    'medium': 'Important',
    'low': 'Nice to Have'
  };

  // Define color classes for the matrix cells
  const getColorClass = (valueLevel: string) => {
    // Use standardized terminology with specific colors
    if (valueLevel === 'Critical' || valueLevel === 'High') {
      return 'bg-green-100 border-green-300';
    } else if (valueLevel === 'Important' || valueLevel === 'Medium') {
      return 'bg-blue-100 border-blue-300';
    } else {
      // "Nice to Have" or "Low"
      return 'bg-gray-100 border-gray-300';
    }
  };

  // Get text color class based on value level
  const getTextColorClass = (valueLevel: string) => {
    if (valueLevel === 'high' || valueLevel === 'Critical') {
      return 'text-green-800';
    } else if (valueLevel === 'medium' || valueLevel === 'Important') {
      return 'text-blue-800';
    } else {
      return 'text-gray-800'; // "Nice to Have" or "low"
    }
  };

  const renderCell = (value: string, effort: string) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `cell-${value}-${effort}`,
    });
    
    const cellStories = getStoriesInCell(value, effort);
    const valueKey = valueLevels.indexOf(value);
    const effortKey = effortLevels.indexOf(effort);
    
    // Check for business value mismatches
    const storiesWithMismatches = cellStories
      .filter(story => story.businessValue && hasMismatch(story, value))
      .map(story => ({
        storyId: story._id || story.id || '',
        storyValue: story.businessValue || '',
        cellValue: value,
        storyTitle: story.title
      }));
    
    // Render the cell with appropriate styling
    const cellClassName = `border rounded-lg p-3 min-h-24 h-full 
                           ${getColorClass(value)}
                           ${cellStories.length > 0 ? 'shadow-md' : 'shadow-sm'}
                           ${isOver ? 'border-2 border-blue-500 shadow-lg ring-2 ring-blue-300' : 'border-gray-200'}
                           ${isOver ? 'relative before:absolute before:inset-0 before:bg-blue-100 before:bg-opacity-40 before:z-0 before:rounded-lg' : ''}
                           transition-all duration-200 hover:shadow-lg`;
    return (
      <MatrixCell
        key={`cell-${value}-${effort}`}
        value={value}
        effort={effort}
        className={cellClassName}
        showAlert={storiesWithMismatches.length > 0}
        isDismissed={dismissedAlerts.has(`${value}-${effort}`)}
        onDismiss={() => handleDismissAlert(`${value}-${effort}`)}
        setNodeRef={setNodeRef}
      >
        {isOver && (
          <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
            <div className="border-2 border-blue-400 border-dashed rounded-lg w-full h-full animate-pulse"></div>
          </div>
        )}
        <div className="text-xs text-gray-500 mb-2 relative z-10">
          {valueLevels[valueKey]} / {effortLevels[effortKey]}
        </div>
        <div className="relative z-10">
          {renderPositionedStories 
            ? renderPositionedStories(value, effort)
            : cellStories.map(story => (
                <StoryCard 
                  key={story._id || story.id || `story-${Math.random()}`}
                  story={story} 
                  position={{ value, effort }}
                  isExpanded={expandedStoryIds.has(story._id || story.id || '')}
                  onToggleExpand={() => toggleStoryExpansion(story._id || story.id || '')}
                />
              ))
          }
        </div>
      </MatrixCell>
    );
  };

  // Create a grid of droppable cells
  const grid = valueLevels.map((value, valueIndex) => (
    <div key={`row-${value}`} className="grid grid-cols-[8rem_1fr] gap-2">
      {/* Business value indicator */}
      <div className="flex items-center justify-end pr-2 h-full">
        <div 
          className={`
            w-8 py-2 rounded-md text-center font-medium text-sm rotate-180
            ${getTextColorClass(value)}
          `}
          style={{ writingMode: 'vertical-rl' }}
        >
          {businessValueLabels[value as keyof typeof businessValueLabels]}
        </div>
      </div>
      
      {/* Cells for this row */}
      <div className="grid grid-cols-3 gap-2">
        {effortLevels.map(effort => (
          <div key={`cell-${value}-${effort}`}>
            {renderCell(value, effort)}
          </div>
        ))}
      </div>
    </div>
  ));

  // Format the total points display
  const formatTotalPoints = () => {
    if (totalPoints === undefined) return '0';
    return totalPoints.toString();
  };

  // Format the total effort display
  const formatTotalEffort = () => {
    if (totalEffort === undefined) return '0';
    return totalEffort.toString();
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Drag and Drop Interaction Hints */}
      <div className="mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <div className="flex items-center mb-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="font-medium text-blue-700">Matrix Interaction Guide</h3>
        </div>
        <ul className="list-disc list-inside pl-2 text-blue-700">
          <li>Drag stories from the backlog into the matrix to prioritize them</li>
          <li>Position stories based on their business value (Critical, Important, Nice to Have) and effort</li>
          <li>Click on a story card to expand/collapse details</li>
          <li>Warning indicators appear when a story's business value doesn't match its position</li>
        </ul>
      </div>
      
      <div className="grid grid-cols-[auto_1fr] gap-2 mb-1">
        {/* Empty space for alignment with business value column */}
        <div></div>
        
        {/* Effort headers with point ranges */}
        <div className="grid grid-cols-3 gap-2">
          {effortLevels.map(effort => (
            <div key={`header-${effort}`} className="text-center">
              <div className="text-sm font-medium text-gray-700">{effort.charAt(0).toUpperCase() + effort.slice(1)} Effort</div>
              <div className="text-xs text-gray-500">({pointRanges[effort as keyof typeof pointRanges]} points)</div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {grid}
      </div>
      {/* Total Points/Effort display */}
      <div className="mt-4 flex justify-between text-sm font-medium">
        <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
          Total Points: {formatTotalPoints()}
        </div>
        <div className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
          Total Effort: {formatTotalEffort()}
        </div>
      </div>
    </div>
  );
}
