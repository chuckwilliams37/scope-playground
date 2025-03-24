'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ValuesMatrix } from '../../../components/ValuesMatrix';
import { MetricsPanel } from '../../../components/MetricsPanel';
import { calculateMetrics } from '../../../lib/metricsUtils';

interface Story {
  _id: string;
  title: string;
  userStory: string;
  points: number;
  storyPoints?: number;
  businessValue: string;
  category?: string;
}

export default function SharedScenarioPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  
  const [stories, setStories] = useState<Story[]>([]);
  const [storyPositions, setStoryPositions] = useState<Record<string, any>>({});
  
  // Get the shared scenario by its shareId
  const scenario = useQuery(api.scenarios.getSharedScenario, { shareId });
  const allStories = useQuery(api.stories.listAccessibleStories, { clientId: "shared" });
  
  useEffect(() => {
    if (scenario && scenario.storyPositions) {
      try {
        const positions = JSON.parse(scenario.storyPositions);
        setStoryPositions(positions);
      } catch (error) {
        console.error('Error parsing story positions:', error);
      }
    }
  }, [scenario]);
  
  useEffect(() => {
    if (scenario && allStories) {
      // Find all stories that are in the storyPositions
      const positionedStoryIds = Object.keys(storyPositions);
      const scenarioStories = allStories.filter(
        (story: Story) => positionedStoryIds.includes(story._id.toString())
      );
      setStories(scenarioStories);
    }
  }, [scenario, allStories, storyPositions]);
  
  // Convert metrics to the correct format
  const metricsObj = scenario ? calculateMetrics(stories, storyPositions, scenario.settings) : null;
  
  const metrics = metricsObj ? {
    totalStories: stories.length,
    totalPoints: metricsObj.totalPoints,
    rawEffort: metricsObj.totalHours,
    adjustedEffort: metricsObj.totalHours,
    totalDays: metricsObj.workingDays,
    totalCost: metricsObj.estimatedCost,
    scopeLimits: {
      overPoints: false,
      overHours: false,
      overDuration: false
    },
    aiProductivityGain: 0,
    selfManagedPartnerDiscount: metricsObj.partnerDiscount || 0
  } : null;
  
  const animatedMetrics = metrics ? {
    totalStories: metrics.totalStories,
    totalPoints: metrics.totalPoints,
    adjustedEffort: metrics.adjustedEffort,
    totalDays: metrics.totalDays,
    totalCost: metrics.totalCost
  } : {
    totalStories: 0,
    totalPoints: 0,
    adjustedEffort: 0,
    totalDays: 0,
    totalCost: 0
  };
  
  const metricsChanging = {
    totalStories: false,
    totalPoints: false,
    adjustedEffort: false,
    totalDays: false,
    totalCost: false
  };
  
  if (!scenario) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <svg 
            className="w-16 h-16 mx-auto text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="text-xl font-bold mt-4 text-gray-800">Scenario Not Found</h1>
          <p className="mt-2 text-gray-600">
            The shared scenario you're looking for doesn't exist or has been removed.
          </p>
          <a 
            href="/"
            className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{scenario.name}</h1>
              <p className="text-gray-600 mt-1">{scenario.description}</p>
            </div>
            <div className="text-sm text-gray-500">
              <p>Shared view (read-only)</p>
              <p>Last updated: {new Date(scenario.lastModified).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ValuesMatrix 
                getStoriesInCell={() => []}
                totalPoints={metrics?.totalPoints || 0}
                totalEffort={metrics?.adjustedEffort || 0}
                expandedStoryIds={new Set()}
                toggleStoryExpansion={() => {}}
                renderPositionedStories={() => <></>}
              />
            </div>
            <div>
              {metrics && (
                <MetricsPanel 
                  metrics={metrics}
                  animatedMetrics={animatedMetrics}
                  metricsChanging={metricsChanging}
                  settings={scenario.settings}
                  onImportStoriesClick={() => {}}
                  readOnly={true}
                />
              )}
              <div className="mt-6">
                <div className="border p-4 rounded-lg shadow-sm">
                  <h3 className="text-lg font-semibold mb-3">Stories in This Scenario</h3>
                  <div className="space-y-2">
                    {stories.map((story: Story) => (
                      <div key={story._id} className="border p-2 rounded">
                        <div className="font-medium">{story.title}</div>
                        <div className="text-sm text-gray-600">{story.userStory}</div>
                        <div className="mt-1 flex justify-between text-xs">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            {story.points || story.storyPoints} points
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
                            {story.businessValue}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
