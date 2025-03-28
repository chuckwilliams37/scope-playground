import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { Story, ConvexStory } from '@/types';

type BacklogCollection = {
  _id: Id<"storyCollections">;
  name: string;
  description?: string;
  stories: any[]; // Using any[] for stories from DB to avoid type conflicts
  createdAt: number;
  lastModified: number;
};

interface BacklogManagerProps {
  stories: Story[];
  onImport: (stories: Story[], positions?: Record<string, any>) => Promise<void>;
  onClearBacklog: () => void;
  onClose: () => void;
}

export function BacklogManager({ stories, onImport, onClearBacklog, onClose }: BacklogManagerProps) {
  const [activeTab, setActiveTab] = useState<'collections' | 'import' | 'export'>('collections');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [updatePositions, setUpdatePositions] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Convex queries and mutations
  const saveCollectionMutation = useMutation(api.storyCollections.saveStoryCollection);
  const deleteCollectionMutation = useMutation(api.storyCollections.deleteStoryCollection);
  const collections = useQuery(api.storyCollections.getStoryCollections) || [];

  const handleSaveCollection = async () => {
    if (!newCollectionName.trim()) {
      setError('Please provide a collection name');
      return;
    }
    
    try {
      const collectionId = await saveCollectionMutation({
        name: newCollectionName,
        description: newCollectionDesc,
        stories: stories
      });
      
      setNewCollectionName('');
      setNewCollectionDesc('');
      setSuccess(`Collection "${newCollectionName}" saved successfully`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error saving collection:', err);
      setError('Failed to save collection. Please try again.');
    }
  };
  
  const handleLoadCollection = async (collection: BacklogCollection) => {
    if (window.confirm(`Load collection "${collection.name}"? This will replace your current backlog.`)) {
      try {
        // Extract stories and their positions if available
        const stories = collection.stories as Story[];
        const positions: Record<string, any> = {};
        
        // Build positions map for any stories with position data
        stories.forEach(story => {
          if (story.matrixPosition) {
            positions[story._id] = story.matrixPosition;
          }
        });
        
        // Import the stories using the onImport callback
        await onImport(stories, positions);
        
        setSuccess(`Collection "${collection.name}" loaded successfully`);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } catch (err) {
        console.error('Error loading collection:', err);
        setError('Failed to load collection. Please try again.');
      }
    }
  };
  
  const handleDeleteCollection = async (collectionId: Id<"storyCollections">) => {
    const collectionToDelete = collections.find(c => c._id === collectionId);
    if (!collectionToDelete) return;
    
    if (window.confirm(`Delete collection "${collectionToDelete.name}"? This cannot be undone.`)) {
      try {
        await deleteCollectionMutation({ id: collectionId });
        setSuccess(`Collection "${collectionToDelete.name}" deleted successfully`);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } catch (err) {
        console.error('Error deleting collection:', err);
        setError('Failed to delete collection. Please try again.');
      }
    }
  };
  
  const handleClearBacklog = () => {
    if (window.confirm('Clear all stories from backlog? This cannot be undone.')) {
      onClearBacklog();
      setSuccess('Backlog cleared successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    }
  };
  
  const handleImport = () => {
    try {
      const jsonData = JSON.parse(importText);
      
      // Validate the JSON structure
      if (!jsonData.stories || !Array.isArray(jsonData.stories)) {
        setError('Invalid JSON format. Stories must be in an array under "stories" property.');
        return;
      }
      
      // Extract positions if present and if user wants to update them
      let positions: Record<string, any> | undefined = undefined;
      if (updatePositions) {
        positions = {};
        jsonData.stories.forEach((story: any) => {
          if (story.id && story.matrixPosition) {
            positions![story.id] = story.matrixPosition;
          }
        });
        
        // If no positions found, set to undefined
        if (Object.keys(positions).length === 0) {
          positions = undefined;
        }
      }
      
      // Import the stories
      onImport(jsonData.stories, positions);
      setImportText('');
      setSuccess(`Imported ${jsonData.stories.length} stories successfully`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error importing stories:', err);
      setError('Invalid JSON. Please check your input and try again.');
    }
  };
  
  const handleExport = () => {
    // Create the export JSON with current stories
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      stories: stories.map(story => ({
        ...story,
        // Add any additional export properties here
      }))
    };
    
    // Create and download the JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileName = `scope-stories-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    
    setSuccess('Stories exported successfully');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };
  
  const createShareableLink = () => {
    // Placeholder for future implementation of direct shareable links
    alert('Shareable links feature coming soon!');
  };

  const handleDeleteAllStories = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAllStories = () => {
    onClearBacklog();
    setShowDeleteConfirm(false);
    setSuccess("All stories have been deleted");
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };

  const cancelDeleteAllStories = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-auto relative z-50">
        {/* Header with close button */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-semibold">Backlog Manager</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          {/* Status messages */}
          {error && (
            <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.828 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{success}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Tabs */}
          <div className="border-b mb-6">
            <nav className="flex -mb-px space-x-8">
              <button
                onClick={() => setActiveTab('collections')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'collections'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Collections
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'import'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Import
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'export'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Export
              </button>
            </nav>
          </div>
          
          {/* Tab Content */}
          <div className="mt-6">
            {/* Collections Tab */}
            {activeTab === 'collections' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Story Collections</h3>
                  <button
                    onClick={handleClearBacklog}
                    className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                  >
                    Clear Backlog
                  </button>
                </div>
                
                {/* Save New Collection Form */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-medium mb-3">Save Current Backlog</h4>
                  <div className="grid gap-4">
                    <div>
                      <label htmlFor="collection-name" className="block text-sm font-medium text-gray-700 mb-1">
                        Collection Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="collection-name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        placeholder="My Project Backlog"
                      />
                    </div>
                    <div>
                      <label htmlFor="collection-desc" className="block text-sm font-medium text-gray-700 mb-1">
                        Description (optional)
                      </label>
                      <textarea
                        id="collection-desc"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={newCollectionDesc}
                        onChange={(e) => setNewCollectionDesc(e.target.value)}
                        placeholder="Brief description of this collection"
                        rows={2}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveCollection}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        disabled={!newCollectionName.trim()}
                      >
                        Save Collection
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Saved Collections List */}
                <div>
                  <h4 className="font-medium mb-3">Saved Collections</h4>
                  {collections.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No saved collections yet. Save your first collection above!
                    </div>
                  ) : (
                    <div className="divide-y">
                      {collections.map((collection) => (
                        <div key={collection._id} className="py-4">
                          <div className="flex justify-between">
                            <div>
                              <h5 className="font-medium text-gray-900">{collection.name}</h5>
                              {collection.description && (
                                <p className="text-sm text-gray-500 mt-1">{collection.description}</p>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                {collection.stories.length} stories • 
                                {new Date(collection.lastModified).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleLoadCollection(collection)}
                                className="px-3 py-1 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                              >
                                Load
                              </button>
                              <button
                                onClick={() => handleDeleteCollection(collection._id)}
                                className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Import Tab */}
            {activeTab === 'import' && (
              <div>
                <h3 className="text-lg font-medium mb-4">Import Stories</h3>
                
                <div className="mb-4">
                  <label htmlFor="import-json" className="block text-sm font-medium text-gray-700 mb-1">
                    Paste JSON below
                  </label>
                  <textarea
                    id="import-json"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder='{"stories": [{"title": "Example Story", "businessValue": "Important", ...}]}'
                    rows={10}
                  />
                </div>
                
                <div className="flex items-center mb-4">
                  <input
                    id="update-positions"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={updatePositions}
                    onChange={(e) => setUpdatePositions(e.target.checked)}
                  />
                  <label htmlFor="update-positions" className="ml-2 block text-sm text-gray-900">
                    Update matrix positions from import
                  </label>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleImport}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={!importText.trim()}
                  >
                    Import Stories
                  </button>
                </div>
                
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium mb-3">Sample JSON Format</h4>
                  <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-40">
{`{
  "stories": [
    {
      "id": "story-001",
      "title": "User Authentication",
      "userStory": "As a user, I want to log in securely.",
      "points": 5,
      "businessValue": "Critical",
      "category": "Security",
      "matrixPosition": {
        "value": "high",
        "effort": "medium"
      }
    }
  ]
}`}
                  </pre>
                </div>
              </div>
            )}
            
            {/* Export Tab */}
            {activeTab === 'export' && (
              <div>
                <h3 className="text-lg font-medium mb-4">Export Options</h3>
                
                <div className="space-y-4">
                  <div className="bg-white border rounded-lg p-4 hover:shadow-md transition">
                    <h4 className="font-medium mb-2">Export to JSON</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Export all stories to a JSON file that can be imported later or shared with others.
                    </p>
                    <button
                      onClick={handleExport}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Export JSON
                    </button>
                  </div>
                  
                  <div className="bg-white border rounded-lg p-4 hover:shadow-md transition">
                    <h4 className="font-medium mb-2">Create Shareable Link</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Generate a URL that others can use to view your backlog online.
                    </p>
                    <button
                      onClick={createShareableLink}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Create Shareable Link
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-10 space-y-6">
          <div className="flex flex-col space-y-2">
            <h3 className="font-semibold text-red-600">Danger Zone</h3>
            <div className="p-4 border border-red-300 rounded-lg bg-red-50">
              <h4 className="font-medium text-red-800 mb-2">Delete All Stories</h4>
              <p className="text-sm text-red-600 mb-3">
                This will permanently delete all stories from your backlog. This action cannot be undone.
              </p>
              <button
                onClick={handleDeleteAllStories}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete All Stories
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Delete All Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete All Stories</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete ALL stories? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeleteAllStories}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAllStories}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
