"use client";
import { useState, useEffect } from "react";
import "./styles.css";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { StoryCard } from "@/components/StoryCard";
import { ValuesMatrix } from "@/components/ValuesMatrix";
import { BacklogViewer } from "@/components/BacklogViewer";
import { MetricsPanel } from "@/components/MetricsPanel";
import { ScenarioManager } from "@/components/ScenarioManager";

// Sample data to use instead of Convex API until it's fully set up
const sampleStories = [
  {
    _id: "story-001",
    title: "Client-Specific Story Access",
    businessValue: "Critical",
    storyPoints: 5,
    notes: "Users should only see stories shared with them by the admin or PM.",
    userStory: "As a logged-in client, I can only view user stories that have been explicitly shared with me by the admin or PM.",
    category: "Access Control"
  },
  {
    _id: "story-002",
    title: "Backlog Story Viewer",
    businessValue: "Critical",
    storyPoints: 3,
    notes: "View list of stories with expandable detail",
    userStory: "As a client, I can see a list of user stories with expandable detail (not editable), including story points and business value.",
    category: "Story Management"
  },
  {
    _id: "story-003",
    title: "Scope Matrix Drag-and-Drop",
    businessValue: "High",
    storyPoints: 8,
    notes: "Drag-and-drop with effort validation feedback",
    userStory: "As a client, I can drag and drop features into the scope matrix. If effort is mismatched for a column, the system prompts me with effort adjustment options.",
    category: "UI Interaction"
  },
  {
    _id: "story-004",
    title: "Business Value Mismatch Explanation",
    businessValue: "High",
    storyPoints: 5,
    notes: "Contextual messages for value mismatches",
    userStory: "When I move a low-value item into a high-priority scope bucket (or vice versa), the system explains the meaning of this mismatch with distinct contextual messages.",
    category: "UX Enhancement"
  },
  {
    _id: "story-005",
    title: "Real-Time Scope Metrics Panel",
    businessValue: "Critical",
    storyPoints: 8,
    notes: "Live metrics for points, days, and cost",
    userStory: "As a client or admin, I want to see live scope metrics like total story points, estimated dev days, and projected cost as I change the scope matrix.",
    category: "Analytics"
  },
  {
    _id: "story-006",
    title: "Scenario Presets and Reset",
    businessValue: "Medium",
    storyPoints: 3,
    notes: "Load recommended configs and reset scope",
    userStory: "As a user, I can load recommended configurations such as MVP or Legacy Parity and reset my scope decisions to predefined presets.",
    category: "Configuration"
  },
  {
    _id: "story-007",
    title: "Save and Load Scenarios",
    businessValue: "High",
    storyPoints: 5,
    notes: "Save configurations for later comparison",
    userStory: "As a client, I can save scope matrix configurations and reload them later for comparison or revision.",
    category: "Data Management"
  }
];

// Scenario preset definitions
const scenarioPresets = [
  {
    _id: "preset-mvp",
    name: "MVP (Minimum Viable Product)",
    description: "Focus on critical features only to get a working product to market",
    createdBy: "system",
    createdAt: Date.now(),
    lastModified: Date.now(),
    isPreset: true
  },
  {
    _id: "preset-lovable",
    name: "Lovable Product",
    description: "A well-rounded product with both critical and high-value features",
    createdBy: "system",
    createdAt: Date.now(),
    lastModified: Date.now(),
    isPreset: true
  }
];

