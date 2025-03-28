import React, { useState, useEffect } from 'react';
import { StoryCard } from './StoryCard';
import { StoryForm } from './StoryForm';
import { Story, BacklogViewerProps } from '@/types';

export function BacklogViewer({ 
  stories, 
  categoryFilter, 
  valueFilter, 
  pointsFilter,
  expandedStoryIds: externalExpandedStoryIds,
  onToggleExpandStory,
  onCreateStory,
  onUpdateStory,
  onDeleteStory,
  onAssignAllToDefaultCells,
  onClearBacklog
}: BacklogViewerProps) {
  // Local state for expanded stories when not provided externally
  const [internalExpandedStoryIds, setInternalExpandedStoryIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(categoryFilter);
  const [selectedValue, setSelectedValue] = useState<string | undefined>(valueFilter);
  
  // State for story management
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [deletingStory, setDeletingStory] = useState<Story | null>(null);
  const [localStories, setLocalStories] = useState<Story[]>(stories);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for multi-select and multi-sort
  const [selectedStoryIds, setSelectedStoryIds] = useState<Set<string>>(new Set());
  const [sortCriteria, setSortCriteria] = useState<Array<{field: string, order: 'asc' | 'desc', priority: number}>>([
    { field: 'businessValue', order: 'desc', priority: 1 }
  ]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  
  // Update local stories when prop changes
  useEffect(() => {
    setLocalStories(stories);
  }, [stories]);

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
      localStories
        .map(story => story.category)
        .filter((category): category is string => Boolean(category))
    )
  );
  
  // Extract all unique business values from stories
  const businessValues = Array.from(
    new Set(
      localStories
        .map(story => story.businessValue)
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => {
    // Sort in order of importance: Critical > Important > Nice to Have
    const priority: Record<string, number> = {
      'Critical': 0,
      'Important': 1,
      'Nice to Have': 2
    };
    return (priority[a] ?? 999) - (priority[b] ?? 999);
  });
  
  // Extract all unique effort categories from stories
  const effortCategories = Array.from(
    new Set(
      localStories
        .map(story => story.effortCategory)
        .filter((category): category is string => Boolean(category))
    )
  );
  
  // Ensure we're using the standardized business values
  const standardBusinessValues = ['Critical', 'Important', 'Nice to Have'];

  // Ensure we have standard effort categories
  const standardEffortCategories = effortCategories.length
    ? effortCategories
    : ['Low', 'Medium', 'High'];

  // Handle creating a new story
  const handleCreateForm = () => {
    setShowCreateForm(true);
  };

  // Filter stories based on search query and selected filters
  const filteredStories = localStories.filter(story => {
    const titleMatch = story.title.toLowerCase().includes(searchQuery.toLowerCase());
    const userStoryMatch = story.userStory?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const categoryMatch = !selectedCategory || story.category === selectedCategory;
    const valueMatch = !selectedValue || story.businessValue === selectedValue;
    
    return (titleMatch || userStoryMatch) && categoryMatch && valueMatch;
  });
  
  // Sort stories based on selected sort criteria
  const sortedStories = [...filteredStories].sort((a, b) => {
    // Apply each sort criterion in order of priority
    for (const criterion of sortCriteria) {
      let comparison = 0;
      
      switch (criterion.field) {
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'businessValue':
          // Define business value priority based on standardized terminology
          const valuePriority: Record<string, number> = {
            'Critical': 3,   // Highest value
            'Important': 2,  // Medium value
            'Nice to Have': 1, // Lowest value
            '': 0
          };
          comparison = (valuePriority[a.businessValue || ''] || 0) - (valuePriority[b.businessValue || ''] || 0);
          break;
        case 'points':
          comparison = (a.storyPoints || a.points || 0) - (b.storyPoints || b.points || 0);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        default:
          comparison = 0;
      }
      
      if (comparison !== 0) {
        return criterion.order === 'asc' ? comparison : -comparison;
      }
    }
    
    // If all criteria are equal, sort by title as a fallback
    return (a.title || '').localeCompare(b.title || '');
  });

  // Toggle item selection (enhanced)
  const toggleStorySelection = (storyId: string, isShiftClick = false, event?: React.MouseEvent) => {
    // Prevent text selection when shift-clicking
    if (isShiftClick && event) {
      event.preventDefault();
    }
    
    // Modify selection behavior to not deselect others by default
    setSelectedStoryIds(prev => {
      const newSelection = new Set(prev);
      
      if (isShiftClick && lastSelectedId && storyId !== lastSelectedId) {
        // Range selection: select all stories between last selected and current
        const allIds = sortedStories.map(s => s._id);
        const currentIndex = allIds.indexOf(storyId);
        const lastIndex = allIds.indexOf(lastSelectedId);
        
        if (currentIndex >= 0 && lastIndex >= 0) {
          // Determine the range (regardless of direction)
          const startIdx = Math.min(currentIndex, lastIndex);
          const endIdx = Math.max(currentIndex, lastIndex);
          
          // Select all stories in the range
          for (let i = startIdx; i <= endIdx; i++) {
            if (allIds[i]) {
              newSelection.add(allIds[i]);
            }
          }
        }
      } else {
        // Toggle this individual story's selection
        if (newSelection.has(storyId)) {
          newSelection.delete(storyId);
        } else {
          newSelection.add(storyId);
        }
      }
      
      // Update the last selected ID
      setLastSelectedId(storyId);
      
      return newSelection;
    });
  };

  // Function to toggle selection of all stories
  const toggleSelectAll = () => {
    setSelectedStoryIds(prev => {
      // If all are selected, clear the selection
      if (prev.size === sortedStories.length) {
        return new Set();
      } 
      // Otherwise, select all stories
      else {
        return new Set(sortedStories.map(s => s._id));
      }
    });
  };

  // Determine if all stories are selected
  const allStoriesSelected = selectedStoryIds.size === sortedStories.length && sortedStories.length > 0;

  // Handle sorting click with multi-sort support
  const handleSortClick = (field: string, event: React.MouseEvent) => {
    const isShiftClick = event.shiftKey;
    
    setSortCriteria(prev => {
      // Check if this field is already in the sort criteria
      const existingIndex = prev.findIndex(c => c.field === field);
      
      if (existingIndex >= 0) {
        // Field exists, toggle order or remove if shift is not pressed
        const newCriteria = [...prev];
        
        if (isShiftClick) {
          // Toggle order for existing criterion
          newCriteria[existingIndex] = {
            ...newCriteria[existingIndex],
            order: newCriteria[existingIndex].order === 'asc' ? 'desc' : 'asc'
          };
        } else {
          // Remove all other criteria and just use this one
          return [{
            field, 
            order: prev[existingIndex].order === 'asc' ? 'desc' : 'asc', 
            priority: 1
          }];
        }
        
        return newCriteria;
      } else {
        // Field doesn't exist in criteria
        if (isShiftClick) {
          // Add as additional criterion with next priority
          const nextPriority = prev.length + 1;
          return [...prev, { field, order: 'desc', priority: nextPriority }];
        } else {
          // Replace all criteria with just this one
          return [{ field, order: 'desc', priority: 1 }];
        }
      }
    });
  };

  // Generate sort badge content with more visible priority indicators
  const getSortBadge = (field: string) => {
    const criterion = sortCriteria.find(c => c.field === field);
    
    if (!criterion) return null;
    
    const direction = criterion.order === 'desc' ? '↓' : '↑';
    
    // Only show priority number if there are multiple sort criteria
    if (sortCriteria.length > 1) {
      // Return priority number in a circle badge followed by direction arrow
      return (
        <span className="inline-flex items-center">
          <span className="inline-flex items-center justify-center w-4 h-4 bg-blue-600 text-white text-xs rounded-full mr-0.5">
            {criterion.priority}
          </span>
          {direction}
        </span>
      );
    }
    
    // Just show direction if only one sort criterion
    return direction;
  };

  // Handle story creation
  const handleCreateStory = async (story: Story) => {
    if (onCreateStory) {
      setIsLoading(true);
      try {
        const newStory = await onCreateStory(story);
        if (newStory) {
          setLocalStories(prev => [...prev, newStory]);
        }
      } catch (error) {
        console.error("Failed to create story:", error);
      } finally {
        setIsLoading(false);
        setShowCreateForm(false);
      }
    } else {
      // Generate a unique ID if we're not using backend
      const newId = `story-${Math.floor(Math.random() * 10000)}`;
      const newStory = { ...story, _id: newId };
      setLocalStories(prev => [...prev, newStory]);
      setShowCreateForm(false);
    }
  };

  // Handle story update
  const handleUpdateStory = async (story: Story) => {
    const storyId = story._id;
    if (!storyId) return;
    
    if (onUpdateStory) {
      setIsLoading(true);
      try {
        const success = await onUpdateStory(storyId, story);
        if (success) {
          setLocalStories(prev => 
            prev.map(s => (s._id === storyId) ? story : s)
          );
        }
      } catch (error) {
        console.error("Failed to update story:", error);
      } finally {
        setIsLoading(false);
        setEditingStory(null);
      }
    } else {
      // Just update local state if no backend handler
      setLocalStories(prev => 
        prev.map(s => (s._id === storyId) ? story : s)
      );
      setEditingStory(null);
    }
  };

  // Handle story deletion
  const handleDeleteStory = async () => {
    if (!deletingStory) return;
    
    const storyId = deletingStory._id;
    if (!storyId) return;
    
    if (onDeleteStory) {
      setIsLoading(true);
      try {
        const success = await onDeleteStory(storyId);
        if (success) {
          setLocalStories(prev => 
            prev.filter(s => s._id !== storyId)
          );
        }
      } catch (error) {
        console.error("Failed to delete story:", error);
      } finally {
        setIsLoading(false);
        setDeletingStory(null);
      }
    } else {
      // Just update local state if no backend handler
      setLocalStories(prev => 
        prev.filter(s => s._id !== storyId)
      );
      setDeletingStory(null);
    }
  };

  // Generate next story ID
  const getNextStoryId = () => {
    const storyIds = localStories
      .map(s => {
        const id = s._id || '';
        if (id.startsWith('story-')) {
          return parseInt(id.replace('story-', ''), 10);
        }
        return 0;
      })
      .filter(id => !isNaN(id));
    
    const maxId = Math.max(...storyIds, 0);
    return `story-${String(maxId + 1).padStart(3, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Product Backlog</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleCreateForm}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="inline-block animate-spin mr-2">⟳</span>
            ) : (
              <span className="mr-1">+</span>
            )}
            Add Story
          </button>
          <div className="relative">
            <button
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center"
              title="Show menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.533 1.533 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 01.947-2.287c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Tools
            </button>
            
            {showToolsMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <button
                    onClick={() => {
                      setShowCreateForm(true);
                      setShowToolsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    role="menuitem"
                  >
                    Create New Story
                  </button>
                  <button
                    onClick={() => {
                      setShowToolsMenu(false);
                      if (confirm('Are you sure you want to delete all stories from the backlog? This cannot be undone. (Stories in saved scenarios will be preserved.)')) {
                        onClearBacklog && onClearBacklog();
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                    role="menuitem"
                  >
                    Delete All Stories
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Search and Filter Section */}
      <div className="mb-4 space-y-2">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Search stories..."
            className="flex-1 p-2 border rounded"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <button
            onClick={() => {
              if (onAssignAllToDefaultCells) {
                // Get the stories to assign (either selected or all)
                const storiesToAssign = selectedStoryIds.size > 0 
                  ? sortedStories.filter(story => selectedStoryIds.has(story._id))
                  : sortedStories;
                
                // Assign the stories
                onAssignAllToDefaultCells(storiesToAssign);
                
                // Clear selection after assigning
                setSelectedStoryIds(new Set());
              }
            }}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center whitespace-nowrap"
            title={selectedStoryIds.size > 0 
              ? "Assign selected stories to their default matrix positions based on business value and story points" 
              : "Assign all stories to their default matrix positions based on business value and story points"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M3 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            {selectedStoryIds.size > 0 ? `Assign Selected (${selectedStoryIds.size})` : 'Assign All'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {/* Category filter */}
          <select
            className="p-2 border rounded"
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || undefined)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          {/* Business Value filter */}
          <select
            className="p-2 border rounded"
            value={selectedValue || ''}
            onChange={(e) => setSelectedValue(e.target.value || undefined)}
          >
            <option value="">All Business Values</option>
            {standardBusinessValues.map((val) => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </div>
        
        {/* Sorting options */}
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-600">Sort by:</span>
          <div className="flex flex-wrap gap-1">
            <button 
              onClick={(e) => handleSortClick('businessValue', e)}
              className={`px-2 py-1 rounded text-xs flex items-center ${
                sortCriteria.some(c => c.field === 'businessValue')
                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                  : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}
            >
              <span className="mr-1">Criticality</span> {getSortBadge('businessValue')}
            </button>
            <button 
              onClick={(e) => handleSortClick('points', e)}
              className={`px-2 py-1 rounded text-xs flex items-center ${
                sortCriteria.some(c => c.field === 'points')
                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                  : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}
            >
              <span className="mr-1">Points</span> {getSortBadge('points')}
            </button>
            <button 
              onClick={(e) => handleSortClick('title', e)}
              className={`px-2 py-1 rounded text-xs flex items-center ${
                sortCriteria.some(c => c.field === 'title')
                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                  : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}
            >
              <span className="mr-1">Name</span> {getSortBadge('title')}
            </button>
            <button 
              onClick={(e) => handleSortClick('category', e)}
              className={`px-2 py-1 rounded text-xs flex items-center ${
                sortCriteria.some(c => c.field === 'category')
                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                  : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}
            >
              <span className="mr-1">Category</span> {getSortBadge('category')}
            </button>
          </div>
        </div>
      </div>

      {/* Product Backlog Stories Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="mb-2 border-b border-gray-200 pb-2">
          <h3 className="text-lg font-medium text-gray-800">Product Backlog</h3>
          <div className="text-sm text-gray-500">{`${sortedStories.length} ${sortedStories.length === 1 ? 'story' : 'stories'}`}</div>
        </div>

        {/* Select All checkbox header */}
        <div className="flex items-center border-b border-gray-200 py-2 px-1">
          <div 
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center cursor-pointer"
            onClick={toggleSelectAll}
          >
            <div className={`w-6 h-6 rounded transition-all flex items-center justify-center ${
              allStoriesSelected 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'border-2 border-gray-400 bg-white hover:border-blue-500'
            }`}>
              {allStoriesSelected ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-transparent hover:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          
          <div className="ml-2 text-sm font-medium text-gray-700">
            {allStoriesSelected ? "Deselect All" : "Select All"}
          </div>
          
          {selectedStoryIds.size > 0 && selectedStoryIds.size < sortedStories.length && (
            <div className="ml-auto text-xs text-gray-500">
              {`${selectedStoryIds.size} of ${sortedStories.length} selected`}
            </div>
          )}
        </div>
        
        {/* Stories list */}
        <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(100vh - 250px)' }}>
          <div className="p-4 space-y-3">
            {sortedStories.length > 0 ? (
              sortedStories.map((story) => (
                <div key={story._id} className="relative group">
                  <div className="flex items-start space-x-2">
                    {/* Enhanced checkbox for selection with larger hit area */}
                    <div 
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStorySelection(story._id, e.shiftKey, e);
                      }}
                    >
                      <div className={`w-5 h-5 rounded transition-all flex items-center justify-center ${
                        selectedStoryIds.has(story._id) 
                          ? 'bg-blue-500 border-blue-500 text-white' 
                          : 'border-2 border-gray-300 bg-white hover:border-blue-400'
                      }`}>
                        {selectedStoryIds.has(story._id) ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 text-transparent hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-grow">
                      <StoryCard
                        story={story}
                        position={null}
                        isExpanded={externalExpandedStoryIds 
                          ? externalExpandedStoryIds.includes(story._id) 
                          : internalExpandedStoryIds.has(story._id)}
                        onToggleExpand={() => toggleStoryExpansion(story._id)}
                      />
                    </div>
                  </div>
                  
                  {/* Edit and Delete buttons */}
                  <div className="absolute top-3 right-12 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingStory(story)}
                      className="p-1 bg-blue-100 rounded hover:bg-blue-200 text-blue-700"
                      title="Edit story"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeletingStory(story)}
                      className="p-1 bg-red-100 rounded hover:bg-red-200 text-red-700"
                      title="Delete story"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                {searchQuery || selectedCategory || selectedValue
                  ? "No stories match your search criteria"
                  : "No stories in the backlog yet. Add your first story!"}
              </div>
            )}
          </div>
        </div>
        
        {/* Create Story Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="w-full max-w-2xl">
              <StoryForm
                onSave={(formStory) => handleCreateStory({ ...formStory, _id: formStory._id || getNextStoryId() })}
                onCancel={() => setShowCreateForm(false)}
                categories={categories}
                businessValues={standardBusinessValues}
                effortCategories={standardEffortCategories}
              />
            </div>
          </div>
        )}
        
        {/* Edit Story Modal */}
        {editingStory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="w-full max-w-2xl">
              <StoryForm
                story={editingStory}
                onSave={handleUpdateStory}
                onCancel={() => setEditingStory(null)}
                categories={categories}
                businessValues={standardBusinessValues}
                effortCategories={standardEffortCategories}
              />
            </div>
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {deletingStory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[1000] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Story</h3>
              <p className="text-gray-500 mb-4">
                Are you sure you want to delete "{deletingStory.title}"? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeletingStory(null)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteStory}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
