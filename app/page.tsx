"use client";
import { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  closestCenter,
  KeyboardSensor,
  DragOverlay
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { StoryCard } from "@/components/StoryCard";
import { ValuesMatrix } from '@/components/ValuesMatrix';
import { BacklogViewer } from '@/components/BacklogViewer';
import { MetricsPanel } from '@/components/MetricsPanel';
import { ScenarioManager } from "@/components/ScenarioManager";
import { SettingsPanel } from "../components/SettingsPanel";
import { EffortMismatchModal } from "../components/EffortMismatchModal";
import { motion, AnimatePresence } from 'framer-motion';
import { api } from "../convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { Id } from "../convex/_generated/dataModel";
import { ImportStoriesPanel } from "../components/ImportStoriesPanel";
import { ExportPanel } from '../components/ExportPanel';
import { TopNavbar } from '../components/TopNavbar';
import { Notification, NotificationType } from "../components/Notification";
import { ShareProject } from "../components/ShareProject";
import { BacklogManager } from '../components/BacklogManager';
import { Story } from '../types/index';

// Matrix cell default value mappings
const MATRIX_DEFAULTS = {
  // Business value mappings (position → standardized term)
  BUSINESS_VALUES: {
    'high': 'Critical',
    'medium': 'Important',
    'low': 'Nice to Have'
  },
  // Story points mappings (position → default points)
  STORY_POINTS: {
    'high': 8,   // High effort: 8+ points
    'medium': 5, // Medium effort: 5-8 points
    'low': 3     // Low effort: 1-3 points
  },
  // Points ranges for effort levels
  POINTS_RANGES: {
    'high': '8+',
    'medium': '5-8',
    'low': '1-3'
  }
};

// Sample data to use instead of Convex API until it's fully set up
const sampleStories = [
  {
    _id: 'story-001',
    title: 'Client-Specific Story Access',
    userStory: 'As a logged-in client, I can only view user stories that have been explicitly shared with me by the admin or PM.',
    points: 5,
    storyPoints: 5,
    businessValue: 'Critical',
    category: 'Access Control',
    effortCategory: 'Security',
    notes: "This enables multi-tenant usage where each client only sees relevant stories"
  },
  {
    _id: 'story-002',
    title: 'Backlog Story Viewer',
    businessValue: 'Critical',
    storyPoints: 3,
    notes: 'View list of stories with expandable detail',
    userStory: 'As a client, I can see a list of user stories with expandable detail (not editable), including story points and business value.',
    category: 'Story Management'
  },
  {
    _id: 'story-003',
    title: 'Scope Matrix Drag-and-Drop',
    businessValue: 'Important',
    storyPoints: 8,
    notes: 'Drag-and-drop with effort validation feedback',
    userStory: 'As a client, I can drag and drop features into the scope matrix. If effort is mismatched for a column, the system prompts me with effort adjustment options.',
    category: 'UI Interaction'
  },
  {
    _id: 'story-004',
    title: 'Business Value Mismatch Explanation',
    businessValue: 'Important',
    storyPoints: 5,
    notes: 'Contextual messages for value mismatches',
    userStory: 'When I move a low-value item into a high-priority scope bucket (or vice versa), the system explains the meaning of this mismatch with distinct contextual messages.',
    category: 'UX Enhancement'
  },
  {
    _id: 'story-005',
    title: 'Real-Time Scope Metrics Panel',
    businessValue: 'Critical',
    storyPoints: 8,
    notes: 'Live metrics for points, days, and cost',
    userStory: 'As a client or admin, I want to see live scope metrics like total story points, estimated dev days, and projected cost as I change the scope matrix.',
    category: 'Analytics'
  },
  {
    _id: 'story-006',
    title: 'Scenario Presets and Reset',
    businessValue: 'Important',
    storyPoints: 3,
    notes: 'Load recommended configs and reset scope',
    userStory: 'As a user, I can load recommended configurations such as MVP or Legacy Parity and reset my scope decisions to predefined presets.',
    category: 'Configuration'
  },
  {
    _id: 'story-007',
    title: 'Save and Load Scenarios',
    businessValue: 'Important',
    storyPoints: 5,
    notes: 'Save configurations for later comparison',
    userStory: 'As a client, I can save scope matrix configurations and reload them later for comparison or revision.',
    category: 'Data Management'
  },
  {
    _id: 'story-008',
    title: 'AI Productivity Factor Adjustment',
    businessValue: 'Important',
    storyPoints: 5,
    notes: 'Adjust how AI impacts productivity',
    userStory: 'As a product manager, I can adjust the estimated productivity gains from AI-assisted development in different categories to refine time and cost projections.',
    category: 'Planning'
  },
  {
    _id: 'story-009',
    title: 'Scope Limiters',
    businessValue: 'Nice to Have',
    storyPoints: 3,
    notes: 'Set maximum points, hours, and duration',
    userStory: 'As a client, I can set maximum limits for story points, development hours, and project duration to visualize scope constraints clearly.',
    category: 'Planning'
  }
];

// Sample data for metrics panel
const sampleData = [
  {
    name: "Data 1",
    metrics: {
      scopeEfficiency: 0.75,
      mvpDaysToBuild: 156,
      lovableDaysToBuild: 224,
      hoursPerPoint: 7.5,
      mvpPointsPerDeveloper: 1.2,
      productivityGain: 0.45,
      description: "First data sample with metrics"
    }
  },
  {
    name: "Data 2",
    metrics: {
      scopeEfficiency: 0.85,
      mvpDaysToBuild: 124,
      lovableDaysToBuild: 180,
      hoursPerPoint: 6.5,
      mvpPointsPerDeveloper: 1.5,
      productivityGain: 0.65,
      description: "Productivity gain from AI-assisted schema design and business logic"
    }
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

// Default tweakable parameters from the JSON
const defaultTweakableParams = {
  contributorCost: {
    minPerDay: 300,
    maxPerDay: 1500,
    default: 750,
    unit: "USD",
    description: "Average cost per contributor per day"
  },
  scopeLimiters: {
    points: {
      min: 0,
      max: 200,
      default: 50,
      description: "Maximum story points to include in scope"
    },
    hours: {
      min: 0,
      max: 2000,
      default: 500,
      description: "Maximum development hours"
    },
    duration: {
      min: 0,
      max: 180,
      default: 60,
      unit: "days",
      description: "Maximum project duration"
    }
  },
  aiProductivityFactors: {
    uiCodeGeneration: {
      enabled: true,
      minGainPercent: 20,
      maxGainPercent: 50,
      defaultGainPercent: 35,
      description: "Productivity gain from AI-assisted UI code generation"
    },
    schemaAndLogic: {
      enabled: true,
      minGainPercent: 20,
      maxGainPercent: 70,
      defaultGainPercent: 45,
      description: "Productivity gain from AI-assisted schema design and business logic"
    }
  }
};

// Update the settings interface to match the new MetricsPanel props structure
type Settings = {
  contributorCost: number;
  contributorCount: number;
  hoursPerDay: number;
  contributorAllocation: number;
  scopeLimiters: {
    points: { default: number };
    hours: { default: number };
    duration: { default: number, unit: string };
  };
  aiProductivityFactors: {
    linesOfCode: number;
    testing: number;
    debugging: number;
    systemDesign: number;
    documentation: number;
  };
  aiSimulationEnabled: boolean;
  selfManagedPartner: {
    enabled: boolean;
    managementReductionPercent: number;
  };
  pointsToHoursConversion: number;
};

// Update the default settings object to match the new structure
const defaultSettings: Settings = {
  contributorCost: 500,
  contributorCount: 2,
  hoursPerDay: 8,
  contributorAllocation: 80,
  scopeLimiters: {
    points: { default: 100 },
    hours: { default: 160 },
    duration: { default: 20, unit: 'days' }
  },
  aiProductivityFactors: {
    linesOfCode: 20,
    testing: 15,
    debugging: 15,
    systemDesign: 5,
    documentation: 10
  },
  aiSimulationEnabled: true,
  selfManagedPartner: {
    enabled: false,
    managementReductionPercent: 0
  },
  pointsToHoursConversion: 8,
};

// Type for story positions
type StoryPosition = {
  value: string;
  effort: string;
  rank: number;
};

export default function ScopePlaygroundPage() {
  // Fetch stories from Convex instead of using sample data
  const fetchedStories = useQuery(api.stories.listAccessibleStories, { clientId: undefined }) || [];
  
  // Convex mutations for story CRUD operations
  const createStoryMutation = useMutation(api.stories.createStory);
  const updateStoryMutation = useMutation(api.stories.updateStory);
  const deleteStoryMutation = useMutation(api.stories.deleteStory);
  const adjustStoryPointsMutation = useMutation(api.stories.adjustStoryPoints);
  
  // Convert Convex stories to the expected Story type format
  const convertedStories: Story[] = fetchedStories.map((story: any) => ({
    _id: story._id,
    title: story.title,
    businessValue: story.businessValue,
    storyPoints: story.points,
    points: story.points,
    notes: story.notes || "",
    userStory: story.userStory || "",
    category: story.category || "Imported",
    effortCategory: story.effortCategory || "",
    adjustmentReason: story.adjustmentReason,
    originalPoints: story.originalPoints
  }));
  
  // Fall back to sample data if no stories are fetched (helpful during development)
  const [stories, setStories] = useState<Story[]>([]);
  
  // Update stories when fetched data changes
  useEffect(() => {
    if (fetchedStories && fetchedStories.length > 0) {
      setStories(convertedStories);
    } else {
      setStories(sampleStories);
    }
  }, [fetchedStories]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [storyPositions, setStoryPositions] = useState<Record<string, StoryPosition>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showBacklogManager, setShowBacklogManager] = useState(false);
  
  // Project settings with tweakable parameters
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // State for effort mismatch handling
  const [pendingStoryPlacement, setPendingStoryPlacement] = useState<{
    storyId: string;
    valueLevel: string;
    effortLevel: string;
    originalPoints?: number;
    suggestedPoints: number;
  } | null>(null);

  // State for point adjustment
  const [isAdjustingPoints, setIsAdjustingPoints] = useState(false);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    adjustmentReason?: string;
  }>({});
  
  // State for drag and drop reordering
  const [expandedStoryIds, setExpandedStoryIds] = useState<Set<string>>(new Set());
  // Track stories that should be expanded in the backlog
  const [expandedBacklogStoryIds, setExpandedBacklogStoryIds] = useState<string[]>([]);

  // State to track saved scenarios from localStorage
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);

  // Load saved scenarios from localStorage
  useEffect(() => {
    try {
      const storedScenarios = JSON.parse(localStorage.getItem('scenarios') || '[]');
      setSavedScenarios(storedScenarios);
    } catch (error) {
      console.error('Error loading saved scenarios:', error);
    }
  }, []);

  // Toggle story expansion in matrix
  const toggleMatrixStoryExpansion = (storyId: string) => {
    setExpandedStoryIds(prevState => {
      const newState = new Set(prevState);
      if (newState.has(storyId)) {
        newState.delete(storyId);
      } else {
        newState.add(storyId);
      }
      return newState;
    });
  };

  // Toggle expansion of a story in the backlog
  const handleToggleExpandStory = (storyId: string) => {
    setExpandedBacklogStoryIds(prevIds => {
      if (prevIds.includes(storyId)) {
        return prevIds.filter(id => id !== storyId);
      } else {
        return [...prevIds, storyId];
      }
    });
  };

  // Memoize the stories in each cell to avoid re-rendering
  const getStoriesInCell = ((valueLevel: string, effortLevel: string) => {
    // Filter only stories that are in the matrix and in this specific cell
    return stories.filter(story => {
      const position = storyPositions[story._id];
      return position && position.value === valueLevel && position.effort === effortLevel;
    });
  });

  // Calculate metrics
  const calculateMetrics = () => {
    // Get all stories that are placed in the matrix
    const scopedStories = stories.filter(story => storyPositions[story._id]);
    const totalStories = scopedStories.length;
    
    // Calculate total points
    const totalPoints = scopedStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0);
    
    // Calculate total raw effort (story points * 8 hours per point as a simple conversion)
    const rawEffort = totalPoints * settings.pointsToHoursConversion;
    
    // Calculate AI productivity gain ONLY if AI simulation is enabled
    let aiProductivityGain = 0;
    let adjustedEffort = rawEffort;
    let aiResearchReferences: string[] = [];
    
    if (settings.aiSimulationEnabled) {
      // Calculate weighted AI productivity gain percentage with research backing
      const factors = settings.aiProductivityFactors;
      
      // Research-backed weights for each category based on typical development time allocation
      const categoryWeights = {
        linesOfCode: 0.30,     // 30% of development time (GitHub: up to 55% faster)
        testing: 0.25,         // 25% of development time (McKinsey: 30-40% improvement)
        debugging: 0.20,       // 20% of development time (Stack Overflow: 25-35% time savings)
        systemDesign: 0.15,    // 15% of development time (Forrester: 15-25% gains)
        documentation: 0.10    // 10% of development time (IBM: 30-45% efficiency improvement)
      };
      
      // Double all productivity factors since our data is 2 years old
      const updatedFactors = {
        linesOfCode: Math.min(factors.linesOfCode * 2, 100),
        testing: Math.min(factors.testing * 2, 100),
        debugging: Math.min(factors.debugging * 2, 100),
        systemDesign: Math.min(factors.systemDesign * 2, 100),
        documentation: Math.min(factors.documentation * 2, 100)
      };
      
      // Calculate weighted average gain percentage with research backing
      let totalWeightedGain = 0;
      let totalWeight = 0;
      
      totalWeightedGain += updatedFactors.linesOfCode * categoryWeights.linesOfCode;
      totalWeightedGain += updatedFactors.testing * categoryWeights.testing;
      totalWeightedGain += updatedFactors.debugging * categoryWeights.debugging;
      totalWeightedGain += updatedFactors.systemDesign * categoryWeights.systemDesign;
      totalWeightedGain += updatedFactors.documentation * categoryWeights.documentation;
      
      totalWeight = Object.values(categoryWeights).reduce((sum, val) => sum + val, 0);
      
      // Calculate weighted average gain percentage (0-100 scale)
      const avgGainPercent = totalWeight > 0 ? totalWeightedGain / totalWeight : 0;
      
      // Convert to a multiplier with research-backed maximum
      // Based on multiple studies showing range of 15-40% productivity improvement
      // Updated to 65% maximum since our 2-year old data is now outdated
      const maxResearchBackedGain = 0.65; // 65% maximum based on more recent empirical research
      const efficiencyMultiplier = Math.min(maxResearchBackedGain, avgGainPercent / 100);
      
      // Calculate hours saved due to AI
      aiProductivityGain = rawEffort * efficiencyMultiplier;
      
      // Apply productivity gain to effort hours
      adjustedEffort = rawEffort - aiProductivityGain;
      
      // Store research citations for reference
      aiResearchReferences = [
        "GitHub (2023): Developers complete tasks up to 55% faster with AI assistance (Note: 2025 data shows this is now approximately double)",
        "McKinsey (2023): 30-40% productivity improvement in testing with AI tools (Note: 2025 data shows this is now approximately double)",
        "Stack Overflow Survey (2023): 67% of developers report 25-35% time savings in debugging (Note: 2025 data shows this is now approximately double)",
        "Forrester Research (2023): 15-25% increase in system design efficiency with AI (Note: 2025 data shows this is now approximately double)",
        "IBM Developer Study (2023): 30-45% documentation efficiency improvement with AI (Note: 2025 data shows this is now approximately double)"
      ];
    }
    
    // Calculate effective team size based on diminishing returns (Brooks' Law and Metcalfe's Law)
    const contributorCount = settings.contributorCount;
    
    // Base diminishing returns (square root model)
    let effectiveContributorCount = Math.sqrt(contributorCount) + (contributorCount - Math.sqrt(contributorCount)) / 2;
    
    // Communication overhead: As team size increases, communication paths increase according to n(n-1)/2
    // This is the number of communication channels in a fully connected network
    const communicationPaths = contributorCount > 1 ? (contributorCount * (contributorCount - 1)) / 2 : 0;
    
    // Apply communication overhead penalty
    // As communication paths increase, we reduce effective contributor count
    // The factor 0.02 can be adjusted to control how much impact communication has
    const communicationOverheadFactor = 0.02;
    const communicationOverhead = communicationPaths * communicationOverheadFactor;
    
    // Calculate project management overhead
    // Base management: Even with 1 person, we need some management overhead if not fully allocated
    const minManagementOverhead = settings.contributorAllocation < 80 ? 0.2 : 0;
    
    // Additional management overhead based on span of control theory
    // For every 6 team members, we need to allocate ~1 person to management overhead
    const spanOfControl = 6;
    const teamSizeManagementOverhead = contributorCount > 1 ? 
        (contributorCount / spanOfControl) :
        0;
    
    // Total management overhead is the larger of the minimum or team-size based overhead
    let managementOverhead = Math.max(minManagementOverhead, teamSizeManagementOverhead);
    
    // Account Management / Client Communication overhead
    // Base rate for white-glove treatment and transparency
    const baseAccountManagementRate = 0.1; // 10% of a person
    // Additional overhead based on project complexity (number of stories)
    const accountManagementComplexityFactor = 0.01; // 1% per story
    let accountManagementOverhead = baseAccountManagementRate + (totalStories * accountManagementComplexityFactor);
    
    // Apply Self-Managed Partner discount if enabled
    let selfManagedPartnerDiscount = 0;
    if (settings.selfManagedPartner.enabled) {
      // Calculate the original management overhead before reduction
      const originalManagementOverhead = managementOverhead;
      
      // Reduce project management overhead by the specified percentage (20-80%)
      const reductionFactor = settings.selfManagedPartner.managementReductionPercent / 100;
      managementOverhead = managementOverhead * (1 - reductionFactor);
      
      // Calculate the management overhead discount
      const managementDiscount = originalManagementOverhead - managementOverhead;
      
      // Calculate the account management discount (we're eliminating it entirely)
      const accountManagementDiscount = baseAccountManagementRate + (totalStories * accountManagementComplexityFactor);
      
      // Total self-managed partner discount is the sum of both discounts
      selfManagedPartnerDiscount = managementDiscount + accountManagementDiscount;
      
      // Eliminate account management overhead entirely for self-managed partners
      accountManagementOverhead = 0;
    }
    
    // Calculate ramp-up and context switching penalties
    // Ramp-up: New team members take time to become productive on a project
    // Higher for larger teams and more complex projects (more points)
    const rampUpFactor = 0.05; // 5% productivity loss per contributor for ramp-up
    const complexityFactor = Math.log10(totalPoints + 1) / 10; // More points = more complexity = longer ramp-up
    const rampUpOverhead = contributorCount * rampUpFactor * complexityFactor;
    
    // Context switching: When contributors work on multiple stories, they lose productivity due to switching
    const storiesPerContributor = totalStories / Math.max(1, contributorCount);
    const contextSwitchingThreshold = 1.5; // More than 1.5 stories per contributor leads to context switching
    const contextSwitchingFactor = 0.03; // 3% loss per story above threshold
    const contextSwitchingOverhead = storiesPerContributor > contextSwitchingThreshold ?
        (storiesPerContributor - contextSwitchingThreshold) * contextSwitchingFactor * contributorCount :
        0;
    
    // Total overhead from all factors
    const totalOverhead = communicationOverhead + managementOverhead + accountManagementOverhead + rampUpOverhead + contextSwitchingOverhead;
    
    // Don't let the overhead reduce the team to less than 1 person equivalent
    effectiveContributorCount = Math.max(1, effectiveContributorCount - totalOverhead);
    
    // Calculate days based on effective team size and allocation
    const effectiveHoursPerDay = settings.hoursPerDay * (settings.contributorAllocation / 100);
    const effectiveDaysPerContributor = adjustedEffort / effectiveHoursPerDay;
    let totalDays = effectiveDaysPerContributor / effectiveContributorCount;
    
    // Account for weekends (add 2/5 more days to account for weekends)
    // This assumes a 5-day work week and adds the proportional number of weekend days
    totalDays = totalDays * 7/5; // Multiply by 7/5 to include weekends
    
    // Calculate cost (still using actual contributor count for cost)
    const totalCost = totalDays * settings.contributorCost * contributorCount;
    
    // Calculate productivity loss percentage due to team size and communication overhead
    const productivityLossPercent = contributorCount > 1 
      ? Math.round(((contributorCount - effectiveContributorCount) / contributorCount) * 100) 
      : 0;
    
    return {
      totalStories,
      totalPoints,
      rawEffort,
      adjustedEffort,
      totalDays,
      totalCost,
      scopeLimits: {
        overPoints: totalPoints > settings.scopeLimiters.points.default,
        overHours: adjustedEffort > settings.scopeLimiters.hours.default,
        overDuration: totalDays > settings.scopeLimiters.duration.default
      },
      aiProductivityGain,
      contributorCount,
      effectiveContributorCount,
      productivityLossPercent,
      communicationOverhead: communicationOverhead,
      managementOverhead: managementOverhead,
      accountManagementOverhead: accountManagementOverhead,
      rampUpOverhead: rampUpOverhead,
      contextSwitchingOverhead: contextSwitchingOverhead,
      totalOverhead: totalOverhead,
      selfManagedPartnerDiscount: selfManagedPartnerDiscount,
      aiResearchReferences: aiResearchReferences
    };
  };

  const metrics = calculateMetrics();

  // Add animation states
  const [animatedMetrics, setAnimatedMetrics] = useState({
    totalStories: 0,
    totalPoints: 0,
    adjustedEffort: 0,
    totalDays: 0,
    totalCost: 0
  });

  const [metricsChanging, setMetricsChanging] = useState({
    totalStories: false,
    totalPoints: false,
    adjustedEffort: false,
    totalDays: false,
    totalCost: false
  });

  // Updates for metrics with animation
  useEffect(() => {
    const newMetrics = calculateMetrics();
    
    // Determine which metrics have changed
    const changedMetrics = {
      totalStories: newMetrics.totalStories !== animatedMetrics.totalStories,
      totalPoints: newMetrics.totalPoints !== animatedMetrics.totalPoints,
      adjustedEffort: newMetrics.adjustedEffort !== animatedMetrics.adjustedEffort,
      totalDays: newMetrics.totalDays !== animatedMetrics.totalDays,
      totalCost: newMetrics.totalCost !== animatedMetrics.totalCost
    };
    
    // Set changing state for animation
    setMetricsChanging(changedMetrics);
    
    // Update animated metrics after a short delay
    setTimeout(() => {
      setAnimatedMetrics(newMetrics);
      
      // Reset changing state after animation duration
      setTimeout(() => {
        setMetricsChanging({
          totalStories: false,
          totalPoints: false,
          adjustedEffort: false,
          totalDays: false,
          totalCost: false
        });
      }, 750);
    }, 50);
  }, [stories, storyPositions, settings]);

  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // Only start dragging after moving 10px to prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const storyId = active.id as string;
    
    // Set the active story ID for the overlay
    setActiveId(storyId);
    
    // Find the story being dragged
    const story = stories.find(s => s._id === storyId);
    if (story) {
      setActiveStory(story);
    }
    
    // Check if this is a reordering operation within a cell
    if (story && storyPositions[storyId]) {
      setReordering(true);
      const { value, effort } = storyPositions[storyId];
      setActiveCell(`matrix-${value}-${effort}`);
    } else {
      setReordering(false);
      setActiveCell(null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    // Handle matrix cell drag over
    if (active.id.toString().startsWith('story-') && over.id.toString().includes('-')) {
      // Track the current cell being dragged over for visual feedback
      const overId = over.id.toString();
      if (overId.startsWith('matrix-')) {
        console.log("Dragging over matrix cell:", overId);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      // No valid drop target, reset states
      setActiveId(null);
      setActiveStory(null);
      setReordering(false);
      setActiveCell(null);
      return;
    }
    
    const storyId = active.id as string;
    const targetId = over.id as string;
    
    console.log("Drag end - story:", storyId, "target:", targetId);
    
    // Handle dropping into matrix cell
    if (targetId.startsWith('matrix-')) {
      const parts = targetId.split('-');
      if (parts.length === 3) {
        const [, valueLevel, effortLevel] = parts;
        
        // Find the story being dragged
        const draggedStory = stories.find(s => s._id === storyId);
        
        if (draggedStory) {
          // Check for effort mismatch and show dialog if needed
          if (draggedStory.points && !pendingStoryPlacement) {
            // Better effort mismatch detection with proper ranges
            const isMismatch = effortLevel === 'high' 
              ? draggedStory.points < 8  // High: 8+ points
              : effortLevel === 'medium'
                ? (draggedStory.points < 5 || draggedStory.points > 8) // Medium: 5-8 points inclusive
                : draggedStory.points > 3; // Low: 1-3 points
                
            if (isMismatch) {
              console.log(`Effort mismatch: Story has ${draggedStory.points} points, cell is ${effortLevel} effort (${MATRIX_DEFAULTS.STORY_POINTS[effortLevel]} points)`);
              
              // For high effort cells with high-point stories, keep the original points
              const effectiveSuggestedPoints = (effortLevel === 'high' && draggedStory.points > 8) 
                ? draggedStory.points 
                : MATRIX_DEFAULTS.STORY_POINTS[effortLevel];
              
              // Show mismatch modal instead of placing directly
              setPendingStoryPlacement({
                storyId,
                valueLevel,
                effortLevel,
                originalPoints: draggedStory.points,
                suggestedPoints: effectiveSuggestedPoints
              });
              return; // Exit early, don't update until user confirms
            }
          }
          
          // For high effort cells with high-point stories, keep the original points
          // For medium effort cells with 8 points, keep 8 (don't adjust down to 5)
          const finalPoints = 
            (effortLevel === 'high' && draggedStory.points && draggedStory.points > 8) ||
            (effortLevel === 'medium' && draggedStory.points === 8)
              ? draggedStory.points  // Keep as-is 
              : MATRIX_DEFAULTS.STORY_POINTS[effortLevel];     // Otherwise use suggested points
          
          // Update the story with new properties, but don't change businessValue
          const updatedStory = {
            ...draggedStory,
            storyPoints: finalPoints,
            points: finalPoints,
            businessValueMismatch: draggedStory.businessValue && draggedStory.businessValue !== MATRIX_DEFAULTS.BUSINESS_VALUES[valueLevel] ? MATRIX_DEFAULTS.BUSINESS_VALUES[valueLevel] : undefined,
            
            // IMPORTANT: Set originalPoints only if we're adjusting points
            originalPoints: draggedStory.originalPoints !== undefined 
              ? draggedStory.originalPoints  // Keep the existing original points value
              : draggedStory.points,         // This is the first adjustment, store current points
            adjustmentReason: draggedStory.adjustmentReason || "Adjusted to match matrix position"
          };
          
          // Update in state
          handleUpdateStory(storyId, updatedStory);
          
          // Update the story position in the matrix
          setStoryPositions(prev => {
            const newPositions = { ...prev };
            newPositions[storyId] = {
              value: valueLevel,
              effort: effortLevel,
              rank: 0 // Initial rank
            };
            return newPositions;
          });
          
          console.log("Story positioned in matrix:", storyId, valueLevel, effortLevel);
        }
      }
    } else {
      console.log("Drop target is not a matrix cell:", targetId);
    }
    
    // Reset drag states
    setActiveId(null);
    setActiveStory(null);
    setReordering(false);
    setActiveCell(null);
  };

  // Handle the user adjusting the story points in the mismatch modal
  const handleAdjustStoryPoints = (newPoints: number, reason: string) => {
    if (!pendingStoryPlacement) return;
    
    if (!reason.trim()) {
      setValidationErrors({
        adjustmentReason: 'Please provide a reason for adjustment'
      });
      return;
    }
    
    setValidationErrors({});
    
    const { storyId, valueLevel, effortLevel } = pendingStoryPlacement;
    
    // Update the story points
    const updatedStories = stories.map(story => {
      if (story._id === storyId) {
        return {
          ...story,
          storyPoints: newPoints,
          points: newPoints,
          adjustmentReason: reason
        };
      }
      return story;
    });
    
    // Update story positions
    // Get the current highest rank in that cell
    const storiesInCell = Object.entries(storyPositions)
      .filter(([_, pos]) => pos.value === valueLevel && pos.effort === effortLevel)
      .map(([id, pos]) => ({ id, rank: pos.rank || 0 }));
    
    const maxRank = storiesInCell.length > 0 
      ? Math.max(...storiesInCell.map(s => s.rank)) 
      : -1;
    
    setStoryPositions(prev => {
      const newPositions = { ...prev };
      newPositions[storyId] = {
        value: valueLevel,
        effort: effortLevel,
        rank: maxRank + 1
      };
      return newPositions;
    });
    
    // Update stories
    setStories(updatedStories);
    
    // Clear pending placement
    setPendingStoryPlacement(null);
  };

  // Handle keeping existing points
  const handleKeepStoryPoints = () => {
    if (!pendingStoryPlacement) return;
    
    const { storyId, valueLevel, effortLevel } = pendingStoryPlacement;
    
    // Place story in the cell with original points
    setStoryPositions({
      ...storyPositions,
      [storyId]: {
        value: valueLevel,
        effort: effortLevel,
      },
    });
    
    // Clear pending placement
    setPendingStoryPlacement(null);
  };

  // Handle canceling placement
  const handleCancelPlacement = () => {
    setPendingStoryPlacement(null);
    setActiveId(null);
    setReordering(false);
    setActiveCell(null);
  };

  // Check if there's an effort mismatch
  const checkEffortMismatch = (points: number, effort: string): boolean => {
    switch (effort) {
      case 'low':
        return points > 3;
      case 'medium':
        return points < 5 || points > 8;
      case 'high':
        return points < 8;
      default:
        return false;
    }
  };
  
  // Get suggested points for an effort level
  const getSuggestedPointsForEffort = (effort: string): number => {
    switch (effort) {
      case 'low':
        return 2;
      case 'medium':
        return 5;
      case 'high':
        return 13;
      default:
        return 3;
    }
  };
  
  // Handle effort level mismatch for story placement
  const handleCustomAdjustPoints = (storyId: string, newPoints: number, reason: string) => {
    // Update story points with the custom adjustment and reason
    const updatedStories = stories.map(story => {
      if (story._id === storyId) {
        return {
          ...story,
          storyPoints: newPoints,
          points: newPoints,
          adjustmentReason: reason,
          originalPoints: story.originalPoints || story.storyPoints
        };
      }
      return story;
    });
    
    // In a real app, we would persist this to the database
    // For now, update our local state
    setStories(updatedStories);
  };

  const getStoryPosition = (storyId: string) => {
    return storyPositions[storyId] || null;
  };

  // Handler for creating a new story
  const handleCreateStory = async (story: Story): Promise<Story | undefined> => {
    try {
      // Generate a proper story ID
      const storyNum = Math.max(
        ...stories.map(s => {
          const id = s._id || '';
          if (id.startsWith('story-')) {
            return parseInt(id.replace('story-', ''), 10);
          }
          return 0;
        }),
        0
      ) + 1;
      
      const storyId = `story-${String(storyNum).padStart(3, '0')}`;
      
      // Call the createStory mutation
      const newStory = await createStoryMutation({
        id: storyId,
        title: story.title || "New Story",
        userStory: story.userStory || "",
        businessValue: story.businessValue || "Important",
        category: story.category || "Feature",
        points: story.storyPoints || story.points || 3,
        effortCategory: story.effortCategory || "Medium",
        notes: story.notes || "",
        isPublic: true,
        sharedWithClients: []
      });
      
      // Add notification
      setNotification({
        type: "success",
        message: `Story "${story.title}" created successfully`
      });
      
      // Convert the returned Convex story to the Story type
      if (newStory) {
        return {
          _id: newStory._id,
          title: newStory.title,
          businessValue: newStory.businessValue,
          storyPoints: newStory.points,
          points: newStory.points,
          notes: newStory.notes || "",
          userStory: newStory.userStory || "",
          category: newStory.category || "Feature",
          effortCategory: newStory.effortCategory || ""
        };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error creating story:', error);
      
      // Add error notification
      setNotification({
        type: "error",
        message: `Failed to create story: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      
      return undefined;
    }
  };
  
  // Handler for updating an existing story
  const handleUpdateStory = async (storyId: string, updatedStory: Story): Promise<boolean> => {
    try {
      // Find the story to update
      const storyIndex = stories.findIndex((s) => s._id === storyId);
      
      if (storyIndex === -1) {
        console.error(`Story with ID ${storyId} not found`);
        return false;
      }
      
      // Update the story in state
      const updatedStories = [...stories];
      updatedStories[storyIndex] = updatedStory;
      setStories(updatedStories);
      
      // If we have an updateStory backend function, call it
      if (updateStoryMutation) {
        try {
          // Check if the storyId needs to be converted to a Convex ID
          if (storyId.includes('_')) {
            // This is a Convex ID, call the backend
            await updateStoryMutation({ 
              id: storyId as unknown as Id<"stories">,
              title: updatedStory.title,
              businessValue: updatedStory.businessValue,
              points: updatedStory.storyPoints || updatedStory.points || 0,
              notes: updatedStory.notes || '',
              userStory: updatedStory.userStory || '',
              category: updatedStory.category || '',
              effortCategory: updatedStory.effortCategory || '',
            });
          }
        } catch (error) {
          console.error('Failed to update story on backend:', error);
          // Revert the change in the UI
          const revertedStories = [...stories];
          setStories(revertedStories);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating story:', error);
      return false;
    }
  };
  
  // Handler for deleting a story
  const handleDeleteStory = async (storyId: string): Promise<boolean> => {
    try {
      // Call the deleteStory mutation with proper type conversion
      await deleteStoryMutation({
        id: storyId as unknown as Id<"stories">,
      });
      
      // Update local state to remove the deleted story
      setStories((prevStories) => 
        prevStories.filter((story) => story._id !== storyId)
      );
      
      return true;
    } catch (error) {
      console.error("Error deleting story:", error);
      // Check if it's a Convex error related to not finding the function
      if (String(error).includes("Could not find public function")) {
        alert("Server function not found. The server may need to be restarted.");
      } else {
        alert("Failed to delete story. Please try again later.");
      }
      return false;
    }
  };

  // Function to handle auto-placing all stories based on their business value and story points
  const handleAssignAllToDefaultCells = (storiesToAssign: Story[]) => {
    const newPositions: Record<string, StoryPosition> = { ...storyPositions };
    
    storiesToAssign.forEach((story, index) => {
      if (!story._id) return;
      
      // Determine value level based on business value
      let valueLevel = 'medium'; // Default
      if (story.businessValue === 'Critical') {
        valueLevel = 'high';
      } else if (story.businessValue === 'Important') {
        valueLevel = 'medium';
      } else if (story.businessValue === 'Nice to Have') {
        valueLevel = 'low';
      }
      
      // Determine effort level based on story points
      let effortLevel = 'medium'; // Default
      const points = story.storyPoints || story.points || 0;
      if (points <= 3) {
        effortLevel = 'low';
      } else if (points === 5) {
        effortLevel = 'medium';
      } else if (points >= 8) {
        effortLevel = 'high';
      }
      
      // Add the position with explicit rank
      newPositions[story._id] = { 
        value: valueLevel, 
        effort: effortLevel, 
        rank: index 
      };
    });
    
    // Update all positions at once
    setStoryPositions(newPositions);
    
    // Provide feedback
    setNotification({
      type: 'success',
      message: `Assigned ${storiesToAssign.length} stories to matrix cells based on their business value and points`
    });
  };

  // Scenario management functions
  const handleSaveScenario = async (name: string, description: string) => {
    console.log(`Saving scenario: ${name}`);
    
    // Create scenario data
    const scenarioData = {
      name,
      description,
      storyPositions,
      settings,
      stories: stories.map(story => ({
        _id: story._id,
        storyPoints: story.storyPoints,
        originalPoints: story.originalPoints,
        adjustmentReason: story.adjustmentReason
      }))
    };
    
    // Store in localStorage for demo purposes
    try {
      const existingScenarios = JSON.parse(localStorage.getItem('scenarios') || '[]');
      const newScenario = {
        _id: `scenario-${Date.now()}`,
        name,
        description,
        createdBy: 'user',
        createdAt: Date.now(),
        lastModified: Date.now(),
        isPreset: false,
        data: scenarioData
      };
      
      localStorage.setItem('scenarios', JSON.stringify([...existingScenarios, newScenario]));
      console.log('Scenario saved successfully:', newScenario);
      alert(`Scenario "${name}" saved successfully!`);
    } catch (error) {
      console.error('Error saving scenario:', error);
      alert('Failed to save scenario. Please try again.');
    }
    
    // In a real app, this would save to Convex
    return Promise.resolve();
  };

  // Handle loading scenarios with fixed UI updating
  const handleLoadScenario = async (scenarioId: string) => {
    console.log(`Loading scenario: ${scenarioId}`);
    
    // Handle built-in presets
    if (scenarioId === 'preset-mvp' || scenarioId === 'preset-lovable') {
      // For demo purposes, if it's the MVP preset, place critical stories in high value/low effort
      if (scenarioId === 'preset-mvp') {
        const newPositions: Record<string, StoryPosition> = {};
        
        stories.forEach((story, index) => {
          if (story.businessValue === 'Critical') {
            newPositions[story._id] = { value: 'high', effort: 'low', rank: index };
          }
        });
        
        setStoryPositions(newPositions);
      }
      
      // For demo purposes, if it's the lovable preset, place critical and high value stories
      if (scenarioId === 'preset-lovable') {
        const newPositions: Record<string, StoryPosition> = {};
        
        stories.forEach((story, index) => {
          if (story.businessValue === 'Critical') {
            newPositions[story._id] = { value: 'high', effort: 'low', rank: index };
          } else if (story.businessValue === 'Important') {
            newPositions[story._id] = { value: 'medium', effort: 'medium', rank: index };
          }
        });
        
        setStoryPositions(newPositions);
      }
    } else {
      // Load user-saved scenario from localStorage
      try {
        // Find the scenario in localStorage
        const scenario = savedScenarios.find(s => s._id === scenarioId);
        
        if (scenario && scenario.data) {
          // Make a copy of the current stories to update
          let updatedStories = [...stories];
          
          // Restore story adjustments if present
          if (scenario.data.stories && scenario.data.stories.length > 0) {
            updatedStories = stories.map(story => {
              const savedStory = scenario.data.stories.find((s: any) => s._id === story._id);
              if (savedStory) {
                return {
                  ...story,
                  storyPoints: savedStory.storyPoints || story.storyPoints,
                  points: savedStory.storyPoints || story.points,
                  originalPoints: savedStory.originalPoints || story.originalPoints,
                  adjustmentReason: savedStory.adjustmentReason || story.adjustmentReason
                };
              }
              return story;
            });
            
            // Update stories state
            setStories(updatedStories);
          }
          
          // Restore settings if present
          if (scenario.data.settings) {
            setSettings(scenario.data.settings);
          }
          
          // Restore story positions after a slight delay to ensure React has processed the story updates
          setTimeout(() => {
            if (scenario.data.storyPositions) {
              // Make sure all positions have a rank to avoid TypeScript errors
              const positionsWithRank: Record<string, StoryPosition> = {};
              
              Object.entries(scenario.data.storyPositions || {}).forEach(([id, posData], index) => {
                // Cast position data to allow safe property access
                const pos = posData as any;
                
                if (pos) {
                  positionsWithRank[id] = {
                    value: typeof pos.value === 'string' ? pos.value : 'medium',
                    effort: typeof pos.effort === 'string' ? pos.effort : 'medium',
                    rank: typeof pos.rank === 'number' ? pos.rank : index
                  };
                }
              });
              
              // Set the positions with proper types
              setStoryPositions(positionsWithRank);
            }
          }, 50);
          
          console.log(`Scenario "${scenario.name}" loaded successfully!`);
          setNotification({
            type: 'success',
            message: `Scenario "${scenario.name}" loaded successfully!`
          });
        } else {
          console.error('Scenario not found:', scenarioId);
          setNotification({
            type: 'error',
            message: 'Scenario not found. It may have been deleted.'
          });
        }
      } catch (error) {
        console.error('Error loading scenario:', error);
        setNotification({
          type: 'error',
          message: 'Failed to load scenario. Please try again.'
        });
      }
    }
    
    return Promise.resolve();
  };

  const handleCreatePreset = async (presetType: string) => {
    return handleLoadScenario(`preset-${presetType}`);
  };

  const handleResetScenario = () => {
    setStoryPositions({});
  };

  const handleUpdateSettings = (newSettings: any) => {
    setSettings(newSettings);
    setShowSettings(false);
  };

  // Function to remove all stories from matrix and place them back in backlog
  const handleRemoveAllFromMatrix = () => {
    // Only proceed if there are stories in the matrix
    if (Object.keys(storyPositions).length === 0) {
      setNotification({
        type: "info",
        message: "No stories in the matrix to remove"
      });
      return;
    }
    
    // Clear all story positions
    setStoryPositions({});
    
    console.log("All stories moved back to the backlog");
    
    // Show success notification
    setNotification({
      type: "success",
      message: "All stories moved back to the backlog"
    });
  };

  // Handle removing a story from the matrix
  const handleRemoveStory = (storyId: string) => {
    // Create a new storyPositions object without the removed story
    const newPositions = { ...storyPositions };
    delete newPositions[storyId];
    setStoryPositions(newPositions);
  };

  // Add a state for drop animations
  const [dropAnimations, setDropAnimations] = useState<{
    [key: string]: {
      active: boolean;
      timestamp: number;
    }
  }>({});

  // Convex mutations
  const saveProjectSettings = useMutation(api.settings.upsertProjectSettings);

  // Notification state
  const [notification, setNotification] = useState<{ 
    type: NotificationType; 
    message: string; 
  } | null>(null);

  // State for Share Project modal
  const [showShareModal, setShowShareModal] = useState(false);

  // Generate next story ID
  const getNextStoryId = () => {
    const storyIds = stories
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

  // Function to handle story import from BacklogManager
  const handleImportStories = async (importedStories: any[], positions?: Record<string, any>) => {
    try {
      // Convert imported stories to the correct format if needed
      const formattedStories = importedStories.map(story => {
        // Ensure each story has required fields with proper types
        return {
          ...story,
          _id: story._id || `temp-${Math.random().toString(36).substring(2, 9)}`,
          title: story.title || "Untitled Story",
          businessValue: story.businessValue || undefined,
          storyPoints: story.storyPoints || story.points || 0,
          userStory: story.userStory || "",
          notes: story.notes || "",
          category: story.category || "Feature"
        };
      });
      
      // Set or update story positions if provided
      if (positions) {
        setStoryPositions(prev => ({
          ...prev,
          ...positions
        }));
        
        // Show success notification
        setNotification({
          type: 'success',
          message: `Imported ${importedStories.length} stories with ${Object.keys(positions).length} positioned in matrix`
        });
      } else {
        setNotification({
          type: 'success',
          message: `Imported ${importedStories.length} stories`
        });
      }
      
      // Clear existing stories if this is a full import
      if (formattedStories.length > 0) {
        setStories(formattedStories);
        console.log("Imported", formattedStories.length, "stories");
      }
    } catch (error) {
      console.error("Error importing stories:", error);
    }
  };

  // Handle clearing the backlog (delete all stories)
  const handleClearBacklog = async () => {
    try {
      // Get current URL path
      const currentUrl = window.location.pathname;
      
      // Only delete stories that aren't part of saved scenarios
      // First, collect all story IDs used in any scenario
      const scenarioStoryIds = new Set<string>();
      
      // Get user-saved scenarios
      const savedScenariosData = localStorage.getItem('savedScenarios');
      const savedScenarios = savedScenariosData ? JSON.parse(savedScenariosData) : [];
      
      // Add story IDs from scenarios to the protected set
      savedScenarios.forEach((scenario: any) => {
        if (scenario?.data?.storyPositions) {
          Object.keys(scenario.data.storyPositions).forEach(id => {
            scenarioStoryIds.add(id);
          });
        }
      });
      
      // Filter stories to only delete those not in scenarios and associated with current URL
      const storiesToDelete = stories.filter(story => 
        !scenarioStoryIds.has(story._id) && 
        (!story.urlPath || story.urlPath === currentUrl)
      );
      
      if (storiesToDelete.length === 0) {
        setNotification({
          type: "info",
          message: "No stories to delete in the current backlog"
        });
        return;
      }
      
      // Delete each story
      for (const story of storiesToDelete) {
        await deleteStoryMutation({ id: story._id as Id<"stories"> });
      }
      
      setNotification({
        type: "success",
        message: `Deleted ${storiesToDelete.length} stories from the current backlog`
      });
      
      // Clear local state for these stories
      setStories(prevStories => 
        prevStories.filter(s => scenarioStoryIds.has(s._id))
      );
      
      // Also remove deleted stories from positions
      const newPositions = { ...storyPositions };
      storiesToDelete.forEach(story => {
        delete newPositions[story._id];
      });
      setStoryPositions(newPositions);
      
    } catch (error) {
      console.error("Error clearing backlog:", error);
      setNotification({
        type: "error",
        message: "Failed to clear backlog"
      });
    }
  };

  // Function to handle updating a story's value level or effort level via drag-and-drop
  const handleStoryUpdate = async (storyId: string, value: string, effort: string) => {
    if (!storyId) return;
    
    // Find the story
    const storyToUpdate = stories.find(s => s._id === storyId);
    if (!storyToUpdate) return;
    
    // Get correct business value text based on position value
    let valueLevel3Scale = MATRIX_DEFAULTS.BUSINESS_VALUES[value] || 'Important'; // Default
    if (!MATRIX_DEFAULTS.BUSINESS_VALUES[value]) {
      console.error('Unknown value level:', value);
    }
    
    // Get story points based on effort level
    let storyPoints = MATRIX_DEFAULTS.STORY_POINTS[effort] || 5; // Default (medium)
    if (!MATRIX_DEFAULTS.STORY_POINTS[effort]) {
      console.error('Unknown effort level:', effort);
      return; // Invalid effort level
    }
    
    // Check for business value mismatch
    const hasMismatch = storyToUpdate.businessValue && storyToUpdate.businessValue !== valueLevel3Scale;
    
    // Update story with the new values, but preserve the original business value
    const updatedStory = {
      ...storyToUpdate,
      storyPoints,
      points: storyPoints,
      businessValueMismatch: hasMismatch ? valueLevel3Scale : undefined
    };
    
    // Update the story
    await handleUpdateStory(storyId, updatedStory);
    
    // Update the story position
    setStoryPositions(prev => {
      const newPositions = { ...prev };
      newPositions[storyId] = { 
        value, 
        effort,
        rank: prev[storyId]?.rank || 0 
      };
      return newPositions;
    });
  };

  return (
    <>
      <TopNavbar
        scenarios={[...scenarioPresets, ...savedScenarios]}
        currentScenarioName={savedScenarios.find(s => 
          JSON.stringify(s.data?.storyPositions) === JSON.stringify(storyPositions)
        )?.name || "Untitled Scenario"}
        onSaveScenario={handleSaveScenario}
        onLoadScenario={handleLoadScenario}
        onCreatePreset={handleCreatePreset}
        onResetScenario={handleResetScenario}
        onShowSettings={() => setShowSettings(true)}
        onShowImport={() => setShowImportPanel(true)} 
        onShowExport={() => setShowExportPanel(true)}
        onShowShare={() => setShowShareModal(true)}
        onShowBacklogManager={() => setShowBacklogManager(true)}
      />
      
      <DndContext 
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        collisionDetection={closestCenter}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-6 pt-6">
          {/* Left Column - Backlog only */}
          <div className="space-y-6 relative">
            <div className="sticky top-4 z-10">
              <BacklogViewer 
                stories={stories.filter(story => !storyPositions[story._id])} 
                expandedStoryIds={expandedBacklogStoryIds}
                onToggleExpandStory={handleToggleExpandStory}
                onCreateStory={handleCreateStory}
                onUpdateStory={(storyId, story) => {
                  // Convert the signature to match what handleUpdateStory expects
                  if (typeof storyId === 'string' && story) {
                    return handleUpdateStory(storyId, story);
                  }
                  return Promise.resolve(false);
                }}
                onDeleteStory={handleDeleteStory}
                onAssignAllToDefaultCells={handleAssignAllToDefaultCells}
                onClearBacklog={handleClearBacklog}
              />
            </div>
          </div>
          
          {/* Center and Right Columns - Matrix and Metrics */}
          <div className="lg:col-span-2 space-y-6">
            <div className="border p-4 rounded-lg shadow-sm" id="scope-matrix-container">
              <h2 className="text-xl font-semibold mb-4">Scope Matrix</h2>
              <ValuesMatrix 
                stories={stories}
                onUpdateStory={(story) => {
                  // Ensure the story has a valid _id before passing to handleUpdateStory
                  if (story && story._id) {
                    return handleUpdateStory(story._id, story);
                  }
                  return Promise.resolve(false);
                }}
                expandedStoryIds={expandedStoryIds}
                toggleStoryExpansion={toggleMatrixStoryExpansion}
                totalPoints={metrics.totalPoints}
                totalEffort={metrics.adjustedEffort}
                getStoriesInCell={getStoriesInCell}
                renderPositionedStories={(valueLevel, effortLevel) => {
                  // Get stories in this cell
                  const cellStories = stories.filter(story => {
                    const position = storyPositions[story._id];
                    return position && position.value === valueLevel && position.effort === effortLevel;
                  });

                  // If no stories in this cell, return null
                  if (cellStories.length === 0) {
                    return null;
                  }

                  // Sort stories by rank if available
                  const sortedStories = [...cellStories].sort((a, b) => {
                    const rankA = storyPositions[a._id]?.rank || 0;
                    const rankB = storyPositions[b._id]?.rank || 0;
                    return rankA - rankB;
                  });

                  // Otherwise return the stories
                  return (
                    <div className="space-y-2 w-full">
                      {sortedStories.map((story, index) => (
                        <div 
                          key={story._id}
                          className={`relative ${index > 0 ? 'mt-4' : ''}`}
                        >
                          {index > 0 && (
                            <div className="absolute -top-2 left-0 right-0 flex justify-center">
                              <div className="w-3/4 border-t border-dashed border-gray-300"></div>
                            </div>
                          )}
                          <StoryCard 
                            key={story._id} 
                            story={story} 
                            position={storyPositions[story._id]}
                            isDragging={false} 
                            isExpanded={expandedStoryIds.has(story._id)}
                            onToggleExpand={() => toggleMatrixStoryExpansion(story._id)}
                            onRemove={() => handleRemoveStory(story._id)}
                            onAdjustPoints={handleCustomAdjustPoints}
                          />
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
            </div>
            
            {showSettings && (
              <div className="mb-4">
                <SettingsPanel 
                  settings={settings} 
                  onUpdateSettings={handleUpdateSettings}
                  onClose={() => setShowSettings(false)}
                />
              </div>
            )}
            
            {showImportPanel && (
              <div className="mb-4">
                <ImportStoriesPanel 
                  onImportComplete={(importedCount: number, positions?: Record<string, any>) => {
                    // Refresh stories list after import
                    console.log(`Imported ${importedCount} stories`);
                    
                    // Update matrix positions if provided
                    if (positions && Object.keys(positions).length > 0) {
                      setStoryPositions(prev => ({
                        ...prev,
                        ...positions
                      }));
                      
                      // Show success notification
                      setNotification({
                        type: 'success',
                        message: `Imported ${importedCount} stories with ${Object.keys(positions).length} positioned in matrix`
                      });
                    } else {
                      setNotification({
                        type: 'success',
                        message: `Imported ${importedCount} stories`
                      });
                    }
                    
                    setShowImportPanel(false);
                  }}
                  onClose={() => setShowImportPanel(false)}
                />
              </div>
            )}
            
            {showExportPanel && (
              <div className="mb-4">
                <ExportPanel
                  metrics={metrics}
                  scenarioId={null}
                  scenarioName={'Current Scenario'}
                  settings={settings}
                  stories={stories}
                  storyPositions={storyPositions}
                  onClose={() => setShowExportPanel(false)}
                />
              </div>
            )}
            
            {showBacklogManager && (
              <div className="mb-4">
                <BacklogManager
                  stories={stories}
                  onImport={handleImportStories}
                  onClearBacklog={handleClearBacklog}
                  onClose={() => setShowBacklogManager(false)}
                />
              </div>
            )}
            
            <MetricsPanel
              metrics={metrics}
              animatedMetrics={animatedMetrics}
              metricsChanging={metricsChanging}
              settings={settings}
              onSettingsClick={() => setShowSettings(!showSettings)}
              onImportStoriesClick={() => setShowImportPanel(!showImportPanel)}
              onExportClick={() => setShowExportPanel(!showExportPanel)}
            />
            
            <button
              onClick={handleRemoveAllFromMatrix}
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
              title="Remove all stories from the matrix"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              Remove All
            </button>
          </div>
        </div>
        
        <DragOverlay>
          {activeId && activeStory ? (
            <div className="w-full max-w-md opacity-80">
              <StoryCard
                story={activeStory}
                position={storyPositions[activeId] || { value: "medium", effort: "medium" }}
                isDragging={true}
                isExpanded={false}
                onToggleExpand={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
        
        {/* Effort Mismatch Modal */}
        {pendingStoryPlacement && (
          <EffortMismatchModal
            storyTitle={stories.find(s => s._id === pendingStoryPlacement?.storyId)?.title || ''}
            storyPoints={stories.find(s => s._id === pendingStoryPlacement?.storyId)?.storyPoints || 0}
            cellEffort={pendingStoryPlacement?.effortLevel}
            suggestedPoints={pendingStoryPlacement?.suggestedPoints}
            onAdjustPoints={handleAdjustStoryPoints}
            onKeepAsIs={handleKeepStoryPoints}
            onCancel={handleCancelPlacement}
            validationErrors={validationErrors}
          />
        )}
        
        {/* Share Project Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <ShareProject
              stories={stories}
              businessValues={["Critical", "Important", "Nice to Have"]}
              categories={["Feature", "Bug", "Tech Debt", "Security", "UI/UX", "Documentation"]}
              effortCategories={["Low", "Medium", "High"]}
              onClose={() => setShowShareModal(false)}
            />
          </div>
        )}
        
        {/* Notification */}
        {notification && (
          <Notification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}
        
        {/* Backlog Manager Modal */}
        {showBacklogManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
              <BacklogManager
                stories={stories}
                onImport={handleImportStories}
                onClearBacklog={handleClearBacklog}
                onClose={() => setShowBacklogManager(false)}
              />
            </div>
          </div>
        )}
      </DndContext>
    </>
  );
}
