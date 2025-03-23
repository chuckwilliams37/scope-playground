import React from 'react';

type MetricsPanelProps = {
  totalStories: number;
  totalPoints: number;
  totalEffort: number; // in hours
  developerCost: number; // per day
  developerCount: number;
  hoursPerDay: number;
  developerAllocation: number; // percentage
};

export function MetricsPanel({
  totalStories,
  totalPoints,
  totalEffort,
  developerCost,
  developerCount,
  hoursPerDay,
  developerAllocation
}: MetricsPanelProps) {
  // Calculate effective hours per day
  const effectiveHoursPerDay = (hoursPerDay * developerCount * developerAllocation) / 100;
  
  // Calculate project duration in days
  const durationDays = Math.ceil(totalEffort / effectiveHoursPerDay);
  
  // Calculate total cost
  const dailyCost = developerCount * developerCost;
  const totalCost = dailyCost * durationDays;

  return (
    <div className="bg-white border rounded-lg shadow-sm p-4">
      <h2 className="text-xl font-semibold mb-4">Scope Metrics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <div className="text-sm text-blue-600 font-medium">Stories In Scope</div>
          <div className="text-3xl font-bold mt-1">{totalStories}</div>
        </div>
        
        <div className="bg-green-50 border border-green-100 rounded-lg p-3">
          <div className="text-sm text-green-600 font-medium">Story Points</div>
          <div className="text-3xl font-bold mt-1">{totalPoints}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
          <div className="text-sm text-purple-600 font-medium">Development Effort</div>
          <div className="text-3xl font-bold mt-1">
            {totalEffort} <span className="text-sm font-normal">hours</span>
          </div>
        </div>
        
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
          <div className="text-sm text-amber-600 font-medium">Estimated Duration</div>
          <div className="text-3xl font-bold mt-1">
            {durationDays} <span className="text-sm font-normal">days</span>
          </div>
        </div>
      </div>
      
      <div className="bg-red-50 border border-red-100 rounded-lg p-3">
        <div className="text-sm text-red-600 font-medium">Projected Cost</div>
        <div className="text-3xl font-bold mt-1">
          ${totalCost.toLocaleString()} <span className="text-sm font-normal">USD</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Based on ${developerCost}/day × {developerCount} developers at {developerAllocation}% allocation
        </div>
      </div>
      
      <div className="mt-4 border-t pt-4 text-sm text-gray-500">
        <div>Effective daily capacity: {effectiveHoursPerDay.toFixed(1)} hours</div>
        <div>Calculation: {hoursPerDay} hours × {developerCount} devs × {developerAllocation}% allocation</div>
      </div>
    </div>
  );
}
