"use client";

import React from 'react';
import { motion } from 'framer-motion';

type MetricsPanelProps = {
  metrics: {
    totalStories: number;
    totalPoints: number;
    rawEffort: number;
    adjustedEffort: number;
    totalDays: number;
    totalCost: number;
    scopeLimits: {
      overPoints: boolean;
      overHours: boolean;
      overDuration: boolean;
    };
    aiProductivityGain: number;
  };
  animatedMetrics: {
    totalStories: number;
    totalPoints: number;
    adjustedEffort: number;
    totalDays: number;
    totalCost: number;
  };
  metricsChanging: {
    totalStories: boolean;
    totalPoints: boolean;
    adjustedEffort: boolean;
    totalDays: boolean;
    totalCost: boolean;
  };
  settings: {
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
  };
};

export function MetricsPanel({
  metrics,
  animatedMetrics,
  metricsChanging,
  settings
}: MetricsPanelProps) {
  
  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Format number with two decimal places
  const formatNumber = (num: number) => {
    return Math.round(num * 100) / 100;
  };
  
  // Get the direction of change for a particular metric
  const getChangeDirection = (currentValue: number, animatedValue: number) => {
    if (currentValue > animatedValue) return 'up';
    if (currentValue < animatedValue) return 'down';
    return 'none';
  };
  
  // Get color for animated values (green for positive changes, red for negative)
  const getAnimationColor = (metricName: keyof typeof metricsChanging, direction: string) => {
    if (!metricsChanging[metricName]) return 'text-gray-900';
    
    // For cost and time metrics, "down" is good (green)
    if (['totalDays', 'totalCost', 'adjustedEffort'].includes(metricName)) {
      return direction === 'down' ? 'text-green-600' : 'text-red-600';
    }
    
    // For other metrics, "up" is generally good
    return direction === 'up' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 h-full">
      <h2 className="text-lg font-semibold text-gray-700 mb-3">Scope Metrics</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 bg-gray-50 p-3 rounded-md">
          <div className="text-xs uppercase text-gray-500 mb-1">Current Scope</div>
          <div className="flex justify-between items-center">
            <div className="flex items-baseline">
              <motion.span 
                key={`stories-${animatedMetrics.totalStories}`}
                className={`text-2xl font-bold ${getAnimationColor('totalStories', getChangeDirection(metrics.totalStories, animatedMetrics.totalStories))}`}
                initial={{ opacity: metricsChanging.totalStories ? 0 : 1, y: metricsChanging.totalStories ? 10 : 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75 }}
              >
                {animatedMetrics.totalStories}
              </motion.span>
              <span className="text-sm text-gray-600 ml-2">Stories</span>
            </div>
            <div className="flex items-baseline">
              <motion.span 
                key={`points-${animatedMetrics.totalPoints}`}
                className={`text-2xl font-bold ${getAnimationColor('totalPoints', getChangeDirection(metrics.totalPoints, animatedMetrics.totalPoints))}`}
                initial={{ opacity: metricsChanging.totalPoints ? 0 : 1, y: metricsChanging.totalPoints ? 10 : 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75 }}
              >
                {animatedMetrics.totalPoints}
              </motion.span>
              <span className="text-sm text-gray-600 ml-2">Points</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className={`bg-blue-50 border ${metrics.scopeLimits?.overPoints ? 'border-red-300' : 'border-blue-100'} rounded-lg p-3`}>
          <div className="text-sm text-blue-600 font-medium">Stories In Scope</div>
          <div className="text-3xl font-bold mt-1">{animatedMetrics.totalStories}</div>
          <div className="text-sm mt-1">
            {metrics.scopeLimits?.overPoints && 
              <span className="text-red-500">Exceeds point limit</span>
            }
          </div>
        </div>
        
        <div className={`bg-blue-50 border ${metrics.scopeLimits?.overHours ? 'border-red-300' : 'border-blue-100'} rounded-lg p-3`}>
          <div className="text-sm text-blue-600 font-medium">Adjusted Effort</div>
          <div className="text-3xl font-bold mt-1">{formatNumber(animatedMetrics.adjustedEffort)}</div>
          <div className="text-sm mt-1">
            {metrics.scopeLimits?.overHours && 
              <span className="text-red-500">Exceeds hour limit</span>
            }
          </div>
        </div>
        
        <div className={`bg-blue-50 border ${metrics.scopeLimits?.overDuration ? 'border-red-300' : 'border-blue-100'} rounded-lg p-3`}>
          <div className="text-sm text-blue-600 font-medium">Timeline</div>
          <div className="text-3xl font-bold mt-1">{formatNumber(animatedMetrics.totalDays)}</div>
          <div className="text-sm mt-1">
            {metrics.scopeLimits?.overDuration && 
              <span className="text-red-500">Exceeds duration limit</span>
            }
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-sm text-green-600 font-medium">Estimated Cost</div>
          <div className="text-3xl font-bold mt-1">{formatCurrency(animatedMetrics.totalCost)}</div>
          <div className="text-xs text-gray-600 mt-1">
            ({formatCurrency(settings.contributorCost * settings.contributorCount / settings.hoursPerDay)}/hour)
          </div>
        </div>
        
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-sm text-green-600 font-medium">Contributors</div>
          <div className="text-3xl font-bold mt-1">{settings.contributorCount}</div>
        </div>
        
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-sm text-green-600 font-medium">AI Productivity Gain</div>
          <div className="text-3xl font-bold mt-1">{Math.round(metrics.aiProductivityGain * 100)}%</div>
        </div>
      </div>
      
      {settings.aiSimulationEnabled && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <h3 className="text-sm font-medium text-blue-700 mb-2">AI Productivity Impact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Timeline Reduction</div>
              <div className="text-lg font-bold text-blue-700">
                {formatNumber(
                  (metrics.aiProductivityGain / metrics.adjustedEffort) * 100
                )}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Cost Savings</div>
              <div className="text-lg font-bold text-green-700">
                {formatCurrency(metrics.aiProductivityGain * settings.contributorCost / 8)}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
        <div className="font-medium mb-1">Formula</div>
        <div className="text-xs">
          {animatedMetrics.totalPoints} points × {settings.hoursPerDay} hrs/point ÷ ({settings.contributorCount} {settings.contributorCount === 1 ? 'contributor' : 'contributors'} × {settings.contributorAllocation}% allocation)
        </div>
      </div>
    </div>
  );
}
