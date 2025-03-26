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
  stories: Story[];
  onUpdateStory?: (story: Story) => Promise<boolean>;
  readOnly?: boolean;
  expandedStoryIds?: Set<string>;
  toggleStoryExpansion?: (storyId: string) => void;
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
  stories = [], 
  onUpdateStory,
  readOnly = false,
  expandedStoryIds = new Set(),
  toggleStoryExpansion = () => {},
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

  // Function to get stories for a specific cell
  const getStoriesInCell = (value: string, effort: string) => {
    if (!stories || !Array.isArray(stories)) return [];
    
    // Map business values to matrix values
    const businessValueMap: Record<string, string> = {
      'Critical': 'high',
      'Important': 'medium',
      'Nice to Have': 'low'
    };
    
    // Map effort categories to matrix effort levels
    const effortCategoryMap: Record<string, string> = {
      'Small': 'low',
      'Medium': 'medium',
      'Large': 'high'
    };
    
    return stories.filter(story => {
      // Get the matrix value that corresponds to the story's business value
      const storyValue = businessValueMap[story.businessValue || ''] || value;
      
      // Get the matrix effort that corresponds to the story's effort category
      const storyEffort = effortCategoryMap[story.effortCategory || ''] || effort;
      
      // Return true if both match the cell's value and effort
      return storyValue === value && storyEffort === effort;
    });
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
        
        {renderPositionedStories ? (
          renderPositionedStories(value, effort)
        ) : (
          <div className="space-y-2">
            {cellStories.map(story => (
              <StoryCard
                key={story._id || story.id}
                story={story}
                position={{ value, effort }}
                isExpanded={expandedStoryIds.has(story._id || story.id || '')}
                onToggleExpand={() => toggleStoryExpansion(story._id || story.id || '')}
                onAdjustPoints={!readOnly && onUpdateStory ? 
                  (storyId, points, reason) => {
                    const updatedStory = { ...story, points, adjustmentReason: reason };
                    return onUpdateStory(updatedStory);
                  } : undefined
                }
              />
            ))}
          </div>
        )}
      </MatrixCell>
    );
  };

  // Handle rendering of the matrix header
  const renderValueHeader = (value: string, index: number) => {
    const valueLabel = businessValueLabels[value as keyof typeof businessValueLabels] || value;
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
    return (
      <div 
        key={`effort-header-${index}`} 
        className="p-2 text-right text-gray-700 font-medium"
      >
        {effort} <span className="text-xs">({pointRanges[effort as keyof typeof pointRanges]})</span>
      </div>
    );
  };

  // Structure of the matrix - main grid wrapper with header row, header column, and cells
  return (
    <div className="bg-white border rounded-lg shadow-sm p-4">
      <div className="grid grid-cols-4 gap-3 mb-4">
        {/* Header row - empty corner cell */}
        <div className="col-span-1"></div>
        
        {/* Value headers */}
        <div className="col-span-3 grid grid-cols-3 gap-3">
          {valueLevels.map((value, index) => renderValueHeader(value, index))}
        </div>
      </div>

      {/* Main grid - effort rows with cells */}
      {effortLevels.map((effort, effortIndex) => (
        <div key={`row-${effortIndex}`} className="grid grid-cols-4 gap-3 mb-3">
          {/* Effort header */}
          <div className="col-span-1">
            {renderEffortHeader(effort, effortIndex)}
          </div>
          
          {/* Value cells for this effort level */}
          <div className="col-span-3 grid grid-cols-3 gap-3">
            {valueLevels.map((value, valueIndex) => (
              <div key={`cell-${effortIndex}-${valueIndex}`} className="min-h-[120px]">
                {renderCell(value, effort)}
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {/* Footer with totals */}
      {(totalPoints || totalEffort) && (
        <div className="mt-4 border-t pt-4 grid grid-cols-2 gap-4">
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
  );
}
