'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { BacklogViewer } from '@/components/BacklogViewer';
import { ValuesMatrix } from '@/components/ValuesMatrix';
import { Story } from '@/types';

// For user ID generation (simulate until real auth is implemented)
const generateUniqueId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Component to display when a project is not found
function ProjectNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white shadow-xl rounded-lg p-8 max-w-md w-full text-center">
        <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Project Not Found</h1>
        <p className="text-gray-600 mb-6">
          The shared project you're looking for doesn't exist or has been removed.
        </p>
        <a 
          href="/"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}

// Password protection modal
function PasswordProtection({ 
  projectId, 
  onSuccess, 
  onCancel 
}: { 
  projectId: Id<"sharedProjects">, 
  onSuccess: () => void, 
  onCancel: () => void 
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // TODO: Implement real password verification through Convex
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError('');
    
    // Simulating verification for now
    setTimeout(() => {
      if (password === 'demo') {  // TODO: Replace with real verification
        onSuccess();
      } else {
        setError('Incorrect password');
      }
      setIsVerifying(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-4">Password Protected</h2>
        <p className="text-gray-600 mb-4">
          This shared project is password-protected. Please enter the password to continue.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying || !password}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main shared project page component
export default function SharedProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  // Use React.use to unwrap the params promise in Next.js 15.2.3+
  const resolvedParams = React.use(params);
  const slug = resolvedParams.slug;
  
  // Initialize state values first
  const [userId] = useState(() => {
    // Generate or retrieve a unique user ID for tracking
    if (typeof window === 'undefined') return generateUniqueId();
    
    const storedId = localStorage.getItem('scopeUserId');
    const newId = storedId || generateUniqueId();
    if (!storedId) {
      localStorage.setItem('scopeUserId', newId);
    }
    return newId;
  });
  
  const [accessGranted, setAccessGranted] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Convex queries and mutations - consistent order regardless of project state
  const project = useQuery(api.sharedProjects.getProjectBySlug, { slug });
  const stories = useQuery(api.sharedProjects.getProjectStories, { 
    projectId: project?._id || '_invalid_' as Id<"sharedProjects"> 
  });
  const recordView = useMutation(api.sharedProjects.recordProjectView);
  const recordLeave = useMutation(api.sharedProjects.recordProjectLeave);
  const createStory = useMutation(api.sharedProjects.updateSharedStory);
  const updateStory = useMutation(api.sharedProjects.updateSharedStory);
  const deleteStory = useMutation(api.sharedProjects.deleteSharedStory);
  
  // Convert Convex stories to our application's Story type - do this conditionally after the hooks
  const convertedStories: Story[] = stories ? stories.map(s => ({
    _id: s._id.toString(),
    title: s.title,
    userStory: s.userStory || '',
    businessValue: s.businessValue || 'Important',
    category: s.category || 'Feature',
    points: s.points || 0,
    effortCategory: s.effortCategory || 'Medium',
    notes: s.notes || '',
  })) : [];
  
  // Record view when component mounts
  useEffect(() => {
    // Only run this effect if we have a valid project
    if (!project?._id) return;
    
    // Check if password protection is needed
    if (project.security?.isLocked && project.security?.hasPassword) {
      setShowPasswordModal(true);
    } else {
      setAccessGranted(true);
      recordView({ 
        projectId: project._id, 
        userId, 
        ipAddress: '127.0.0.1' // In a real app, you'd get the IP from a service
      });
    }
    
    // Clean up when component unmounts
    return () => {
      if (accessGranted && project._id) {
        recordLeave({ projectId: project._id, userId });
      }
    };
  }, [project, userId, accessGranted, recordView, recordLeave]);
  
  // Handlers for story CRUD operations
  const handleCreateStory = async (story: Story): Promise<Story | undefined> => {
    if (!project?._id) return undefined;
    
    try {
      const result = await createStory({
        projectId: project._id,
        story: {
          title: story.title,
          userStory: story.userStory || '',
          businessValue: story.businessValue || 'Important',
          category: story.category || 'Feature',
          points: story.points || 0,
          effortCategory: story.effortCategory || 'Medium',
          notes: story.notes || '',
        }
      });
      
      if (result.success && result.storyId) {
        // Return the created story with the new ID
        return {
          ...story,
          _id: result.storyId.toString(),
        };
      }
      return undefined;
    } catch (error) {
      console.error('Error creating story:', error);
      return undefined;
    }
  };
  
  const handleUpdateStory = async (story: Story) => {
    if (!project?._id || !story._id) return false;
    
    try {
      const result = await updateStory({
        projectId: project._id,
        storyId: story._id as unknown as Id<"sharedStories">,
        story: {
          title: story.title,
          userStory: story.userStory || '',
          businessValue: story.businessValue || 'Important',
          category: story.category || 'Feature',
          points: story.points || 0,
          effortCategory: story.effortCategory || 'Medium',
          notes: story.notes || '',
        }
      });
      
      return result.success;
    } catch (error) {
      console.error('Error updating story:', error);
      return false;
    }
  };
  
  const handleDeleteStory = async (storyId: string) => {
    if (!project?._id) return false;
    
    try {
      const result = await deleteStory({
        projectId: project._id,
        storyId: storyId as unknown as Id<"sharedStories">,
      });
      
      return result.success;
    } catch (error) {
      console.error('Error deleting story:', error);
      return false;
    }
  };
  
  // Wrappers to satisfy child component prop types
  const handleBacklogUpdateStory = async (storyId: string, story: Story): Promise<boolean> => {
    return handleUpdateStory(story);
  };

  const handleMatrixUpdateStory = async (vmStory: any): Promise<boolean> => {
    return handleUpdateStory(vmStory as Story);
  };
  
  // Handle password protection
  const handlePasswordSuccess = () => {
    setShowPasswordModal(false);
    setAccessGranted(true);
    
    if (project?._id) {
      recordView({ 
        projectId: project._id, 
        userId, 
        ipAddress: '127.0.0.1'
      });
    }
  };
  
  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    // Redirect to home or show limited view
  };
  
  // Show "loading" state while we wait for the project to load
  if (project === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-700">Loading shared project...</p>
        </div>
      </div>
    );
  }
  
  // Show "not found" state if the project doesn't exist
  if (project === null) {
    return <ProjectNotFound />;
  }
  
  // If password protection is required and not yet granted, show empty state
  if (showPasswordModal) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PasswordProtection 
          projectId={project._id} 
          onSuccess={handlePasswordSuccess} 
          onCancel={handlePasswordCancel} 
        />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
            {project.name || 'Shared Project'}
          </h1>
          <p className="text-center text-gray-600">
            This content is password protected.
          </p>
        </div>
      </div>
    );
  }
  
  // Main content view when access is granted
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">
                {project.name || 'Shared Project'}
              </h1>
              {project.description && (
                <p className="text-gray-600">{project.description}</p>
              )}
            </div>
            <a 
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return to Home
            </a>
          </div>
          
          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  This is a read-only view of the project. Changes made here won't affect the original project.
                </p>
              </div>
            </div>
          </div>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Story Backlog</h2>
            <BacklogViewer 
              stories={convertedStories} 
              onCreateStory={handleCreateStory}
              onUpdateStory={handleBacklogUpdateStory}
              onDeleteStory={handleDeleteStory}
            />
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Business Value Matrix</h2>
            <ValuesMatrix 
              stories={convertedStories}
              storyPositions={{}}
              onUpdateStory={handleMatrixUpdateStory}
              readOnly={true} // Shared view is read-only
            />
          </div>
        </div>
      </div>
    </div>
  );
}
