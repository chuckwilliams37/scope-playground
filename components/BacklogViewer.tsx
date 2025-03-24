import React, { useState } from 'react';
import { StoryCard } from './StoryCard';

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

type BacklogViewerProps = {
  stories: Story[];
  categoryFilter?: string;
  valueFilter?: string;
  pointsFilter?: number;
  expandedStoryIds?: string[];
  onToggleExpandStory?: (storyId: string) => void;
};

export function BacklogViewer({ 
  stories, 
  categoryFilter, 
  valueFilter, 
  pointsFilter,
  expandedStoryIds: externalExpandedStoryIds,
  onToggleExpandStory
}: BacklogViewerProps) {
  // Local state for expanded stories when not provided externally
  const [internalExpandedStoryIds, setInternalExpandedStoryIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(categoryFilter);
  const [selectedValue, setSelectedValue] = useState<string | undefined>(valueFilter);

  // Toggle story expansion (use external handler if provided)
  const toggleStoryExpansion = (storyId: string) => {
    if (onToggleExpandStory) {
      onToggleExpandStory(storyId);
    } else {
      setInternalExpandedStoryIds(prevState => {
        const newState = new Set(prevState);
        if (newState.has(storyId)) {
          newState.delete(storyId);
        } else {
          newState.add(storyId);
        }
        return newState;
      });
    }
  };
  
  // Extract all unique categories from stories
  const categories = Array.from(
    new Set(
      stories
        .map(story => story.category)
        .filter((category): category is string => Boolean(category))
    )
  );
  
  // Extract all unique business values from stories
  const businessValues = Array.from(
    new Set(
      stories
        .map(story => story.businessValue)
        .filter((value): value is string => Boolean(value))
    )
  );
  
  // Filter stories based on search and filters
  const filteredStories = stories.filter(story => {
    // Search by title or description
    const matchesSearch = !searchQuery || 
      story.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (story.userStory && story.userStory.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by category if selected
    const matchesCategory = !selectedCategory || story.category === selectedCategory;
    
    // Filter by business value if selected
    const matchesValue = !selectedValue || story.businessValue === selectedValue;
    
    // Filter by points if specified
    const matchesPoints = !pointsFilter || 
      (story.storyPoints || story.points) === pointsFilter;
    
    return matchesSearch && matchesCategory && matchesValue && matchesPoints;
  });

  // Sort stories by businessValue priority (Critical, High, Medium, Low)
  const sortedStories = Array.from(filteredStories).sort((a, b) => {
    const priorityOrder: Record<string, number> = {
      'Critical': 0,
      'High': 1,
      'Medium': 2,
      'Low': 3
    };
    
    const valueA = a.businessValue || 'Low';
    const valueB = b.businessValue || 'Low';
    
    return (priorityOrder[valueA] || 999) - (priorityOrder[valueB] || 999);
  });

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold mb-4">Story Backlog</h2>
        
        <div className="flex flex-col gap-3">
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search stories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || undefined)}
              className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            
            <select
              value={selectedValue || ''}
              onChange={(e) => setSelectedValue(e.target.value || undefined)}
              className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">All Values</option>
              {businessValues.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory(undefined);
                setSelectedValue(undefined);
              }}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
      
      <div className="overflow-y-auto max-h-[600px]">
        <div className="p-4 space-y-3">
          {sortedStories.length > 0 ? (
            sortedStories.map((story) => (
              <StoryCard
                key={story._id || story.id}
                story={story}
                position={null}
                isExpanded={externalExpandedStoryIds 
                  ? externalExpandedStoryIds.includes(story._id || story.id || '') 
                  : internalExpandedStoryIds.has(story._id || story.id || '')}
                onToggleExpand={() => toggleStoryExpansion(story._id || story.id || '')}
              />
            ))
          ) : (
            <div className="text-center py-6 text-gray-500">
              {searchQuery || selectedCategory || selectedValue ? 
                'No stories match your filters.' : 
                'No stories available.'}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-3 bg-gray-50 border-t text-sm text-gray-500">
        Showing {filteredStories.length} of {stories.length} stories
      </div>
    </div>
  );
}
