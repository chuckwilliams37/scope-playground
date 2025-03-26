import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Story } from '@/types';

type ShareProjectProps = {
  stories: Story[];
  businessValues: string[];
  categories: string[];
  effortCategories: string[];
  onClose: () => void;
};

export function ShareProject({ 
  stories, 
  businessValues, 
  categories,
  effortCategories,
  onClose 
}: ShareProjectProps) {
  const [projectName, setProjectName] = useState('My Project');
  const [projectDescription, setProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Convex mutations
  const createSharedProject = useMutation(api.sharedProjects.createSharedProject);
  const recordShare = useMutation(api.sharedProjects.recordProjectShare);
  
  // Calculate project points for pricing tier
  const totalPoints = stories.reduce((sum, story) => sum + (story.points || 0), 0);
  
  const getPricingTier = (points: number) => {
    if (points <= 10) return { tier: "free", price: 0, label: "FREE" };
    if (points <= 50) return { tier: "basic", price: 10, label: "$10" };
    if (points <= 100) return { tier: "premium", price: 50, label: "$50" };
    return { tier: "enterprise", price: 250, label: "$250" };
  };
  
  const pricingTier = getPricingTier(totalPoints);
  
  const handleCreateShare = async () => {
    setIsCreating(true);
    setErrorMessage('');
    
    try {
      // Format the stories for the API
      const formattedStories = stories.map(story => ({
        title: story.title,
        userStory: story.userStory || '',
        businessValue: story.businessValue || 'Important',
        category: story.category || 'Feature',
        points: story.points || 0,
        effortCategory: story.effortCategory || 'Medium',
        notes: story.notes || '',
      }));
      
      // Create the shared project
      const result = await createSharedProject({
        name: projectName,
        description: projectDescription,
        businessValues,
        categories,
        effortCategories,
        initialStories: formattedStories,
      });
      
      if (result && result.slug) {
        // Generate the share URL
        const shareUrl = `${window.location.origin}/shared/${result.slug}`;
        setShareUrl(shareUrl);
        
        // Record share in analytics if project ID is available
        if (result.projectId) {
          await recordShare({ projectId: result.projectId as Id<"sharedProjects"> });
        }
      } else {
        setErrorMessage('Failed to create shared project');
      }
    } catch (error) {
      console.error('Error creating shared project:', error);
      setErrorMessage('An error occurred while creating the shared project');
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2000);
    });
  };
  
  // Security warning based on pricing tier
  const getSecurityMessage = () => {
    if (pricingTier.tier === 'free') {
      return 'Free tier - Your project will be publicly accessible';
    }
    return `${pricingTier.label} - Add password protection and encryption`;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-2xl w-full">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Share Your Project</h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="p-6">
        {!shareUrl ? (
          <>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Create a shareable link to collaborate with your team in real-time.
                Your project contains <span className="font-bold">{totalPoints} points</span>.
              </p>
              
              <div className="bg-gray-100 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Pricing tier:</span>
                  <span className="font-bold">{pricingTier.label}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">{getSecurityMessage()}</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">
                  Project Name
                </label>
                <input
                  type="text"
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="projectDescription" className="block text-sm font-medium text-gray-700">
                  Description (optional)
                </label>
                <textarea
                  id="projectDescription"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
            
            {errorMessage && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
                {errorMessage}
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateShare}
                disabled={isCreating || !projectName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreating ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating link...
                  </span>
                ) : "Create Share Link"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Link Created Successfully</h3>
              <p className="mt-1 text-sm text-gray-500">
                Share this link with your team to collaborate on this project.
              </p>
            </div>
            
            <div className="relative">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="block w-full pr-12 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <button
                onClick={handleCopyToClipboard}
                className="absolute inset-y-0 right-0 px-3 flex items-center bg-gray-100 rounded-r-md border-l border-gray-300 hover:bg-gray-200"
                title="Copy to clipboard"
              >
                <svg className="h-5 w-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                </svg>
              </button>
            </div>
            
            {showCopiedMessage && (
              <div className="mt-2 text-sm text-green-600">
                Link copied to clipboard!
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
