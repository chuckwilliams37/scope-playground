"use client";

import { useState } from 'react';

export type Settings = {
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
  contributorDetails?: {
    id: string;
    name: string;
    role: string;
    allocation: number;
    costPerDay: number;
  }[];
  aiSimulationEnabled: boolean;
  selfManagedPartner: {
    enabled: boolean;
    managementReductionPercent: number;
  };
  pointsToHoursConversion: number;
};

type SettingsPanelProps = {
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
  onClose: () => void;
};

const calculateAiTimelineImpact = (settings: Settings) => {
  // Calculate the weighted average of AI productivity gains
  const factors = settings.aiProductivityFactors;
  
  // Each factor is a percentage value (0-100)
  // We treat each as a percentage reduction in effort for that category
  // We assume each category represents an equal portion of development effort
  const categories = [
    factors.linesOfCode,
    factors.testing,
    factors.debugging,
    factors.systemDesign,
    factors.documentation
  ];
  
  // Calculate the weighted average productivity gain (ensure it's positive)
  const averageGainPercent = categories.reduce((sum, val) => sum + Math.max(0, val), 0) / categories.length;
  
  // Cap the maximum gain at 65% based on 2025 research data
  return Math.min(65, Math.round(averageGainPercent * 10) / 10);
};

const calculateAiCostImpact = (settings: Settings) => {
  // Cost impact directly correlates to timeline impact
  // They represent the same productivity gain just expressed differently
  return calculateAiTimelineImpact(settings);
};