export default function ScopePlaygroundPage() {
  // Use sample data instead of Convex API for now
  const stories = sampleStories;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [storyPositions, setStoryPositions] = useState<Record<string, { value: string, effort: string }>>({});
  
  // Project settings
  const [settings, setSettings] = useState({
    developerCost: 750, // USD per day
    developerCount: 3,
    hoursPerDay: 8,
    developerAllocation: 80, // percentage
  });

  // Calculate metrics
  const calculateMetrics = () => {
    // Get all stories that are placed in the matrix
    const scopedStories = stories.filter(story => storyPositions[story._id]);
    const totalStories = scopedStories.length;
    
    // Calculate total points
    const totalPoints = scopedStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0);
    
    // Calculate total effort (story points * 8 hours per point as a simple conversion)
    const totalEffort = totalPoints * 8;
    
    return {
      totalStories,
      totalPoints,
      totalEffort
    };
  };

  const metrics = calculateMetrics();
  
  // Set up sensors for drag interactions
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const storyId = active.id as string;
      const cellId = over.id as string;
      
      if (cellId.includes('cell-')) {
        const [_, valueLevel, effortLevel] = cellId.split('-');
        
        setStoryPositions({
          ...storyPositions,
          [storyId]: {
            value: valueLevel,
            effort: effortLevel,
          },
        });
      }
    }
    
    setActiveId(null);
  };

  const activeStory = activeId ? stories.find(story => story._id === activeId) : null;
  
  const getStoryPosition = (storyId: string) => {
    return storyPositions[storyId] || null;
  };

  const getStoriesInCell = (value: string, effort: string) => {
    return stories.filter(story => {
      const position = storyPositions[story._id];
      return position && position.value === value && position.effort === effort;
    });
  };

  // Handle scenario management
  const handleSaveScenario = async (name: string, description: string) => {
    console.log(`Saving scenario: ${name}`);
    // In a real app, this would save to Convex
    return Promise.resolve();
  };

  const handleLoadScenario = async (scenarioId: string) => {
    console.log(`Loading scenario: ${scenarioId}`);
    // In a real app, this would load from Convex
    
    // For demo purposes, if it's the MVP preset, place critical stories in high value/low effort
    if (scenarioId === 'preset-mvp') {
      const newPositions: Record<string, { value: string, effort: string }> = {};
      
      stories.forEach(story => {
        if (story.businessValue === 'Critical') {
          newPositions[story._id] = { value: 'high', effort: 'low' };
        }
      });
      
      setStoryPositions(newPositions);
    }
    
    // For demo purposes, if it's the lovable preset, place critical and high value stories
    if (scenarioId === 'preset-lovable') {
      const newPositions: Record<string, { value: string, effort: string }> = {};
      
      stories.forEach(story => {
        if (story.businessValue === 'Critical') {
          newPositions[story._id] = { value: 'high', effort: 'low' };
        } else if (story.businessValue === 'High') {
          newPositions[story._id] = { value: 'high', effort: 'medium' };
        }
      });
      
      setStoryPositions(newPositions);
    }
    
    return Promise.resolve();
  };

  const handleCreatePreset = async (presetType: string) => {
    return handleLoadScenario(`preset-${presetType}`);
  };

  const handleResetScenario = () => {
    setStoryPositions({});
  };

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Scope Playground</h1>
      
      <DndContext 
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Backlog and Scenario Management */}
          <div className="space-y-6">
            <BacklogViewer 
              stories={stories.filter(story => !storyPositions[story._id])} 
            />
            <ScenarioManager 
              scenarios={scenarioPresets}
              onSaveScenario={handleSaveScenario}
              onLoadScenario={handleLoadScenario}
              onCreatePreset={handleCreatePreset}
              onResetScenario={handleResetScenario}
            />
          </div>
          
          {/* Center and Right Columns - Matrix and Metrics */}
          <div className="lg:col-span-2 space-y-6">
            <div className="border p-4 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Scope Matrix</h2>
              <ValuesMatrix 
                getStoriesInCell={getStoriesInCell} 
                totalPoints={metrics.totalPoints}
                totalEffort={metrics.totalEffort}
              />
            </div>
            
            <MetricsPanel
              totalStories={metrics.totalStories}
              totalPoints={metrics.totalPoints}
              totalEffort={metrics.totalEffort}
              developerCost={settings.developerCost}
              developerCount={settings.developerCount}
              hoursPerDay={settings.hoursPerDay}
              developerAllocation={settings.developerAllocation}
            />
          </div>
        </div>
        
        <DragOverlay>
          {activeId && activeStory ? (
            <div className="opacity-80">
              <StoryCard 
                story={activeStory} 
                position={getStoryPosition(activeStory._id)}
                isDragging 
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </main>
  );
}
