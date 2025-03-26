import React, { useState, useEffect } from 'react';
import { StoryCard } from './StoryCard';
import { StoryForm } from './StoryForm';

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
  effortCategory?: string;
};

type BacklogViewerProps = {
  stories: Story[];
  categoryFilter?: string;
  valueFilter?: string;
  pointsFilter?: number;
  expandedStoryIds?: string[];
  onToggleExpandStory?: (storyId: string) => void;
  onCreateStory?: (story: Story) => Promise<Story | undefined>;
  onUpdateStory?: (storyId: string, story: Story) => Promise<boolean>;
  onDeleteStory?: (storyId: string) => Promise<boolean>;
};

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
      const newStory = { ...story, id: newId };
      setLocalStories(prev => [...prev, newStory]);
      setShowCreateForm(false);
    }
  };

  // Handle story update
  const handleUpdateStory = async (story: Story) => {
    const storyId = story._id || story.id;
    if (!storyId) return;
    
    if (onUpdateStory) {
      setIsLoading(true);
      try {
        const success = await onUpdateStory(storyId as string, story);
        if (success) {
          setLocalStories(prev => 
            prev.map(s => (s._id === storyId || s.id === storyId) ? story : s)
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
        prev.map(s => (s._id === storyId || s.id === storyId) ? story : s)
      );
      setEditingStory(null);
    }
  };

  // Handle story deletion
  const handleDeleteStory = async () => {
    if (!deletingStory) return;
    
    const storyId = deletingStory._id || deletingStory.id;
    if (!storyId) return;
    
    if (onDeleteStory) {
      setIsLoading(true);
      try {
        const success = await onDeleteStory(storyId as string);
        if (success) {
          setLocalStories(prev => 
            prev.filter(s => s._id !== storyId && s.id !== storyId)
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
        prev.filter(s => s._id !== storyId && s.id !== storyId)
      );
      setDeletingStory(null);
    }
  };

  // Generate next story ID
  const getNextStoryId = () => {
    const storyIds = localStories
      .map(s => {
        const id = s.id || '';
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
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Story Backlog</h2>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Story
          </button>
        </div>
        
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
      
      {/* Story Creation Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl">
            <StoryForm
              onSave={(story) => handleCreateStory({ ...story, id: getNextStoryId() })}
              onCancel={() => setShowCreateForm(false)}
              categories={categories}
              businessValues={businessValues.length ? businessValues : ['Critical', 'Important', 'Nice to Have']}
              effortCategories={effortCategories.length ? effortCategories : ['Core Functionality', 'Development', 'Security', 'UI/UX']}
            />
          </div>
        </div>
      )}
      
      {/* Story Edit Form */}
      {editingStory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl">
            <StoryForm
              story={editingStory}
              onSave={handleUpdateStory}
              onCancel={() => setEditingStory(null)}
              categories={categories}
              businessValues={businessValues.length ? businessValues : ['Critical', 'Important', 'Nice to Have']}
              effortCategories={effortCategories.length ? effortCategories : ['Core Functionality', 'Development', 'Security', 'UI/UX']}
            />
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {deletingStory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Story</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete "{deletingStory.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeletingStory(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStory}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Processing...</p>
          </div>
        </div>
      )}
      
      <div className="overflow-y-auto max-h-[600px]">
        <div className="p-4 space-y-3">
          {sortedStories.length > 0 ? (
            sortedStories.map((story) => (
              <div key={story._id || story.id} className="relative group">
                <StoryCard
                  story={story}
                  position={null}
                  isExpanded={externalExpandedStoryIds 
                    ? externalExpandedStoryIds.includes(story._id || story.id || '') 
                    : internalExpandedStoryIds.has(story._id || story.id || '')}
                  onToggleExpand={() => toggleStoryExpansion(story._id || story.id || '')}
                />
                
                {/* Edit and Delete buttons */}
                <div className="absolute -top-2 -right-2 flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setEditingStory(story)}
                    className="p-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 mr-1"
                    title="Edit story"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => setDeletingStory(story)}
                    className="p-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                    title="Delete story"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
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
        Showing {filteredStories.length} of {localStories.length} stories
      </div>
    </div>
  );
}
