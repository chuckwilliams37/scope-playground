import React, { useState, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

type ImportStoriesPanelProps = {
  onImportComplete: (importedStories: number, positions?: Record<string, any>) => void;
  onClose: () => void;
};

export function ImportStoriesPanel({ onImportComplete, onClose }: ImportStoriesPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileSelected, setFileSelected] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [updatePositions, setUpdatePositions] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Convex mutation for importing stories
  const importStories = useMutation(api.stories.importStories);
  
  // Sample JSON structure for import
  const sampleJSON = {
    "stories": [
      {
        "id": "sample-001",
        "title": "User Authentication",
        "userStory": "As a user, I want to create an account and log in securely.",
        "points": 5,
        "businessValue": "Critical",
        "category": "Security",
        "position": {
          "value": "Critical",
          "effort": "Medium",
          "rank": 1
        },
        "acceptanceCriteria": [
          "The user can create an account and log in securely.",
          "The user can log out securely."
        ]
      },
      {
        "id": "sample-002",
        "title": "Dashboard View",
        "userStory": "As a user, I want a dashboard that shows me key metrics and information at a glance.",
        "points": 8,
        "businessValue": "Important",
        "category": "UI/UX",
        "position": {
          "value": "Important",
          "effort": "High",
          "rank": 2
        },
        "acceptanceCriteria": [
          "The user can view a dashboard with key metrics and information at a glance.",
          "The user can view a dashboard with key metrics and information at a glance."
        ]
      },
      {
        "id": "sample-003",
        "title": "Export to PDF",
        "userStory": "As a user, I want to export reports to PDF format.",
        "points": 3,
        "businessValue": "Nice to Have",
        "category": "Reporting",
        "position": {
          "value": "Nice to Have",
          "effort": "Low",
          "rank": 3
        },
        "acceptanceCriteria": [
          "The user can export reports to PDF format.",
          "The user can export reports to PDF format."
        ]
      }
    ]
  };
  
  // Function to copy sample JSON to clipboard
  const handleCopySample = () => {
    navigator.clipboard.writeText(JSON.stringify(sampleJSON, null, 2))
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        setError('Failed to copy sample to clipboard');
      });
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFileSelected(false);
      setPreview(null);
      return;
    }
    
    setFileSelected(true);
    setError(null);
    setImportResults(null);
    
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
      
      // Import stories via Convex without the updatePositions parameter
      const result = await importStories({ 
        stories: jsonData.stories.map((story: any) => ({
          id: story.id,
          title: story.title,
          userStory: story.userStory || '',
          businessValue: story.businessValue,
          category: story.category || 'Imported',
          points: story.points || story.storyPoints || 0,
          isPublic: story.isPublic !== undefined ? story.isPublic : true,
          sharedWithClients: story.sharedWithClients || [],
          notes: story.notes || '',
          acceptanceCriteria: story.acceptanceCriteria || [],
          position: story.position ? {
            value: story.position.value,
            effort: story.position.effort,
            rank: story.position.rank || 0
          } : undefined
        }))
      });
      
      // Show results
      setImportResults(result);
      
      // If there are no errors, report success and close
      if (!result.errors || result.errors.length === 0) {
        onImportComplete(result.success, result.positions);
        setTimeout(() => onClose(), 2000);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  };
  
  // Define result type
  type ImportResult = {
    success: number;
    duplicates?: number; 
    errors?: string[];
    storyIds?: string[];
    positions?: Record<string, { value: string, effort: string, rank?: number }>;
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
          For matrix positioning, include a "position" object with "value", "effort", and optional "rank" fields.
        </p>
        
        <div className="mb-4">
          <button
            onClick={handleCopySample}
            className="px-3 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition duration-150 inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            {copySuccess ? 'Copied!' : 'Copy JSON Example'}
          </button>
          <span className="text-xs text-gray-500 ml-2">Click to copy a sample JSON format to your clipboard</span>
        </div>
        
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
        
        <div className="mt-4">
          <label className="inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={updatePositions} 
              onChange={() => setUpdatePositions(!updatePositions)}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ms-3 text-sm font-medium text-gray-900">Update matrix positions from import</span>
          </label>
        </div>
      </div>
      
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          {error}
        </div>
      )}
      
      {importResults && (
        <div className="mt-4">
          <div className="text-lg font-medium">Import Results</div>
          <div className="bg-green-50 border border-green-200 rounded-md p-2 mt-2">
            <div className="text-green-700">Successfully imported {importResults.success} stories</div>
            {importResults.duplicates && importResults.duplicates > 0 && (
              <div className="text-amber-700 mt-1">Skipped {importResults.duplicates} duplicate stories</div>
            )}
          </div>
          
          {importResults.errors && importResults.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-2 mt-2">
              <div className="text-red-700 font-medium">Errors:</div>
              <ul className="list-disc list-inside text-sm text-red-600 mt-1">
                {importResults.errors.map((error: string, i: number) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {preview && !importResults && (
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
