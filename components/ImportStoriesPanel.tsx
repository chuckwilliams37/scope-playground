import React, { useState, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

type ImportStoriesPanelProps = {
  onImportComplete: (importedStories: number) => void;
  onClose: () => void;
};

export function ImportStoriesPanel({ onImportComplete, onClose }: ImportStoriesPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileSelected, setFileSelected] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Convex mutation for importing stories
  const importStories = useMutation(api.stories.importStories);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFileSelected(false);
      setPreview(null);
      return;
    }
    
    setFileSelected(true);
    setError(null);
    
    // Parse and preview the file
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const jsonData = JSON.parse(content);
        
        // Validate the JSON structure
        if (!jsonData.stories || !Array.isArray(jsonData.stories)) {
          throw new Error('Invalid file format. The file must contain a "stories" array.');
        }
        
        // Show a preview of the first few stories
        setPreview(jsonData.stories.slice(0, 3));
      } catch (err) {
        setError(`Error parsing file: ${err instanceof Error ? err.message : String(err)}`);
        setFileSelected(false);
      }
    };
    
    reader.onerror = () => {
      setError('Error reading file');
      setFileSelected(false);
    };
    
    reader.readAsText(file);
  };
  
  const handleImport = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      setError('Please select a file');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const file = fileInputRef.current.files[0];
      const content = await file.text();
      const jsonData = JSON.parse(content);
      
      // Import stories via Convex
      const result = await importStories({ 
        stories: jsonData.stories.map((story: any) => ({
          id: story.id,
          title: story.title,
          userStory: story.userStory || '',
          businessValue: story.businessValue,
          category: story.category || 'Imported',
          points: story.points || story.storyPoints || 0,
          isPublic: story.isPublic !== undefined ? story.isPublic : true,
          sharedWithClients: story.sharedWithClients || []
        }))
      });
      
      // Report success
      onImportComplete(result.length);
      onClose();
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Import Stories</h2>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-2">
          Import user stories from a JSON file. The file should contain a "stories" array with story objects.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Each story should have: id, title, userStory, points, businessValue, and category fields.
        </p>
        
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
              </svg>
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">JSON files only</p>
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept=".json" 
              onChange={handleFileChange}
            />
          </label>
        </div>
      </div>
      
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          {error}
        </div>
      )}
      
      {preview && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Preview</h3>
          <div className="border rounded-lg p-4 bg-gray-50 overflow-auto max-h-60">
            <pre className="text-xs">{JSON.stringify(preview, null, 2)}</pre>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Showing preview of first 3 stories (out of {preview.length}).
          </p>
        </div>
      )}
      
      <div className="flex justify-end space-x-2">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleImport}
          disabled={!fileSelected || isLoading}
          className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
            !fileSelected || isLoading
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Importing...' : 'Import Stories'}
        </button>
      </div>
    </div>
  );
}
