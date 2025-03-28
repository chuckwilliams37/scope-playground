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
  onCreatePreset?: (presetType: string) => Promise<void>;
  onResetScenario?: () => void;
  onUpdateScenario?: (scenarioId: string, name: string, description: string) => Promise<void>;
  onDeleteScenario?: (scenarioId: string) => Promise<void>;
  onClose?: () => void;
};

export function ScenarioManager({
  scenarios,
  onSaveScenario,
  onLoadScenario,
  onCreatePreset,
  onResetScenario,
  onUpdateScenario,
  onDeleteScenario,
  onClose
}: ScenarioManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDescription, setNewScenarioDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [sortOption, setSortOption] = useState<'default' | 'newest' | 'oldest' | 'name'>('default');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Sort scenarios based on selected sort option
  const getSortedScenarios = () => {
    let sorted = [...scenarios];
    
    switch (sortOption) {
      case 'newest':
        return sorted.sort((a, b) => b.lastModified - a.lastModified);
      case 'oldest':
        return sorted.sort((a, b) => a.lastModified - b.lastModified);
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        // Default sort: presets first, then by last modified date
        return sorted.sort((a, b) => {
          if (a.isPreset && !b.isPreset) return -1;
          if (!a.isPreset && b.isPreset) return 1;
          return b.lastModified - a.lastModified;
        });
    }
  };

  // Get sorted scenarios
  const sortedScenarios = getSortedScenarios();

  // Filter scenarios based on search term
  const filteredScenarios = sortedScenarios.filter(scenario => 
    scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (scenario.description && scenario.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get scenarios to display, either all or limited
  const displayedScenarios = showAll ? filteredScenarios : filteredScenarios.slice(0, 5);
  const hasMoreToShow = filteredScenarios.length > 5 && !showAll;
  
  // Format date for display
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

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

  const handleUpdateScenario = async (scenarioId: string) => {
    if (!newScenarioName.trim()) return;
    
    setSaving(true);
    try {
      await onUpdateScenario!(scenarioId, newScenarioName.trim(), newScenarioDescription.trim());
      setNewScenarioName('');
      setNewScenarioDescription('');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update scenario:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteScenario = async (scenarioId: string) => {
    try {
      await onDeleteScenario!(scenarioId);
      setConfirmDelete(null); // Close the confirmation dialog after deletion
    } catch (error) {
      console.error('Failed to delete scenario:', error);
      setConfirmDelete(null); // Close the dialog even if there's an error
    }
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Scenario Management</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <button 
          onClick={() => setIsCreating(true)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Save Current
        </button>
        {onCreatePreset && (
          <button 
            onClick={() => onCreatePreset('mvp')}
            className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
          >
            Load MVP Preset
          </button>
        )}
        {onCreatePreset && (
          <button 
            onClick={() => onCreatePreset('lovable')}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700"
          >
            Load Lovable Preset
          </button>
        )}
        {onResetScenario && (
          <button 
            onClick={onResetScenario}
            className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300"
          >
            Reset All
          </button>
        )}
      </div>
      
      {(isCreating || isEditing) && (
        <div className="mb-4 p-3 border rounded-md bg-gray-50">
          <h3 className="text-md font-medium mb-2">{isCreating ? 'Save Current Scenario' : 'Edit Scenario'}</h3>
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
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={isCreating ? handleSaveScenario : () => handleUpdateScenario(editingScenarioId!)}
                disabled={!newScenarioName.trim() || saving}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium disabled:bg-blue-400"
              >
                {saving ? 'Saving...' : isCreating ? 'Save' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-4">
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="Search scenarios"
        />
      </div>
      
      <div className="mb-4">
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as 'default' | 'newest' | 'oldest' | 'name')}
          className="w-full px-3 py-2 border rounded-md text-sm"
        >
          <option value="default">Default</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name">Name</option>
        </select>
      </div>
      
      {displayedScenarios.length > 0 && (
        <div>
          <h3 className="text-md font-medium mb-2">Saved Scenarios</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {displayedScenarios.map((scenario) => (
              <div 
                key={scenario._id} 
                className={`
                  p-3 border rounded-md hover:bg-gray-50 cursor-pointer
                  ${scenario.isPreset ? 'border-purple-200 bg-purple-50' : 'border-gray-200'}
                `}
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
                      formatDate(scenario.lastModified)
                    )}
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setEditingScenarioId(scenario._id!);
                        setNewScenarioName(scenario.name);
                        setNewScenarioDescription(scenario.description || '');
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(scenario._id!)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {hasMoreToShow && (
            <button
              onClick={() => setShowAll(true)}
              className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300"
            >
              Show more
            </button>
          )}
        </div>
      )}
      {confirmDelete && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-md font-medium mb-2">Confirm Delete</h3>
            <p>Are you sure you want to delete this scenario?</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteScenario(confirmDelete)}
                className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
