import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';

type StoryCardProps = {
  story: {
    _id?: string;
    id?: string;
    title: string;
    businessValue?: string;
    storyPoints?: number;
    points?: number;
    notes?: string;
    userStory?: string;
    category?: string;
    adjustmentReason?: string;
    originalPoints?: number;
  };
  position: { value: string; effort: string } | null;
  isDragging?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onRemove?: () => void;
  onAdjustPoints?: (storyId: string, points: number, reason: string) => void;
};

export function StoryCard({ 
  story, 
  position, 
  isDragging, 
  isExpanded, 
  onToggleExpand, 
  onRemove,
  onAdjustPoints 
}: StoryCardProps) {
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState(story.adjustmentReason || '');
  const [adjustedPoints, setAdjustedPoints] = useState(story.storyPoints || story.points || 0);
  
  // Use the internal or external ID, whichever is available
  const storyId = story._id || story.id;
  const storyPoints = story.storyPoints || story.points;
  const originalPoints = story.originalPoints;
  const hasAdjustment = originalPoints !== undefined && originalPoints !== storyPoints;
  
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: storyId as string,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Define badge colors based on business value - make consistent with matrix
  const valueBadgeColors = {
    Critical: 'bg-green-100 text-green-800 border-green-200',
    Important: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Nice to Have': 'bg-red-100 text-red-800 border-red-200',
    Low: 'bg-red-100 text-red-800 border-red-200',
  };

  // Define badge colors based on story points
  const pointsBadgeColors: Record<number, string> = {
    1: 'bg-green-100 text-green-800',
    2: 'bg-green-100 text-green-800',
    3: 'bg-green-100 text-green-800',
    5: 'bg-yellow-100 text-yellow-800',
    8: 'bg-orange-100 text-orange-800',
    13: 'bg-red-100 text-red-800',
    21: 'bg-purple-100 text-purple-800',
  };

  // Get business value color or default
  const valueBadgeColor = story.businessValue && valueBadgeColors[story.businessValue as keyof typeof valueBadgeColors] 
    ? valueBadgeColors[story.businessValue as keyof typeof valueBadgeColors] 
    : 'bg-gray-100 text-gray-800';

  // Get points color or default
  const pointsBadgeColor = storyPoints && pointsBadgeColors[storyPoints] 
    ? pointsBadgeColors[storyPoints] 
    : 'bg-gray-100 text-gray-800';
    
  const handleSaveAdjustment = () => {
    if (onAdjustPoints && storyId) {
      onAdjustPoints(storyId as string, adjustedPoints, adjustmentReason);
    }
    setShowAdjustmentDialog(false);
  };
  
  const commonAdjustmentReasons = [
    { text: "Capping effort to fit sprint capacity", points: "lower" },
    { text: "Technical complexity underestimated", points: "higher" },
    { text: "Scope reduced to essential features", points: "lower" },
    { text: "Additional integrations required", points: "higher" },
    { text: "Leveraging existing components", points: "lower" }
  ];

  const getAdjustmentDirection = () => {
    if (!originalPoints || originalPoints === storyPoints) return null;
    return originalPoints > (storyPoints || 0) ? "decreased" : "increased";
  };
  
  const getAdjustmentTooltip = () => {
    const direction = getAdjustmentDirection();
    if (!direction) return "";
    
    return direction === "decreased" 
      ? "User elected to reduce effort on this story" 
      : "User elected to increase effort on this story";
  };

  return (
    <>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={`
          bg-white shadow-sm rounded-lg p-3 cursor-grab border-2
          ${isDragging ? 'opacity-50' : 'opacity-100'}
          ${position ? 'border-blue-400' : 'border-transparent'}
          ${hasAdjustment ? 'ring-2 ring-purple-300' : ''}
          hover:border-blue-200 transition-colors
        `}
        style={style}
      >
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-gray-900 flex-1">{story.title}</h3>
            <div className="flex space-x-1">
              {position && onRemove && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRemove) onRemove();
                  }}
                  className="text-red-500 hover:text-white hover:bg-red-500 p-1 rounded-full transition-colors duration-200 flex items-center justify-center"
                  title="Remove from matrix"
                  aria-label="Remove story from matrix"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              {onAdjustPoints && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAdjustmentDialog(true);
                  }}
                  className="text-purple-500 hover:text-white hover:bg-purple-500 p-1 rounded-full transition-colors duration-200 flex items-center justify-center"
                  title="Adjust story points"
                  aria-label="Adjust story points"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleExpand) onToggleExpand();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                {isExpanded ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${valueBadgeColor}`}>
              {story.businessValue || 'Unrated'}
            </span>
            <div className="relative group">
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${pointsBadgeColor} ${hasAdjustment ? 'border border-purple-400' : ''}`}>
                {storyPoints || '?'} points {hasAdjustment && <span className="ml-1">*</span>}
              </span>
              
              {hasAdjustment && originalPoints !== undefined && (
                <div className="absolute z-10 hidden group-hover:block w-60 -left-24 top-6 bg-white border border-gray-200 rounded-md shadow-lg p-2 text-xs">
                  <div className="font-medium text-gray-900 mb-1">Story points adjusted</div>
                  <div className="text-gray-700 mb-1">
                    Original: <span className="font-medium">{originalPoints} points</span> → 
                    Current: <span className="font-medium">{storyPoints || 0} points</span>
                  </div>
                  {story.adjustmentReason && (
                    <div className="text-gray-600 italic">{story.adjustmentReason}</div>
                  )}
                  <div className="mt-1 text-purple-600">
                    {getAdjustmentTooltip()}
                  </div>
                </div>
              )}
            </div>
            {story.category && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800">
                {story.category}
              </span>
            )}
            {position && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {`${position.value}/${position.effort}`}
              </span>
            )}
          </div>
          
          {isExpanded && (
            <div className="mt-2 text-sm text-gray-700">
              {story.userStory && (
                <div className="mb-2 italic border-l-2 border-gray-200 pl-2">
                  "{story.userStory}"
                </div>
              )}
              {story.notes && <p className="text-gray-600">{story.notes}</p>}
              <div className="mt-2 text-xs text-gray-500 flex items-center">
                <span>ID: {storyId}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Adjustment Dialog */}
      {showAdjustmentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Adjust Story Points</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Story Points
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={21}
                  step={1}
                  value={adjustedPoints}
                  onChange={(e) => setAdjustedPoints(Number(e.target.value))}
                  className="w-full"
                />
                <select
                  value={adjustedPoints}
                  onChange={(e) => setAdjustedPoints(Number(e.target.value))}
                  className="w-20 p-1 text-sm border rounded"
                >
                  {[1, 2, 3, 5, 8, 13, 21].map(point => (
                    <option key={point} value={point}>{point}</option>
                  ))}
                </select>
              </div>
              {originalPoints && (
                <div className="text-xs text-gray-500 mt-1">
                  Original: {originalPoints} points
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Adjustment
              </label>
              <textarea
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="w-full p-2 border rounded text-sm"
                rows={3}
                placeholder="Explain why you're adjusting the story points..."
              />
              
              <div className="mt-3">
                <div className="text-xs font-medium text-gray-700 mb-1">Common reasons:</div>
                <div className="flex flex-wrap gap-1">
                  {commonAdjustmentReasons.map((reason, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setAdjustmentReason(reason.text)}
                      className={`text-xs px-2 py-1 rounded-md border 
                        ${reason.points === 'lower' ? 'border-green-300 bg-green-50 hover:bg-green-100' : 'border-orange-300 bg-orange-50 hover:bg-orange-100'}`}
                    >
                      {reason.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowAdjustmentDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveAdjustment}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                disabled={!adjustmentReason.trim() && originalPoints !== adjustedPoints}
              >
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
