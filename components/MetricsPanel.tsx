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
    contributorCount?: number;
    effectiveContributorCount?: number;
    productivityLossPercent?: number;
    communicationOverhead?: number;
    managementOverhead?: number;
    accountManagementOverhead?: number;
    selfManagedPartnerDiscount?: number;
    rampUpOverhead?: number;
    contextSwitchingOverhead?: number;
    totalOverhead?: number;
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
  onSettingsClick?: () => void;
  onImportStoriesClick: () => void;
  onExportClick?: () => void;
  readOnly?: boolean;
};

export function MetricsPanel({
  metrics,
  animatedMetrics,
  metricsChanging,
  settings,
  onSettingsClick,
  onImportStoriesClick,
  onExportClick,
  readOnly
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
  const formatNumber = (num: number, decimalPlaces: number = 2) => {
    return Math.round(num * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
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
    <div className="bg-white rounded-lg shadow p-4 h-full" id="metrics-panel-container">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-gray-700">Scope Metrics</h2>
        <div className="mt-8 flex flex-col space-y-2">
          <button 
            onClick={onSettingsClick}
            className="flex items-center justify-center py-2 px-4 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 01.947 2.287c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Project Settings
          </button>
          
          <button 
            onClick={onImportStoriesClick}
            className="flex items-center justify-center py-2 px-4 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Import Stories
          </button>
          {onExportClick && (
            <button 
              onClick={onExportClick}
              className="flex items-center justify-center py-2 px-4 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export
            </button>
          )}
        </div>
      </div>
      
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
          <div className="text-xs text-gray-600 mt-1">
            ({Math.floor(animatedMetrics.totalDays / 7)} weeks, {Math.ceil(animatedMetrics.totalDays % 7)} days)
          </div>
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
          {metrics.effectiveContributorCount && metrics.productivityLossPercent !== undefined && settings.contributorCount > 1 && (
            <div className="text-xs mt-1">
              <div className="font-medium text-amber-600">
                Effective: {formatNumber(metrics.effectiveContributorCount)} 
                ({metrics.productivityLossPercent}% loss)
              </div>
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer font-medium text-gray-700">Team Productivity Details</summary>
                <div className="mt-2 space-y-2 text-gray-700">
                  <div className="flex justify-between items-center">
                    <span>Communication Overhead:</span>
                    <span className="font-medium">{formatNumber((metrics.communicationOverhead || 0) * 100)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Management Overhead:</span>
                    <span className="font-medium">{formatNumber((metrics.managementOverhead || 0) * 100)}%</span>
                  </div>
                  {metrics.rampUpOverhead !== undefined && (
                    <div className="flex justify-between items-center">
                      <span>Ramp-up Time:</span>
                      <span className="font-medium">{formatNumber((metrics.rampUpOverhead) * 100)}%</span>
                    </div>
                  )}
                  {metrics.contextSwitchingOverhead !== undefined && (
                    <div className="flex justify-between items-center">
                      <span>Context Switching:</span>
                      <span className="font-medium">{formatNumber((metrics.contextSwitchingOverhead) * 100)}%</span>
                    </div>
                  )}
                  {metrics.accountManagementOverhead !== undefined && (
                    <div className="flex justify-between items-center">
                      <span>Account Management:</span>
                      <span className="font-medium">{formatNumber((metrics.accountManagementOverhead) * 100)}%</span>
                    </div>
                  )}
                  {metrics.selfManagedPartnerDiscount !== undefined && (
                    <div className="flex justify-between items-center">
                      <span>Self-managed Discount:</span>
                      <span className="font-medium text-green-600">-{formatNumber((metrics.selfManagedPartnerDiscount) * 100)}%</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200 flex justify-between items-center font-medium">
                    <span>Total Overhead:</span>
                    <span>{formatNumber((metrics.totalOverhead || 0) * 100)}%</span>
                  </div>
                </div>
              </details>
            </div>
          )}
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
              <div className="text-xs text-gray-500">Cost Saved</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(
                  (metrics.aiProductivityGain / metrics.rawEffort) * metrics.totalCost
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {settings.contributorCount > 1 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <h3 className="text-sm font-medium text-amber-700 mb-2">Team Communication Impact</h3>
          <p className="text-xs text-gray-600 mb-2">
            Based on Brooks' Law, adding more people increases communication overhead. 
            With {settings.contributorCount} contributors, there are {Math.round((settings.contributorCount * (settings.contributorCount - 1)) / 2)} possible communication paths.
          </p>
          <div className="grid grid-cols-2 gap-4 mb-2">
            <div>
              <div className="text-xs text-gray-500">Productivity Loss</div>
              <div className="text-lg font-bold text-amber-700">
                {metrics.productivityLossPercent}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Effective Team Size</div>
              <div className="text-lg font-bold text-amber-700">
                {formatNumber(metrics.effectiveContributorCount || 0)}
              </div>
            </div>
          </div>
          
          <div className="text-xs font-medium text-amber-700 mb-1">Breakdown of Overhead Factors:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-amber-100 p-2 rounded">
              <div className="text-xs text-gray-600">Communication</div>
              <div className="text-sm font-medium">{formatNumber(metrics.communicationOverhead || 0, 1)}</div>
            </div>
            <div className="bg-amber-100 p-2 rounded">
              <div className="text-xs text-gray-600">Project Management</div>
              <div className="text-sm font-medium">{formatNumber(metrics.managementOverhead || 0, 1)}</div>
            </div>
            <div className="bg-amber-100 p-2 rounded">
              <div className="text-xs text-gray-600">Account Management</div>
              <div className="text-sm font-medium">{formatNumber(metrics.accountManagementOverhead || 0, 1)}</div>
              <div className="text-xs text-gray-500">White-glove service</div>
            </div>
            <div className="bg-amber-100 p-2 rounded">
              <div className="text-xs text-gray-600">Ramp-up Time</div>
              <div className="text-sm font-medium">{formatNumber(metrics.rampUpOverhead || 0, 1)}</div>
            </div>
            <div className="bg-amber-100 p-2 rounded md:col-span-2">
              <div className="text-xs text-gray-600">Context Switching</div>
              <div className="text-sm font-medium">{formatNumber(metrics.contextSwitchingOverhead || 0, 1)}</div>
            </div>
            <div className="bg-amber-100 p-2 rounded md:col-span-2">
              <div className="text-xs text-gray-600">Total Overhead</div>
              <div className="text-sm font-medium text-amber-700">{formatNumber(metrics.totalOverhead || 0, 1)}</div>
            </div>
            {metrics.selfManagedPartnerDiscount && metrics.selfManagedPartnerDiscount > 0 && (
              <div className="bg-green-100 p-2 rounded md:col-span-4">
                <div className="text-xs text-gray-600">Self-Managed Partner Discount</div>
                <div className="text-sm font-medium text-green-700">
                  -{formatNumber(metrics.selfManagedPartnerDiscount || 0, 1)}
                  <span className="text-xs ml-1">
                    ({formatNumber(((metrics.selfManagedPartnerDiscount || 0) / ((metrics.totalOverhead || 0) + (metrics.selfManagedPartnerDiscount || 0))) * 100, 1)}% reduction)
                  </span>
                </div>
                <div className="text-xs text-gray-500">Management overhead reduction + eliminated account management</div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {settings.contributorCount > 1 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <h3 className="text-sm font-medium text-amber-700 mb-2">Team Dynamics Impact</h3>
          <p className="text-xs text-gray-600 mb-2">
            Based on Parkinson's Law and the law of diminishing returns for team size. The square root of the
            total contributors ({Math.round(Math.sqrt(settings.contributorCount))}) contributes approximately 50% of the work.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Effective Team Size</div>
              <div className="text-lg font-bold text-amber-700">
                {formatNumber(metrics.effectiveContributorCount || 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Productivity Loss</div>
              <div className="text-lg font-bold text-amber-700">
                {metrics.productivityLossPercent}%
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
