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
  onDeleteStory
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
  const standardBusinessValues = businessValues.length 
    ? businessValues 
    : ['Critical', 'Important', 'Nice to Have'];

  // Ensure we have standard effort categories
  const standardEffortCategories = effortCategories.length
    ? effortCategories
    : ['Low', 'Medium', 'High'];

  // Handle creating a new story
  const handleCreateForm = () => {
    setShowCreateForm(true);
  };

  // Filter stories based on search and filters
  const filteredStories = localStories.filter(story => {
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

  // Sort stories by businessValue priority (Critical, Important, Nice to Have)
  const sortedStories = Array.from(filteredStories).sort((a, b) => {
    const priorityOrder: Record<string, number> = {
      'Critical': 0,
      'Important': 1,
      'Nice to Have': 2
    };
    
    const valueA = a.businessValue || 'Nice to Have';
    const valueB = b.businessValue || 'Nice to Have';
    
    return (priorityOrder[valueA] || 999) - (priorityOrder[valueB] || 999);
  });

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
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Product Backlog</h2>
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
      </div>
      
      {/* Search and Filter Section */}
      <div className="mb-4 space-y-2">
        <input
          type="text"
          placeholder="Search stories..."
          className="w-full p-2 border rounded"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
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
      </div>

      {/* Story List */}
      <div className="max-h-96 overflow-y-auto">
        <div className="p-4 space-y-3">
          {sortedStories.length > 0 ? (
            sortedStories.map((story) => (
              <div key={story._id} className="relative group">
                <StoryCard
                  story={story}
                  position={null}
                  isExpanded={externalExpandedStoryIds 
                    ? externalExpandedStoryIds.includes(story._id) 
                    : internalExpandedStoryIds.has(story._id)}
                  onToggleExpand={() => toggleStoryExpansion(story._id)}
                />
                
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
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
  );
}
