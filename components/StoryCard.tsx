import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

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
    acceptanceCriteria?: string[];
    businessValueMismatch?: string;
  };
  position: { value: string; effort: string } | null;
  isDragging?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onRemove?: () => void;
  onAdjustPoints?: (storyId: string, points: number, reason: string) => void;
  inMatrix?: boolean;
};

export function StoryCard({ 
  story, 
  position, 
  isDragging, 
  isExpanded, 
  onToggleExpand, 
  onRemove,
  onAdjustPoints,
  inMatrix = false
}: StoryCardProps) {
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState(story.adjustmentReason || '');
  const [adjustedPoints, setAdjustedPoints] = useState(story.storyPoints || story.points || 0);
  
  // Convex mutations
  const resetStoryPointsMutation = useMutation(api.stories.resetStoryPoints);
  const adjustStoryPointsMutation = useMutation(api.stories.adjustStoryPoints);
  
  // Helper to safely cast string ID to Convex ID
  const getConvexId = (id: any): Id<"stories"> | null => {
    if (id && typeof id === 'object' && '_id' in id) {
      return id._id as Id<"stories">;
    }
    if (id && typeof id === 'object' && '__id' in id) {
      return id as Id<"stories">;
    }
    return null;
  };

  // Use the internal or external ID, whichever is available
  const storyId = getConvexId(story) || story.id;
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
    'Critical': 'bg-green-100 text-green-800 border-green-200',
    'High': 'bg-green-100 text-green-800 border-green-200',
    'Important': 'bg-blue-100 text-blue-800 border-blue-200',
    'Medium': 'bg-blue-100 text-blue-800 border-blue-200',
    'Nice to Have': 'bg-gray-100 text-gray-800 border-gray-200',
    'Low': 'bg-gray-100 text-gray-800 border-gray-200',
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
    if (onAdjustPoints && adjustmentReason.trim()) {
      // Call the parent component's handler
      onAdjustPoints(storyId as string, adjustedPoints, adjustmentReason);
      
      // If we have a Convex ID, also update in the database
      if (story._id) {
        const convexId = getConvexId(story);
        if (convexId) {
          adjustStoryPointsMutation({
            id: convexId,
            newPoints: adjustedPoints,
            adjustmentReason: adjustmentReason
          });
        }
      }
      
      setShowAdjustmentDialog(false);
    }
  };
  
  const handleResetToOriginal = () => {
    if (originalPoints !== undefined) {
      setAdjustedPoints(originalPoints);
      setAdjustmentReason('Reset to original estimate');
      
      // If we have a Convex ID, also reset in the database
      const convexId = getConvexId(story);
      if (convexId) {
        resetStoryPointsMutation({ id: convexId }).then(result => {
          if (result?.success && onAdjustPoints) {
            // Call the parent component's handler to update UI
            onAdjustPoints(storyId as string, originalPoints, '');
          }
        });
      } else if (onAdjustPoints) {
        // Just use the local handler if no Convex ID
        onAdjustPoints(storyId as string, originalPoints, '');
      }
    }
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
          bg-white shadow-sm rounded-lg p-1 cursor-grab border-2
          ${isDragging ? 'opacity-50' : ''}
          ${position ? 'border-blue-400' : 'border-transparent'}
          ${hasAdjustment ? 'ring-2 ring-purple-300' : ''}
          hover:border-blue-200 transition-colors
        `}
        style={style}
      >
        <div className="flex flex-col gap-2 m-0 p-0">
          <div className="m-0 p-0 bg-gradient-to-b from-gray-100 to-white rounded-lg">
            <div className="flex space-x-1 items-center justify-end z-20 -mt-1">
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
            <h3 className="font-medium text-gray-900 leading-[0.85] tracking-tight pl-2 -mt-2 z-10">{story.title}</h3>
          </div>
          
          <div className="flex flex-wrap gap-2 transition-size">
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${valueBadgeColor} ${story.businessValueMismatch ? 'border border-red-400' : ''}`}>
              {story.businessValue || 'Unrated'}
            </span>
            
            {/* Business Value Mismatch Badge */}
            {story.businessValueMismatch && (
              <div className="relative group">
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
                  </svg>
                  Mismatch
                </span>
                
                <div className="absolute z-10 hidden group-hover:block w-64 -left-24 top-6 bg-white border border-gray-200 rounded-md shadow-lg p-2 text-xs">
                  <div className="font-medium text-gray-900 mb-1">Business Value Mismatch</div>
                  <div className="text-gray-700 mb-1">
                    Card's value: <span className="font-medium">{story.businessValue}</span><br/>
                    Matrix position suggests: <span className="font-medium">{story.businessValueMismatch}</span>
                  </div>
                  <div className="mt-1 text-red-600">
                    Consider moving this story to a more appropriate position or adjusting its business value.
                  </div>
                </div>
              </div>
            )}
            
            <div className="relative group">
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${pointsBadgeColor} ${hasAdjustment ? 'border border-purple-400' : ''}`}>
                {storyPoints || '?'} points {hasAdjustment && (
                  <span className="ml-1 text-purple-700" title="Points adjusted from original estimate">
                    *
                  </span>
                )}
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
            {/* Only show position badge outside of matrix */}
            {position && !inMatrix && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {`${position.value}/${position.effort}`}
              </span>
            )}
          </div>
          
          {isExpanded && (
            <div className="mt-2 text-sm text-gray-700 transition-all">
              {story.userStory && (
                <div className="mb-2 italic border-l-2 border-gray-200 pl-2">
                  "{story.userStory}"
                </div>
              )}
              {story.notes && <p className="text-gray-600">{story.notes}</p>}
              
              {/* Acceptance Criteria Section */}
              {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">
                    Acceptance Criteria
                  </h4>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {story.acceptanceCriteria.map((criterion, index) => (
                      <li key={index} className="text-gray-700">{criterion}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="mt-2 text-xs text-gray-500 flex items-center">
                <span>ID: {storyId}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Adjustment Dialog */}
      {showAdjustmentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Adjust Story Points</h3>
            
            <div className="mb-4">
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Story Points</label>
                {originalPoints !== undefined && originalPoints !== adjustedPoints && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    {adjustedPoints > originalPoints ? 'Increased' : 'Decreased'}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
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
                <div className="text-xs text-gray-500 mt-1 flex items-center">
                  <span>Original: {originalPoints} points</span>
                  <button 
                    className="ml-2 text-blue-600 hover:text-blue-800 text-xs underline" 
                    onClick={handleResetToOriginal}
                  >
                    Reset to original
                  </button>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <label className="block text-sm font-medium text-gray-700">
                    Reason for Adjustment
                  </label>
                  <span className="ml-1 text-red-500 font-medium">*</span>
                </div>
                {originalPoints !== undefined && originalPoints !== adjustedPoints && !adjustmentReason.trim() && (
                  <span className="text-xs text-red-500 font-medium">Required</span>
                )}
              </div>
              <textarea
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className={`w-full p-2 border rounded text-sm ${
                  !adjustmentReason.trim() && originalPoints !== undefined && originalPoints !== adjustedPoints 
                    ? 'border-red-500 ring-1 ring-red-500 bg-red-50' 
                    : 'border-gray-300'
                }`}
                rows={3}
                placeholder="Explain why you're adjusting the story points..."
                aria-required="true"
              />
              {!adjustmentReason.trim() && originalPoints !== undefined && originalPoints !== adjustedPoints && (
                <p className="text-xs text-red-500 mt-1">
                  <span className="font-bold">⚠️</span> A reason is required when adjusting story points
                </p>
              )}
              
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
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed"
                disabled={!adjustmentReason.trim() && originalPoints !== undefined && originalPoints !== adjustedPoints}
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
