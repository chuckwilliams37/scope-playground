import React from 'react';
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
  };
  position: { value: string; effort: string } | null;
  isDragging?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
};

export function StoryCard({ story, position, isDragging, isExpanded, onToggleExpand }: StoryCardProps) {
  // Use the internal or external ID, whichever is available
  const storyId = story._id || story.id;
  const storyPoints = story.storyPoints || story.points;
  
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: storyId as string,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Define badge colors based on business value
  const valueBadgeColors = {
    Critical: 'bg-red-100 text-red-800',
    High: 'bg-orange-100 text-orange-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    Low: 'bg-green-100 text-green-800',
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

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`
        bg-white shadow-sm rounded-lg p-3 cursor-grab border-2
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${position ? 'border-blue-400' : 'border-transparent'}
        hover:border-blue-200 transition-colors
      `}
      style={style}
    >
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <h3 className="font-medium text-gray-900 flex-1">{story.title}</h3>
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
        
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${valueBadgeColor}`}>
            {story.businessValue || 'Unrated'}
          </span>
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${pointsBadgeColor}`}>
            {storyPoints || '?'} points
          </span>
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
  );
}
