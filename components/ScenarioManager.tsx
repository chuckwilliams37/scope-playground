import React, { useState } from 'react';

type Scenario = {
  _id?: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: number;
  lastModified: number;
  isPreset: boolean;
};

type ScenarioManagerProps = {
  scenarios: Scenario[];
  onSaveScenario: (name: string, description: string) => Promise<void>;
  onLoadScenario: (scenarioId: string) => Promise<void>;
  onCreatePreset: (presetType: string) => Promise<void>;
  onResetScenario: () => void;
};

export function ScenarioManager({
  scenarios,
  onSaveScenario,
  onLoadScenario,
  onCreatePreset,
  onResetScenario
}: ScenarioManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDescription, setNewScenarioDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Sort scenarios with presets first, then by last modified date
  const sortedScenarios = [...scenarios].sort((a, b) => {
    if (a.isPreset && !b.isPreset) return -1;
    if (!a.isPreset && b.isPreset) return 1;
    return b.lastModified - a.lastModified;
  });

  const handleSaveScenario = async () => {
    if (!newScenarioName.trim()) return;
    
    setSaving(true);
    try {
      await onSaveScenario(newScenarioName.trim(), newScenarioDescription.trim());
      setNewScenarioName('');
      setNewScenarioDescription('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to save scenario:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm p-4">
      <h2 className="text-xl font-semibold mb-4">Scenario Management</h2>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <button 
          onClick={() => setIsCreating(true)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Save Current
        </button>
        <button 
          onClick={() => onCreatePreset('mvp')}
          className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
        >
          Load MVP Preset
        </button>
        <button 
          onClick={() => onCreatePreset('lovable')}
          className="px-3 py-1.5 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700"
        >
          Load Lovable Preset
        </button>
        <button 
          onClick={onResetScenario}
          className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300"
        >
          Reset All
        </button>
      </div>
      
      {isCreating && (
        <div className="mb-4 p-3 border rounded-md bg-gray-50">
          <h3 className="text-md font-medium mb-2">Save Current Scenario</h3>
          <div className="space-y-3">
            <div>
              <label htmlFor="scenarioName" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                id="scenarioName"
                type="text"
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="My Scenario"
              />
            </div>
            <div>
              <label htmlFor="scenarioDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                id="scenarioDescription"
                value={newScenarioDescription}
                onChange={(e) => setNewScenarioDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="Brief description of this scenario"
                rows={2}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScenario}
                disabled={!newScenarioName.trim() || saving}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium disabled:bg-blue-400"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {sortedScenarios.length > 0 && (
        <div>
          <h3 className="text-md font-medium mb-2">Saved Scenarios</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {sortedScenarios.map((scenario) => (
              <div 
                key={scenario._id} 
                className={`
                  p-3 border rounded-md hover:bg-gray-50 cursor-pointer
                  ${scenario.isPreset ? 'border-purple-200 bg-purple-50' : 'border-gray-200'}
                `}
                onClick={() => onLoadScenario(scenario._id as string)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900">{scenario.name}</div>
                    {scenario.description && (
                      <div className="text-sm text-gray-500">{scenario.description}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {scenario.isPreset ? (
                      <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                        Preset
                      </span>
                    ) : (
                      new Date(scenario.lastModified).toLocaleDateString()
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
