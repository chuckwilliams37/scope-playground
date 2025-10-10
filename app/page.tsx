"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { SettingsPanel, type Settings } from "../components/SettingsPanel";
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
import { Story as ImportedStory } from '../types/index';
import { StoryForm } from '../components/StoryForm';

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
const sampleStories: ImportedStory[] = [
  {
    _id: 'story-001',
    title: 'Client-Specific Story Access',
    userStory: 'As a logged-in client, I can only view user stories that have been explicitly shared with me by the admin or PM.',
    points: 5,
    storyPoints: 5,
    businessValue: 'Critical',
    category: 'Access Control',
    effortCategory: 'Security',
    notes: "This enables multi-tenant usage where each client only sees relevant stories",
    acceptanceCriteria: [
      "The client can only see stories shared with them.",
      "The client cannot see stories not shared with them."
    ]
  },
  {
    _id: 'story-002',
    title: 'Backlog Story Viewer',
    businessValue: 'Critical',
    storyPoints: 3,
    notes: 'View list of stories with expandable detail',
    userStory: 'As a client, I can see a list of user stories with expandable detail (not editable), including story points and business value.',
    category: 'Story Management',
    acceptanceCriteria: [
      "The client can view a list of stories.",
      "The client can expand story details."
    ]
  },
  {
    _id: 'story-003',
    title: 'Scope Matrix Drag-and-Drop',
    businessValue: 'Important',
    storyPoints: 8,
    notes: 'Drag-and-drop with effort validation feedback',
    userStory: 'As a client, I can drag and drop features into the scope matrix. If effort is mismatched for a column, the system prompts me with effort adjustment options.',
    category: 'UI Interaction',
    acceptanceCriteria: [
      "The client can drag and drop features into the scope matrix.",
      "The system prompts the client with effort adjustment options when effort is mismatched."
    ]
  },
  {
    _id: 'story-004',
    title: 'Business Value Mismatch Explanation',
    businessValue: 'Important',
    storyPoints: 5,
    notes: 'Contextual messages for value mismatches',
    userStory: 'When I move a low-value item into a high-priority scope bucket (or vice versa), the system explains the meaning of this mismatch with distinct contextual messages.',
    category: 'UX Enhancement',
    acceptanceCriteria: [
      "The system explains the meaning of the mismatch when a low-value item is moved to a high-priority scope bucket.",
      "The system explains the meaning of the mismatch when a high-value item is moved to a low-priority scope bucket."
    ]
  },
  {
    _id: 'story-005',
    title: 'Real-Time Scope Metrics Panel',
    businessValue: 'Critical',
    storyPoints: 8,
    notes: 'Live metrics for points, days, and cost',
    userStory: 'As a client or admin, I want to see live scope metrics like total story points, estimated dev days, and projected cost as I change the scope matrix.',
    category: 'Analytics',
    acceptanceCriteria: [
      "The client can view live scope metrics.",
      "The metrics update in real-time as the scope matrix changes."
    ]
  },
  {
    _id: 'story-006',
    title: 'Scenario Presets and Reset',
    businessValue: 'Important',
    storyPoints: 3,
    notes: 'Load recommended configs and reset scope',
    userStory: 'As a user, I can load recommended configurations such as MVP or Legacy Parity and reset my scope decisions to predefined presets.',
    category: 'Configuration',
    acceptanceCriteria: [
      "The user can load recommended configurations.",
      "The user can reset their scope decisions to predefined presets."
    ]
  },
  {
    _id: 'story-007',
    title: 'Save and Load Scenarios',
    businessValue: 'Important',
    storyPoints: 5,
    notes: 'Save configurations for later comparison',
    userStory: 'As a client, I can save scope matrix configurations and reload them later for comparison or revision.',
    category: 'Data Management',
    acceptanceCriteria: [
      "The client can save scope matrix configurations.",
      "The client can reload saved configurations for comparison or revision."
    ]
  },
  {
    _id: 'story-008',
    title: 'AI Productivity Factor Adjustment',
    businessValue: 'Important',
    storyPoints: 5,
    notes: 'Adjust how AI impacts productivity',
    userStory: 'As a product manager, I can adjust the estimated productivity gains from AI-assisted development in different categories to refine time and cost projections.',
    category: 'Planning',
    acceptanceCriteria: [
      "The product manager can adjust the estimated productivity gains from AI-assisted development.",
      "The adjustments refine time and cost projections."
    ]
  },
  {
    _id: 'story-009',
    title: 'Scope Limiters',
    businessValue: 'Nice to Have',
    storyPoints: 3,
    notes: 'Set maximum points, hours, and duration',
    userStory: 'As a client, I can set maximum limits for story points, development hours, and project duration to visualize scope constraints clearly.',
    category: 'Planning',
    acceptanceCriteria: [
      "The client can set maximum limits for story points.",
      "The client can set maximum limits for development hours.",
      "The client can set maximum limits for project duration."
    ]
  },
  {
    _id: 'story-010',
    title: 'Multi-Client Support',
    businessValue: 'Critical',
    storyPoints: 13,
    userStory: 'As an administrator, I can restrict client access to only their relevant stories.',
    category: 'Access Control',
    effortCategory: 'Security',
    notes: "This enables multi-tenant usage where each client only sees relevant stories",
    acceptanceCriteria: [
      "The client can only see stories shared with them.",
      "The client cannot see stories not shared with them.",
      "Administrators can control which stories are shared with each client.",
      "Changes to sharing permissions take effect immediately."
    ]
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
// Use the Settings type from SettingsPanel for consistency

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
  selfManagedPartner: { enabled: false, managementReductionPercent: 0 },
  pointsToHoursConversion: 8,
};

// Type for story positions
type StoryPosition = {
  value: string;
  effort: string;
  rank: number;
};

// Define a more compatible Story type that accommodates both app types
type AppStory = {
  _id: string;
  id?: string; // Support both _id and id
  title: string;
  businessValue?: string;
  storyPoints?: number;
  points?: number;
  originalPoints?: number;
  adjustmentReason?: string;
  notes?: string;
  userStory?: string;
  category?: string;
  acceptanceCriteria?: string[];
  effortCategory?: string;
  urlPath?: string; // Add missing urlPath property
};

type Story = AppStory;

export default function ScopePlaygroundPage() {
  // Initial log to confirm component render with latest code
  console.log('[ScopePlaygroundPage Render - ROOT] Component rendering...');

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
    originalPoints: story.originalPoints,
    acceptanceCriteria: story.acceptanceCriteria || []
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
  const [showScenariosPanel, setShowScenariosPanel] = useState(false);
  
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
  // Matrix edit dialog state
  const [matrixEditingStory, setMatrixEditingStory] = useState<Story | null>(null);

  // State to track saved scenarios from localStorage
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);

  // Load saved scenarios from localStorage
  useEffect(() => {
    try {
      const storedScenarios = JSON.parse(localStorage.getItem('savedScenarios') || '[]');
      console.log('[ScopePlayground] Loading scenarios from localStorage:', storedScenarios);
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
    const story = stories.find(s => s._id === storyId || s.id === storyId);
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

  // Function to map position value to standardized business value
  const mapPositionToBusinessValue = (value: string): string => {
    // Map matrix position values to standardized business values
    if (value === 'high' || value === 'critical') return 'Critical';
    if (value === 'medium' || value === 'important') return 'Important';
    if (value === 'low' || value === 'nice-to-have') return 'Nice to Have';
    return 'Important'; // Default fallback
  };

  // Fix the valuePointsMapping to use a more flexible Record type
  const valuePointsMapping: Record<string, number> = {
    'high': 8,
    'medium': 5,
    'low': 2,
    // Add standardized values for compatibility
    'critical': 8,
    'important': 5,
    'nice-to-have': 2
  };

  // Fix the effortPointsMapping to use a more flexible Record type  
  const effortPointsMapping: Record<string, number> = {
    'high': 8,
    'medium': 5,
    'low': 2
  };

  // Function to convert URL paths to a readable format for displaying in the UI
  const formatUrlPath = (story: Story): string => {
    // Handle the case where urlPath might be undefined
    const urlPath = story.urlPath || '';
    
    return urlPath
      .replace(/\/+/g, '/') // Replace multiple slashes with single slash
      .replace(/^\//, '')   // Remove leading slash
      .replace(/\/$/g, '')  // Remove trailing slash
      .replace(/\//g, ' → '); // Replace slashes with arrows for UI
  };

  // Single, comprehensive handleDragEnd function with effort mismatch detection
  const handleDragEnd = (event: DragEndEvent) => {
    console.log("[handleDragEnd - ROOT] Drag ended. Forcing state update.");
    const { active, over } = event;
    
    // Debugging log
    console.log("[handleDragEnd - ROOT] Previous positions:", storyPositions);
    
    if (over && over.id) {
      // Allow dragging a story back to the backlog by dropping anywhere on backlog area
      if (over.id === 'backlog-area') {
        const storyId = active.id as string;
        setStoryPositions(prev => {
          const copy = { ...prev };
          delete copy[storyId];
          return copy;
        });
        return;
      }

      // Correctly parse the cell ID which has format 'cell-value-effort'
      const cellId = over.id as string;
      const cellParts = cellId.split('-');
      
      // Make sure we have at least 3 parts (cell, value, effort)
      if (cellParts.length < 3) {
        console.error("[handleDragEnd] Invalid cell ID format:", cellId);
        return;
      }
      
      // Extract the value and effort from parts
      const value = cellParts[1]; // Second part is the value (high/medium/low)
      const effort = cellParts[2]; // Third part is the effort (low/medium/high)
      
      console.log(`[handleDragEnd] Parsed cell ID: ${cellId} -> value: ${value}, effort: ${effort}`);
      
      const storyId = active.id as string;
      
      // Get the story object
      const story = stories.find(s => s._id === storyId || s.id === storyId);
      if (!story) {
        console.error("[handleDragEnd] Story not found:", storyId);
        return;
      }
      
      // Map cell value to proper business value terms
      const valueMap: Record<string, string> = {
        'high': 'Critical',
        'medium': 'Important', 
        'low': 'Nice to Have'
      };
      const businessValue = valueMap[value] || 'Important';
      
      // Map cell value to canonical stored values
      const canonicalValueMap: Record<string, string> = {
        'high': 'critical',
        'medium': 'important', 
        'low': 'nice-to-have'
      };
      const canonicalValue = canonicalValueMap[value] || 'important';
      
      // Log for debugging
      console.log("[handleDragEnd] Attempting to set new positions:", {
        [storyId]: { value: canonicalValue, effort }
      });
      
      // Check for effort mismatch
      const storyPoints = story.points || story.storyPoints || 0;
      let hasEffortMismatch = false;
      
      if (effort === 'low' && storyPoints > 3) {
        hasEffortMismatch = true;
      } else if (effort === 'medium' && (storyPoints < 5 || storyPoints > 8)) {
        hasEffortMismatch = true;
      } else if (effort === 'high' && storyPoints < 8) {
        hasEffortMismatch = true;
      }
      
      // Check if there's a business value mismatch
      let hasValueMismatch = false;
      if (story.businessValue && story.businessValue !== mapPositionToBusinessValue(value)) {
        hasValueMismatch = true;
        console.log(`[handleDragEnd] Business value mismatch: ${story.businessValue} vs expected ${mapPositionToBusinessValue(value)}`);
      }
      
      // Update the storyPositions state
      setStoryPositions(prev => ({
        ...prev,
        [storyId]: { value: canonicalValue, effort, rank: Date.now() } // Use timestamp for basic ranking
      }));
      
      // Only update the story's businessValue if it's not already set
      // This preserves the existing value when there's a mismatch
      if (!story.businessValue) {
        setStories(prevStories => {
          return prevStories.map(s => {
            const id = s._id || s.id;
            if (id === storyId) {
              return {
                ...s,
                businessValue // Update to the mapped value only if unset
              };
            }
            return s;
          });
        });
      }
      
      // If there's an effort mismatch, show the dialog
      if (hasEffortMismatch) {
        handleEffortMismatch(story, { value: canonicalValue, effort });
      }
      
      // Save the position to the database if needed
      if (storyId && storyId.startsWith('story-')) {
        // This is a local story, no need to save to DB
      } else {
        // Here we would save to the database
        // savePositionToDb(storyId, value, effort);
      }
    }
    
    // Clear active ID after update
    setActiveId(null);
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
      
      // Always try to update in the database regardless of ID format
      if (updateStoryMutation) {
        try {
          // Add notification for debugging
          console.log('Updating story in database:', storyId, updatedStory);
          
          await updateStoryMutation({ 
            id: storyId as unknown as Id<"stories">,
            title: updatedStory.title,
            businessValue: updatedStory.businessValue,
            points: updatedStory.storyPoints || updatedStory.points || 0,
            notes: updatedStory.notes || '',
            userStory: updatedStory.userStory || '',
            category: updatedStory.category || '',
            effortCategory: updatedStory.effortCategory || '',
            acceptanceCriteria: updatedStory.acceptanceCriteria || []
          });
          
          // Success notification
          setNotification({
            type: "success",
            message: `Story "${updatedStory.title}" updated successfully`
          });
        } catch (error) {
          console.error('Failed to update story in database:', error);
          
          // Error notification
          setNotification({
            type: "error",
            message: `Failed to update story: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
          
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
    let assignedCount = 0;
    
    storiesToAssign.forEach((story, index) => {
      if (!story._id) return;
      
      // Determine value level based on business value
      let valueLevel = 'medium'; // Default
      if (story.businessValue === 'Critical') {
        valueLevel = 'critical';
      } else if (story.businessValue === 'Important') {
        valueLevel = 'important';
      } else if (story.businessValue === 'Nice to Have') {
        valueLevel = 'nice-to-have';
      }
      
      // Determine effort level based on story points
      let effortLevel = 'medium'; // Default
      const points = story.storyPoints || story.points || 0;
      if (points <= 3 && points > 0) {
        effortLevel = 'low';
      } else if (points >= 5 && points <= 8) {
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
      assignedCount++;
      
      // Log the assignment for debugging
      console.log(`Assigned story ${story._id} (${story.title}) to ${valueLevel}/${effortLevel}`);
    });
    
    // Update all positions at once
    console.log(`Setting ${assignedCount} story positions:`, newPositions);
    setStoryPositions(newPositions);
    
    // Provide feedback
    setNotification({
      type: 'success',
      message: `Assigned ${assignedCount} stories to matrix cells based on their business value and points`
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
        title: story.title,
        businessValue: story.businessValue,
        storyPoints: story.storyPoints,
        originalPoints: story.originalPoints,
        adjustmentReason: story.adjustmentReason,
        notes: story.notes,
        userStory: story.userStory,
        acceptanceCriteria: story.acceptanceCriteria || []
      }))
    };
    
    // Store in localStorage for demo purposes
    try {
      const existingScenarios = JSON.parse(localStorage.getItem('savedScenarios') || '[]');
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
      
      localStorage.setItem('savedScenarios', JSON.stringify([...existingScenarios, newScenario]));
      console.log('Scenario saved successfully:', newScenario);
      alert(`Scenario "${name}" saved successfully!`);
    } catch (error) {
      console.error('Error saving scenario:', error);
      alert('Failed to save scenario. Please try again.');
    }
    
    // In a real app, this would save to Convex
    return Promise.resolve();
  };

  const handleUpdateScenario = async (scenarioId: string, name: string, description: string) => {
    console.log(`Updating scenario: ${scenarioId}`);
    
    try {
      // Get existing scenarios
      const existingScenarios = JSON.parse(localStorage.getItem('savedScenarios') || '[]');
      
      // Find the scenario to update
      const scenarioIndex = existingScenarios.findIndex((s: any) => s._id === scenarioId);
      
      if (scenarioIndex === -1) {
        throw new Error('Scenario not found');
      }
      
      // Create updated scenario data
      const scenarioData = {
        name,
        description,
        storyPositions,
        settings,
        stories: stories.map(story => ({
          _id: story._id,
          title: story.title,
          businessValue: story.businessValue,
          storyPoints: story.storyPoints,
          originalPoints: story.originalPoints,
          adjustmentReason: story.adjustmentReason,
          notes: story.notes,
          userStory: story.userStory,
          acceptanceCriteria: story.acceptanceCriteria || []
        }))
      };
      
      // Update the scenario
      const updatedScenario = {
        ...existingScenarios[scenarioIndex],
        name,
        description,
        lastModified: Date.now(),
        data: scenarioData
      };
      
      // Replace the scenario in the array
      existingScenarios[scenarioIndex] = updatedScenario;
      
      // Save updated scenarios list
      localStorage.setItem('savedScenarios', JSON.stringify(existingScenarios));
      console.log('Scenario updated successfully:', updatedScenario);
      
      // Refresh the scenarios list
      setSavedScenarios(existingScenarios);
      
      // Show success notification
      setNotification({
        type: 'success',
        message: `Scenario "${name}" updated successfully!`
      });
    } catch (error) {
      console.error('Error updating scenario:', error);
      setNotification({
        type: 'error',
        message: 'Failed to update scenario. Please try again.'
      });
    }
    
    return Promise.resolve();
  };

  const handleDeleteScenario = async (scenarioId: string) => {
    console.log(`Deleting scenario: ${scenarioId}`);
    
    try {
      // Get existing scenarios
      const existingScenarios = JSON.parse(localStorage.getItem('savedScenarios') || '[]');
      
      // Filter out the scenario to delete
      const updatedScenarios = existingScenarios.filter((s: any) => s._id !== scenarioId);
      
      // Save updated scenarios list
      localStorage.setItem('savedScenarios', JSON.stringify(updatedScenarios));
      console.log('Scenario deleted successfully');
      
      // Refresh the scenarios list
      setSavedScenarios(updatedScenarios);
      
      // Show success notification
      setNotification({
        type: 'success',
        message: `Scenario deleted successfully`
      });
    } catch (error) {
      console.error('Error deleting scenario:', error);
      setNotification({
        type: 'error',
        message: 'Failed to delete scenario. Please try again.'
      });
    }
    
    return Promise.resolve();
  };

  const handleLoadScenario = async (scenarioId: string) => {
    console.log(`Loading scenario: ${scenarioId}`);
    
    // Handle built-in presets
    if (scenarioId === 'preset-mvp' || scenarioId === 'preset-lovable') {
      // For demo purposes, if it's the MVP preset, place critical stories in high value/low effort
      if (scenarioId === 'preset-mvp') {
        const newPositions: Record<string, StoryPosition> = {};
        
        stories.forEach((story, index) => {
          // Skip stories without IDs
          if (!story._id && !story.id) return;
          
          const storyId = story._id || story.id || `story-${index}`;
          const points = story.storyPoints || story.points || 0;
          
          // For MVP preset: include critical stories and assign effort based on points
          if (story.businessValue === 'Critical') {
            let effortLevel = 'medium';
            
            // Determine effort level based on story points
            if (points <= 3 && points > 0) {
              effortLevel = 'low';
            } else if (points >= 5 && points <= 8) {
              effortLevel = 'medium';
            } else if (points >= 8) {
              effortLevel = 'high';
            }
            
            newPositions[storyId] = { 
              value: 'critical', 
              effort: effortLevel, 
              rank: index 
            };
            
            console.log(`MVP Preset: Placed story ${storyId} (${story.title}) in critical/${effortLevel}`);
          }
        });
        
        console.log(`MVP Preset: Setting ${Object.keys(newPositions).length} story positions`);
        setStoryPositions(newPositions);
      }
      
      // For demo purposes, if it's the lovable preset, place critical and high value stories
      if (scenarioId === 'preset-lovable') {
        const newPositions: Record<string, StoryPosition> = {};
        
        stories.forEach((story, index) => {
          // Skip stories without IDs
          if (!story._id && !story.id) return;
          
          const storyId = story._id || story.id || `story-${index}`;
          const points = story.storyPoints || story.points || 0;
          
          // Determine effort level based on story points
          let effortLevel = 'medium';
          if (points <= 3 && points > 0) {
            effortLevel = 'low';
          } else if (points >= 5 && points <= 8) {
            effortLevel = 'medium';
          } else if (points >= 8) {
            effortLevel = 'high';
          }
          
          // For "Lovable" preset: include Critical and Important stories
          if (story.businessValue === 'Critical') {
            newPositions[storyId] = { 
              value: 'critical', 
              effort: effortLevel, 
              rank: index 
            };
            console.log(`Lovable Preset: Placed story ${storyId} (${story.title}) in critical/${effortLevel}`);
          } else if (story.businessValue === 'Important') {
            newPositions[storyId] = { 
              value: 'important', 
              effort: effortLevel, 
              rank: index 
            };
            console.log(`Lovable Preset: Placed story ${storyId} (${story.title}) in important/${effortLevel}`);
          }
        });
        
        console.log(`Lovable Preset: Setting ${Object.keys(newPositions).length} story positions`);
        setStoryPositions(newPositions);
      }
      
      // For any preset, show a notification
      setNotification({
        type: 'success',
        message: `Loaded ${scenarioId === 'preset-mvp' ? 'MVP' : 'Lovable Product'} preset`,
        duration: 3000
      });
      
      return;
    } else {
      // Load user-saved scenario from localStorage
      try {
        // Find the scenario in localStorage
        const scenario = savedScenarios.find(s => s._id === scenarioId);
        
        if (scenario && scenario.data) {
          // Make a copy of the current stories
          let currentStories = [...stories];
          let updatedStories = [...currentStories];
          
          // Restore story adjustments if present and restore deleted stories
          if (scenario.data.stories && scenario.data.stories.length > 0) {
            const currentStoryIds = new Set(currentStories.map(s => s._id));
            
            // First update existing stories
            updatedStories = currentStories.map(story => {
              const savedStory = scenario.data.stories.find((s: any) => s._id === story._id);
              if (savedStory) {
                return {
                  ...story,
                  storyPoints: savedStory.storyPoints || story.storyPoints,
                  points: savedStory.storyPoints || story.points,
                  originalPoints: savedStory.originalPoints || story.originalPoints,
                  adjustmentReason: savedStory.adjustmentReason || story.adjustmentReason,
                  acceptanceCriteria: savedStory.acceptanceCriteria || []
                };
              }
              return story;
            });
            
            // Then add any stories that exist in the scenario but not in current stories (deleted stories)
            const storiesToRestore = scenario.data.stories
              .filter((s: any) => !currentStoryIds.has(s._id))
              .map((savedStory: any) => {
                // Debug what data we have for the story
                console.log('Restoring story data:', JSON.stringify(savedStory, null, 2));
                
                return {
                  _id: savedStory._id,
                  title: savedStory.title || "Untitled Story",
                  businessValue: savedStory.businessValue || undefined,
                  storyPoints: savedStory.storyPoints || 0,
                  points: savedStory.storyPoints || 0,
                  originalPoints: savedStory.originalPoints,
                  adjustmentReason: savedStory.adjustmentReason,
                  notes: savedStory.notes || "",
                  userStory: savedStory.userStory || "",
                  category: savedStory.category || "Restored",
                  acceptanceCriteria: savedStory.acceptanceCriteria || []
                };
              });
            
            if (storiesToRestore.length > 0) {
              updatedStories = [...updatedStories, ...storiesToRestore];
              console.log(`Restored ${storiesToRestore.length} previously deleted stories:`, storiesToRestore);
              
              // Show notification about restored stories
              setNotification({
                type: 'info',
                message: `Restored ${storiesToRestore.length} stories that were previously deleted`
              });
            }
          }
          
          // Update stories state
          setStories(updatedStories);
          
          // Restore settings if present
          if (scenario.data.settings) {
            // Create a compatible settings object matching Settings type
            const raw = scenario.data.settings as any;
            const compatibleSettings: Settings = {
              ...settings,
              ...raw,
              contributorCost: raw.contributorCost ?? settings.contributorCost,
              contributorCount: raw.contributorCount ?? settings.contributorCount,
              hoursPerDay: raw.hoursPerDay ?? settings.hoursPerDay,
              contributorAllocation: raw.contributorAllocation ?? settings.contributorAllocation,
              selfManagedPartner: typeof raw.selfManagedPartner === 'object'
                ? { enabled: !!raw.selfManagedPartner.enabled, managementReductionPercent: raw.selfManagedPartner.managementReductionPercent ?? 0 }
                : { enabled: !!raw.selfManagedPartner, managementReductionPercent: 0 },
              pointsToHoursConversion: raw.pointsToHoursConversion ?? settings.pointsToHoursConversion,
            };
            setSettings(compatibleSettings);
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
                  let value = typeof pos.value === 'string' ? pos.value : 'important';
                  
                  // Map legacy values to standardized values if needed
                  if (value === 'high') value = 'critical';
                  else if (value === 'medium') value = 'important';
                  else if (value === 'low') value = 'nice-to-have';
                  
                  // Create position with standardized values and ensure rank exists
                  positionsWithRank[id] = {
                    value,
                    effort: typeof pos.effort === 'string' ? pos.effort : 'medium',
                    rank: typeof pos.rank === 'number' ? pos.rank : index
                  };
                }
              });
              
              // Set the positions with proper types
              console.log("[handleLoadScenario] Setting positions:", positionsWithRank);
              
              // Force a state update 
              setStoryPositions(prev => {
                console.log("[handleLoadScenario] Previous positions:", prev);
                console.log("[handleLoadScenario] New positions:", positionsWithRank);
                return positionsWithRank;
              });
            }
          }, 100); // Increased timeout to ensure React has fully updated
          
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
    console.log(`Loading preset: ${presetType}. Forcing state update.`);
    setStoryPositions(prev => {
      console.log('Previous positions:', prev);
      const newPositions = {
        ...prev,
        'story-002': { value: 'important', effort: 'medium', rank: Date.now() } // Include required rank property
      };
      console.log('Attempting to set new positions:', newPositions);
      return newPositions;
    });
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
    duration?: number;
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
          category: story.category || "Feature",
          acceptanceCriteria: story.acceptanceCriteria || []
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
  const handleStoryUpdate = async (
    storyId: string,
    value: 'high' | 'medium' | 'low',
    effort: 'high' | 'medium' | 'low'
  ) => {
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

  // Update story points in both local state and database
  const handleAdjustPoints = async (storyId: string, newPoints: number, reason: string) => {
    // Find the story in our local state
    const story = stories.find(s => s._id === storyId || s.id === storyId);
    if (!story) return false;
    
    // Update our local state
    setStories(prev => prev.map(s => {
      if (s._id === storyId || s.id === storyId) {
        return {
          ...s,
          points: newPoints,
          storyPoints: newPoints,
          adjustmentReason: reason
        };
      }
      return s;
    }));
    
    // If it's a Convex story with _id, update in the database
    if (story._id) {
      try {
        // await adjustStoryPoints({ id: story._id, newPoints, adjustmentReason: reason });
        return true;
      } catch (error) {
        console.error('Failed to adjust story points:', error);
        return false;
      }
    }
    
    return true;
  };

  // State for effort mismatch dialog
  const [showEffortMismatchDialog, setShowEffortMismatchDialog] = useState(false);
  const [mismatchedStory, setMismatchedStory] = useState<Story | null>(null);
  const [mismatchPosition, setMismatchPosition] = useState<{ value: string, effort: string } | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustedPoints, setAdjustedPoints] = useState(0);

  // Handle effort mismatch when dropping a story in a cell with mismatched points
  const handleEffortMismatch = (story: Story, position: { value: string, effort: string }) => {
    // Show dialog to let user decide what to do
    setMismatchedStory(story);
    setMismatchPosition(position);
    setAdjustedPoints(story.points || story.storyPoints || 0);
    setAdjustmentReason('');
    setShowEffortMismatchDialog(true);
  };

  // Keep the original story points and continue with placement
  const handleKeepStoryPoints = () => {
    // Keep original points but continue with placement
    setShowEffortMismatchDialog(false);
    
    // Story and position were already added to storyPositions during handleDragEnd
    // Just clear the dialog state
    setMismatchedStory(null);
    setMismatchPosition(null);
  };

  // Cancel the placement and remove from storyPositions
  const handleCancelPlacement = () => {
    // Cancel the placement entirely
    if (mismatchedStory && (mismatchedStory._id || mismatchedStory.id)) {
      const storyId = mismatchedStory._id || mismatchedStory.id;
      
      // Remove from storyPositions
      setStoryPositions(prev => {
        const updated = { ...prev };
        delete updated[storyId as string];
        return updated;
      });
    }
    
    // Clear the dialog state
    setShowEffortMismatchDialog(false);
    setMismatchedStory(null);
    setMismatchPosition(null);
  };

  // Adjust points to match the expected range for the cell
  const handleAdjustToMatch = () => {
    if (!mismatchedStory || !mismatchPosition) return;
    
    const storyId = mismatchedStory._id || mismatchedStory.id;
    if (!storyId) return;
    
    // Get suggested points based on the effort level of the cell
    let suggestedPoints = adjustedPoints;
    if (mismatchPosition.effort === 'low' && adjustedPoints > 3) {
      suggestedPoints = 3; // Max for low effort
    } else if (mismatchPosition.effort === 'medium' && (adjustedPoints < 5 || adjustedPoints > 8)) {
      suggestedPoints = adjustedPoints < 5 ? 5 : 8; // Adjust to valid medium effort range
    } else if (mismatchPosition.effort === 'high' && adjustedPoints < 8) {
      suggestedPoints = 8; // Min for high effort
    }
    
    // Apply the adjustment if reason is provided
    if (adjustmentReason.trim()) {
      handleAdjustPoints(storyId as string, suggestedPoints, adjustmentReason);
    }
    
    // Close the dialog
    setShowEffortMismatchDialog(false);
    setMismatchedStory(null);
    setMismatchPosition(null);
  };

  // Define effort thresholds for effort levels with proper indexing type
  const effortThresholds: Record<string, {min?: number, max?: number}> = {
    'low': { max: 3 },
    'medium': { min: 5, max: 8 },
    'high': { min: 8 }
  };
  
  // Check if story points are in expected range for the effort level
  const isWithinEffortRange = (points: number, effort: string): boolean => {
    // Access using indexing that now has proper typing
    const thresholds = effortThresholds[effort];
    
    if (!thresholds) return true; // If we don't have thresholds, consider it valid
    
    if ('min' in thresholds && 'max' in thresholds) {
      return points >= thresholds.min! && points <= thresholds.max!;
    } else if ('min' in thresholds) {
      return points >= thresholds.min!;
    } else if ('max' in thresholds) {
      return points <= thresholds.max!;
    }
    
    return true;
  };

  return (
    <>
      <TopNavbar
        scenarios={[...scenarioPresets, ...savedScenarios]}
        currentScenarioName={savedScenarios.find(s => 
          JSON.stringify(s.data?.storyPositions) === JSON.stringify(storyPositions)
        )?.name || "Untitled Scenario"}
        onSaveScenario={handleSaveScenario}
        onUpdateScenario={handleUpdateScenario}
        onDeleteScenario={handleDeleteScenario}
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Scope Matrix</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowScenariosPanel(true)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Manage Scenarios
                  </button>
                  <button
                    onClick={() => {
                      if (Object.keys(storyPositions).length > 0 && 
                          window.confirm('Are you sure you want to clear all stories from the matrix?')) {
                        setStoryPositions({});
                      }
                    }}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                  >
                    Clear Matrix
                  </button>
                </div>
              </div>
              <ValuesMatrix 
                storyPositions={storyPositions} 
                stories={stories}
                onUpdateStory={(story) => {
                  // Ensure the story has a valid _id before passing to handleUpdateStory
                  if (story && story._id) {
                    const ensuredStory: Story = { ...(story as any), _id: story._id as string };
                    return handleUpdateStory(story._id as string, ensuredStory);
                  }
                  return Promise.resolve(false);
                }}
                onEditStory={(story) => {
                  const ensuredId = (story as any)._id || (story as any).id;
                  if (!ensuredId) return;
                  setMatrixEditingStory({ ...(story as any), _id: ensuredId } as Story);
                }}
                expandedStoryIds={expandedStoryIds}
                toggleStoryExpansion={toggleMatrixStoryExpansion}
                totalPoints={metrics.totalPoints}
                totalEffort={metrics.adjustedEffort}
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

        {/* Matrix Edit Story Modal */}
        {matrixEditingStory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="w-full max-w-2xl">
              <StoryForm
                story={matrixEditingStory as any}
                onSave={async (updated) => {
                  if (updated && (updated as any)._id) {
                    await handleUpdateStory((updated as any)._id, updated as any);
                  }
                  setMatrixEditingStory(null);
                }}
                onCancel={() => setMatrixEditingStory(null)}
                categories={Array.from(new Set(stories.map(s => s.category).filter(Boolean)) as any) as string[]}
                businessValues={["Critical","Important","Nice to Have"]}
                effortCategories={["Low","Medium","High"]}
              />
            </div>
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
                  stories={stories.map(s => ({
                    ...s,
                    userStory: s.userStory || '',
                    businessValue: s.businessValue || 'Important',
                    category: s.category || 'Feature'
                  }))}
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
              settings={{
                contributorCost: settings.contributorCost,
                contributorCount: settings.contributorCount,
                hoursPerDay: settings.hoursPerDay,
                contributorAllocation: settings.contributorAllocation,
                scopeLimiters: settings.scopeLimiters,
                aiProductivityFactors: settings.aiProductivityFactors,
                aiSimulationEnabled: settings.aiSimulationEnabled,
                selfManagedPartner: settings.selfManagedPartner.enabled,
                pointsToHoursConversion: settings.pointsToHoursConversion,
              }}
              onSettingsClick={() => setShowSettings(!showSettings)}
              onImportStoriesClick={() => setShowImportPanel(!showImportPanel)}
              onExportClick={() => setShowExportPanel(!showExportPanel)}
            />
            
            {showScenariosPanel && (
              <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
                  <ScenarioManager
                    scenarios={savedScenarios}
                    onSaveScenario={handleSaveScenario}
                    onUpdateScenario={handleUpdateScenario}
                    onDeleteScenario={handleDeleteScenario}
                    onLoadScenario={handleLoadScenario}
                    onCreatePreset={handleCreatePreset}
                    onResetScenario={handleResetScenario}
                    onClose={() => setShowScenariosPanel(false)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <DragOverlay>
          {activeId && activeStory ? (
            <div className="w-full max-w-md opacity-80">
              <StoryCard
                story={activeStory}
                position={storyPositions[activeId] || { value: "medium", effort: "medium" }}
                isDragging 
                isExpanded={false}
                onToggleExpand={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
        
        {/* Effort Mismatch Dialog */}
        {showEffortMismatchDialog && mismatchedStory && mismatchPosition && (
          <EffortMismatchModal
            storyTitle={mismatchedStory.title || "Untitled Story"}
            storyPoints={mismatchedStory.points || mismatchedStory.storyPoints || 0}
            cellEffort={mismatchPosition.effort}
            suggestedPoints={
              mismatchPosition.effort === 'low' ? 3 :
              mismatchPosition.effort === 'medium' ? (
                (mismatchedStory.points || mismatchedStory.storyPoints || 0) < 5 ? 5 : 8
              ) : 8
            }
            onAdjustPoints={(newPoints, reason) => {
              const storyId = mismatchedStory._id || mismatchedStory.id;
              if (storyId) {
                handleAdjustPoints(storyId as string, newPoints, reason);
                setShowEffortMismatchDialog(false);
                setMismatchedStory(null);
                setMismatchPosition(null);
              }
            }}
            onKeepAsIs={handleKeepStoryPoints}
            onCancel={handleCancelPlacement}
            validationErrors={{
              adjustmentReason: adjustmentReason.trim() ? '' : undefined
            }}
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
            duration={notification.duration}
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