export function SettingsPanel({
  settings,
  onUpdateSettings,
  onClose
}: SettingsPanelProps) {
  const [tempSettings, setTempSettings] = useState<Settings>({...settings});
  
  const handleInputChange = (key: keyof Settings, value: any) => {
    // Apply value constraints for specific inputs
    let adjustedValue = value;
    
    // Make hours per day snap to the nearest 0.25 hr
    if (key === 'hoursPerDay') {
      adjustedValue = Math.round(value * 4) / 4; // Snap to nearest 0.25
    }
    // Make contributors snap to the nearest 0.5
    else if (key === 'contributorCount') {
      adjustedValue = Math.round(value * 2) / 2; // Snap to nearest 0.5
    }
    // Cap contributor allocation at 95%
    else if (key === 'contributorAllocation') {
      adjustedValue = Math.min(95, value);
    }
    
    setTempSettings({
      ...tempSettings,
      [key]: adjustedValue
    });
  };
  
  const handleScopeLimiterChange = (key: keyof typeof tempSettings.scopeLimiters, value: number) => {
    setTempSettings({
      ...tempSettings,
      scopeLimiters: {
        ...tempSettings.scopeLimiters,
        [key]: { 
          ...tempSettings.scopeLimiters[key],
          default: value 
        }
      }
    });
  };
  
  const handleAiFactorChange = (key: keyof typeof tempSettings.aiProductivityFactors, value: number) => {
    setTempSettings({
      ...tempSettings,
      aiProductivityFactors: {
        ...tempSettings.aiProductivityFactors,
        [key]: value
      }
    });
  };
  
  const handleSelfManagedPartnerToggle = (enabled: boolean) => {
    setTempSettings({
      ...tempSettings,
      selfManagedPartner: {
        ...tempSettings.selfManagedPartner,
        enabled
      }
    });
  };
  
  const handleSelfManagedPartnerReductionChange = (value: number) => {
    setTempSettings({
      ...tempSettings,
      selfManagedPartner: {
        ...tempSettings.selfManagedPartner,
        managementReductionPercent: value
      }
    });
  };
  
  const handleSave = () => {
    onUpdateSettings(tempSettings);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Project Settings</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team Configuration Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Team Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contributor Cost (per day): ${tempSettings.contributorCost}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="300"
                    max="2500"
                    step="50"
                    value={tempSettings.contributorCost}
                    onChange={(e) => handleInputChange('contributorCost', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-16">
                    <input
                      type="number"
                      min="300"
                      max="2500"
                      step="50"
                      value={tempSettings.contributorCost}
                      onChange={(e) => handleInputChange('contributorCost', parseInt(e.target.value))}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Equivalent hourly rate: ${Math.round(tempSettings.contributorCost / tempSettings.hoursPerDay)} per hour
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Contributors: {tempSettings.contributorCount}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={tempSettings.contributorCount}
                    onChange={(e) => handleInputChange('contributorCount', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-16">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      step="0.5"
                      value={tempSettings.contributorCount}
                      onChange={(e) => handleInputChange('contributorCount', parseFloat(e.target.value))}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours per Day: {tempSettings.hoursPerDay}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="12"
                    step="0.25"
                    value={tempSettings.hoursPerDay}
                    onChange={(e) => handleInputChange('hoursPerDay', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-16">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      step="0.25"
                      value={tempSettings.hoursPerDay}
                      onChange={(e) => handleInputChange('hoursPerDay', parseFloat(e.target.value))}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="8"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contributor Allocation: {tempSettings.contributorAllocation}%
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="10"
                    max="95"
                    step="5"
                    value={tempSettings.contributorAllocation}
                    onChange={(e) => handleInputChange('contributorAllocation', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-16">
                    <input
                      type="number"
                      min="10"
                      max="95"
                      step="5"
                      value={tempSettings.contributorAllocation}
                      onChange={(e) => handleInputChange('contributorAllocation', parseInt(e.target.value))}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  100% allocation is unrealistic - maximum is capped at 95% to account for meetings, emails, etc.
                </div>
              </div>
              
              {/* Self-Managed Partner Section */}
              <div className="mt-6 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Self-Managed Partner</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={tempSettings.selfManagedPartner.enabled}
                      onChange={(e) => handleSelfManagedPartnerToggle(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  Reduces account management overhead to zero and project management overhead by the percentage below.
                </div>
                
                <div className={tempSettings.selfManagedPartner.enabled ? "" : "opacity-50 pointer-events-none"}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Management Reduction: {tempSettings.selfManagedPartner.managementReductionPercent}%
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="20"
                      max="80"
                      step="5"
                      value={tempSettings.selfManagedPartner.managementReductionPercent}
                      onChange={(e) => handleSelfManagedPartnerReductionChange(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      disabled={!tempSettings.selfManagedPartner.enabled}
                    />
                    <div className="w-16">
                      <input
                        type="number"
                        min="20"
                        max="80"
                        step="5"
                        value={tempSettings.selfManagedPartner.managementReductionPercent}
                        onChange={(e) => handleSelfManagedPartnerReductionChange(parseInt(e.target.value))}
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        disabled={!tempSettings.selfManagedPartner.enabled}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Scope Limits Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Scope Limits</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Story Points: {tempSettings.scopeLimiters.points.default}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="20"
                    max="200"
                    step="5"
                    value={tempSettings.scopeLimiters.points.default}
                    onChange={(e) => handleScopeLimiterChange('points', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-16">
                    <input
                      type="number"
                      min="20"
                      max="200"
                      step="5"
                      value={tempSettings.scopeLimiters.points.default}
                      onChange={(e) => {
                        // Ensure the value snaps to the nearest 5
                        const rawValue = parseInt(e.target.value);
                        const snappedValue = Math.round(rawValue / 5) * 5;
                        handleScopeLimiterChange('points', snappedValue);
                      }}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Hours: {tempSettings.scopeLimiters.hours.default}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="40"
                    max="1000"
                    step="5"
                    value={tempSettings.scopeLimiters.hours.default}
                    onChange={(e) => handleScopeLimiterChange('hours', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-16">
                    <input
                      type="number"
                      min="40"
                      max="1000"
                      step="5"
                      value={tempSettings.scopeLimiters.hours.default}
                      onChange={(e) => {
                        // Ensure the value snaps to the nearest 5
                        const rawValue = parseInt(e.target.value);
                        const snappedValue = Math.round(rawValue / 5) * 5;
                        handleScopeLimiterChange('hours', snappedValue);
                      }}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Duration ({tempSettings.scopeLimiters.duration.unit}): {tempSettings.scopeLimiters.duration.default}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="5"
                    max="90"
                    step="5"
                    value={tempSettings.scopeLimiters.duration.default}
                    onChange={(e) => handleScopeLimiterChange('duration', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-16">
                    <input
                      type="number"
                      min="5"
                      max="90"
                      step="5"
                      value={tempSettings.scopeLimiters.duration.default}
                      onChange={(e) => {
                        // Ensure the value snaps to the nearest 5
                        const rawValue = parseInt(e.target.value);
                        const snappedValue = Math.round(rawValue / 5) * 5;
                        handleScopeLimiterChange('duration', snappedValue);
                      }}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Points to Hours Conversion Rate */}
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">Points to Hours Conversion</dt>
            <dd className="mt-1 flex text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <div className="flex-grow">
                <div className="flex items-center">
                  <input
                    type="range"
                    min="5"
                    max="12"
                    step="0.5"
                    value={tempSettings.pointsToHoursConversion || 8}
                    onChange={(e) => handleInputChange('pointsToHoursConversion', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5 hours</span>
                  <span>{tempSettings.pointsToHoursConversion || 8} hours per point</span>
                  <span>12 hours</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  How many hours each story point represents in effort estimation.
                </p>
              </div>
            </dd>
          </div>
          
          {/* AI Productivity Section */}
          <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
            <h3 className="text-lg font-medium mb-4">AI Productivity Factors</h3>
            <p className="text-sm text-gray-500 mb-4">
              Set the percentage of productivity gain from AI for each development activity.
            </p>
            
            {/* AI Simulation Toggle */}
            <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-blue-800">AI Productivity Simulation</div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                  <input
                    type="checkbox"
                    name="toggle"
                    id="aiSimulation"
                    checked={tempSettings.aiSimulationEnabled}
                    onChange={(e) => {
                      setTempSettings({
                        ...tempSettings,
                        aiSimulationEnabled: e.target.checked
                      });
                    }}
                    className="sr-only"
                  />
                  <label
                    htmlFor="aiSimulation"
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${tempSettings.aiSimulationEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                  >
                    <span 
                      className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${tempSettings.aiSimulationEnabled ? 'translate-x-6' : 'translate-x-0'}`} 
                    />
                  </label>
                </div>
              </div>
              
              <div className={`${tempSettings.aiSimulationEnabled ? 'block' : 'hidden'}`}>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-white p-2 rounded-md border border-blue-100 text-center">
                    <div className="text-xs text-gray-500">Timeline Impact</div>
                    <div className="text-lg font-bold text-blue-700">
                      {calculateAiTimelineImpact(tempSettings)}%
                    </div>
                    <div className="text-xs text-gray-600">faster delivery</div>
                  </div>
                  
                  <div className="bg-white p-2 rounded-md border border-blue-100 text-center">
                    <div className="text-xs text-gray-500">Cost Impact</div>
                    <div className="text-lg font-bold text-green-700">
                      {calculateAiCostImpact(tempSettings)}%
                    </div>
                    <div className="text-xs text-gray-600">cost reduction</div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 italic">
                  The above estimates show the projected impact of AI assistance compared to traditional development methods.
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lines of Code Generation (%): {tempSettings.aiProductivityFactors.linesOfCode}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tempSettings.aiProductivityFactors.linesOfCode}
                    onChange={(e) => handleAiFactorChange('linesOfCode', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-16">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={tempSettings.aiProductivityFactors.linesOfCode}
                      onChange={(e) => handleAiFactorChange('linesOfCode', parseInt(e.target.value))}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Testing (%): {tempSettings.aiProductivityFactors.testing}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tempSettings.aiProductivityFactors.testing}
                    onChange={(e) => handleAiFactorChange('testing', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-16">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={tempSettings.aiProductivityFactors.testing}
                      onChange={(e) => handleAiFactorChange('testing', parseInt(e.target.value))}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Debugging (%): {tempSettings.aiProductivityFactors.debugging}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tempSettings.aiProductivityFactors.debugging}
                    onChange={(e) => handleAiFactorChange('debugging', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-16">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={tempSettings.aiProductivityFactors.debugging}
                      onChange={(e) => handleAiFactorChange('debugging', parseInt(e.target.value))}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Design (%): {tempSettings.aiProductivityFactors.systemDesign}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tempSettings.aiProductivityFactors.systemDesign}
                    onChange={(e) => handleAiFactorChange('systemDesign', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-16">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={tempSettings.aiProductivityFactors.systemDesign}
                      onChange={(e) => handleAiFactorChange('systemDesign', parseInt(e.target.value))}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Documentation (%): {tempSettings.aiProductivityFactors.documentation}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tempSettings.aiProductivityFactors.documentation}
                    onChange={(e) => handleAiFactorChange('documentation', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-16">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={tempSettings.aiProductivityFactors.documentation}
                      onChange={(e) => handleAiFactorChange('documentation', parseInt(e.target.value))}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-4 py-2 rounded shadow-sm hover:bg-blue-700"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
