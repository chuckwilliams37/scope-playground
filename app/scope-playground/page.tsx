"use client";
import { useState } from "react";
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

// Sample data to use instead of Convex API until it's fully set up
const sampleStories = [
  {
    _id: "story-001",
    title: "User Management",
    businessValue: "Critical",
    storyPoints: 13,
    notes: "Core system functionality. Required for login, roles, etc."
  },
  {
    _id: "story-002",
    title: "Safety Inspections",
    businessValue: "Critical",
    storyPoints: 13,
    notes: "Allows recording and review of OSHA-required safety inspections."
  },
  {
    _id: "story-003",
    title: "Training Management",
    businessValue: "High",
    storyPoints: 8,
    notes: "Manage assignment and completion tracking for training modules."
  },
  {
    _id: "story-004",
    title: "Forms Management",
    businessValue: "High",
    storyPoints: 8,
    notes: "Submit and archive compliance-related forms and PDFs."
  },
  {
    _id: "story-005",
    title: "Admin Dashboard",
    businessValue: "High",
    storyPoints: 13,
    notes: "Access controls, org-level overview, training and inspection stats."
  }
];

export default function ScopePlaygroundPage() {
  // Use sample data instead of Convex API for now
  const stories = sampleStories;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [storyPositions, setStoryPositions] = useState<Record<string, { value: string, effort: string }>>({});
  
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

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Scope Playground</h1>
      
      <DndContext 
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="col-span-1 border p-4 rounded-lg bg-gray-50 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Features Backlog</h2>
            <ul className="space-y-3">
              {stories.filter(story => !storyPositions[story._id]).map((story) => (
                <StoryCard 
                  key={story._id} 
                  story={story} 
                  position={null}
                />
              ))}
            </ul>
          </div>
          
          <div className="col-span-1 md:col-span-2 border p-4 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Scope Matrix</h2>
            <ValuesMatrix getStoriesInCell={getStoriesInCell} />
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
