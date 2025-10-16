"use client";

import React, { useState, useEffect } from 'react';
import { scenarioStore } from '../../services/scenarioStore';
import type { ScenarioSummary, Scenario } from '../../types/scenario';

interface ScenarioSwitcherProps {
  currentStories: any[];
  currentSettings: {
    clientSafe: boolean;
    estimation?: Record<string, unknown>;
  };
  currentMatrix: {
    positions: Record<string, { x: number; y: number; w: number; h: number }>;
    view?: string;
  };
  onLoad: (scenario: Scenario) => void;
}

export function ScenarioSwitcher({
  currentStories,
  currentSettings,
  currentMatrix,
  onLoad
}: ScenarioSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [showRename, setShowRename] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null);

  // Load scenarios list
  const refreshScenarios = () => {
    setScenarios(scenarioStore.list());
  };

  useEffect(() => {
    refreshScenarios();
  }, []);

  // Filter scenarios by search term
  const filteredScenarios = scenarios.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Save current state
  const handleSave = () => {
    if (!currentScenarioId) {
      setShowSaveAs(true);
      return;
    }

    try {
      scenarioStore.save({
        id: currentScenarioId,
        name: scenarios.find(s => s.id === currentScenarioId)?.name || 'Untitled',
        payload: {
          stories: currentStories,
          settings: currentSettings,
          matrix: currentMatrix
        }
      });
      refreshScenarios();
      alert('Scenario saved successfully!');
    } catch (error) {
      alert('Failed to save scenario: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Save as new scenario
  const handleSaveAs = () => {
    if (!newName.trim()) {
      alert('Please enter a scenario name');
      return;
    }

    try {
      const saved = scenarioStore.save({
        name: newName.trim(),
        payload: {
          stories: currentStories,
          settings: currentSettings,
          matrix: currentMatrix
        }
      });
      
      setCurrentScenarioId(saved.id);
      setShowSaveAs(false);
      setNewName('');
      refreshScenarios();
      alert('Scenario saved successfully!');
    } catch (error) {
      alert('Failed to save scenario: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Load a scenario
  const handleLoad = (id: string) => {
    if (!confirm('Loading a scenario will replace your current work. Continue?')) {
      return;
    }

    try {
      const scenario = scenarioStore.get(id);
      if (!scenario) {
        alert('Scenario not found');
        return;
      }

      setCurrentScenarioId(id);
      onLoad(scenario);
      setIsOpen(false);
      
      // Emit global event for subscribers
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('scenario:loaded', { detail: { id } }));
      }
    } catch (error) {
      alert('Failed to load scenario: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Delete a scenario
  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete scenario "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      scenarioStore.remove(id);
      if (currentScenarioId === id) {
        setCurrentScenarioId(null);
      }
      refreshScenarios();
    } catch (error) {
      alert('Failed to delete scenario: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Rename a scenario
  const handleRename = (id: string) => {
    if (!newName.trim()) {
      alert('Please enter a new name');
      return;
    }

    try {
      const scenario = scenarioStore.get(id);
      if (!scenario) {
        alert('Scenario not found');
        return;
      }

      scenarioStore.save({
        ...scenario,
        name: newName.trim()
      });

      setShowRename(null);
      setNewName('');
      refreshScenarios();
    } catch (error) {
      alert('Failed to rename scenario: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Export scenario
  const handleExport = (id?: string) => {
    try {
      const json = scenarioStore.export(id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = id 
        ? `scenario-${scenarios.find(s => s.id === id)?.name || 'export'}.json`
        : 'scenarios-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to export: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Import scenarios
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const result = scenarioStore.import(text);
        
        if (result.errors.length > 0) {
          alert(`Import completed with errors:\n${result.errors.map(e => `- ${e.error}`).join('\n')}\n\nSuccessfully imported: ${result.success.length}`);
        } else {
          alert(`Successfully imported ${result.success.length} scenario(s)`);
        }
        
        refreshScenarios();
      } catch (error) {
        alert('Failed to import: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    };
    input.click();
  };

  // Format date
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Scenarios ({scenarios.length})
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Scenario Manager</h3>
              <p className="text-sm text-gray-500 mt-1">{scenarios.length} saved scenario(s)</p>
            </div>

            {/* Actions */}
            <div className="p-4 border-b border-gray-200 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowSaveAs(true)}
                  className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  New Scenario
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  disabled={!currentScenarioId}
                >
                  Save Current
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleImport}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Import JSON
                </button>
                <button
                  onClick={() => handleExport()}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  disabled={scenarios.length === 0}
                >
                  Export All
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search scenarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Scenario List */}
            <div className="max-h-96 overflow-y-auto">
              {filteredScenarios.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchTerm ? 'No scenarios match your search' : 'No scenarios saved yet'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredScenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      className={`p-4 hover:bg-gray-50 ${currentScenarioId === scenario.id ? 'bg-blue-50' : ''}`}
                    >
                      {showRename === scenario.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="New name"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRename(scenario.id)}
                              className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setShowRename(null);
                                setNewName('');
                              }}
                              className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900">
                                {scenario.name}
                                {currentScenarioId === scenario.id && (
                                  <span className="ml-2 text-xs text-blue-600">(current)</span>
                                )}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                Updated: {formatDate(scenario.updatedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleLoad(scenario.id)}
                              className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => {
                                setShowRename(scenario.id);
                                setNewName(scenario.name);
                              }}
                              className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => handleExport(scenario.id)}
                              className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded"
                            >
                              Export
                            </button>
                            <button
                              onClick={() => handleDelete(scenario.id, scenario.name)}
                              className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Save As Modal */}
      {showSaveAs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Scenario</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter scenario name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowSaveAs(false);
                  setNewName('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAs}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
