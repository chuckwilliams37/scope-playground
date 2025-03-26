'use client';

import React, { useState, useRef, useEffect } from 'react';

type Scenario = {
  _id?: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: number;
  lastModified: number;
  isPreset: boolean;
};

type TopNavbarProps = {
  scenarios: Scenario[];
  currentScenarioName: string;
  onSaveScenario: (name: string, description: string) => Promise<void>;
  onLoadScenario: (scenarioId: string) => Promise<void>;
  onCreatePreset: (presetType: string) => Promise<void>;
  onResetScenario: () => void;
  onShowSettings: () => void;
  onShowImport: () => void;
  onShowExport: () => void;
  onShowShare?: () => void;
};

export function TopNavbar({
  scenarios,
  currentScenarioName,
  onSaveScenario,
  onLoadScenario,
  onCreatePreset,
  onResetScenario,
  onShowSettings,
  onShowImport,
  onShowExport,
  onShowShare
}: TopNavbarProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [scenarioMenuOpen, setScenarioMenuOpen] = useState(false);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDescription, setNewScenarioDescription] = useState('');
  const [saving, setSaving] = useState(false);
  
  const saveDialogRef = useRef<HTMLDivElement>(null);
  const scenarioMenuRef = useRef<HTMLDivElement>(null);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Sort scenarios by last modified date (non-presets only)
  const savedScenarios = scenarios
    .filter(s => !s.isPreset)
    .sort((a, b) => b.lastModified - a.lastModified);
  
  const presetScenarios = scenarios
    .filter(s => s.isPreset)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Focus input when save dialog opens
  useEffect(() => {
    if (saveDialogOpen && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [saveDialogOpen]);
  
  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Handle Save Dialog
      if (saveDialogRef.current && !saveDialogRef.current.contains(event.target as Node)) {
        setSaveDialogOpen(false);
      }
      
      // Handle Scenario Menu
      if (scenarioMenuRef.current && !scenarioMenuRef.current.contains(event.target as Node)) {
        setScenarioMenuOpen(false);
      }
      
      // Handle Preset Menu
      if (presetMenuRef.current && !presetMenuRef.current.contains(event.target as Node)) {
        setPresetMenuOpen(false);
      }
      
      // Handle Tools Menu
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setToolsMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSaveScenario = async () => {
    if (!newScenarioName.trim()) return;
    
    setSaving(true);
    try {
      await onSaveScenario(newScenarioName.trim(), newScenarioDescription.trim());
      setNewScenarioName('');
      setNewScenarioDescription('');
      setSaveDialogOpen(false);
    } catch (error) {
      console.error('Failed to save scenario:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Scope Playground</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-2">
              {/* Scenario Menu */}
              <div className="relative" ref={scenarioMenuRef}>
                <button
                  type="button"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    setScenarioMenuOpen(!scenarioMenuOpen);
                    setPresetMenuOpen(false);
                    setToolsMenuOpen(false);
                  }}
                >
                  <span>Scenarios</span>
                  <span className="ml-1">▼</span>
                </button>
                
                {scenarioMenuOpen && (
                  <div className="absolute left-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-xs text-gray-500">Current Scenario</p>
                        <p className="font-medium">{currentScenarioName || 'Untitled Scenario'}</p>
                      </div>
                      
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          setSaveDialogOpen(true);
                          setScenarioMenuOpen(false);
                        }}
                      >
                        Save Current Scenario...
                      </button>
                      
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          onResetScenario();
                          setScenarioMenuOpen(false);
                        }}
                      >
                        Reset Current Scenario
                      </button>
                      
                      {savedScenarios.length > 0 && (
                        <>
                          <div className="border-t border-gray-200 mt-1 pt-1">
                            <p className="px-4 py-1 text-xs text-gray-500">Recent Scenarios</p>
                            {savedScenarios.slice(0, 5).map((scenario) => (
                              <button
                                key={scenario._id}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => {
                                  onLoadScenario(scenario._id as string);
                                  setScenarioMenuOpen(false);
                                }}
                              >
                                {scenario.name}
                              </button>
                            ))}
                            
                            {savedScenarios.length > 5 && (
                              <p className="px-4 py-1 text-xs text-gray-500 text-center italic">
                                + {savedScenarios.length - 5} more scenarios
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Presets Menu */}
              <div className="relative" ref={presetMenuRef}>
                <button
                  type="button"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    setPresetMenuOpen(!presetMenuOpen);
                    setScenarioMenuOpen(false);
                    setToolsMenuOpen(false);
                  }}
                >
                  <span>Presets</span>
                  <span className="ml-1">▼</span>
                </button>
                
                {presetMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          onCreatePreset('mvp');
                          setPresetMenuOpen(false);
                        }}
                      >
                        Load MVP Preset
                      </button>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          onCreatePreset('lovable');
                          setPresetMenuOpen(false);
                        }}
                      >
                        Load Lovable Preset
                      </button>
                      
                      {presetScenarios.length > 0 && (
                        <>
                          <div className="border-t border-gray-200 mt-1 pt-1">
                            <p className="px-4 py-1 text-xs text-gray-500">Custom Presets</p>
                            {presetScenarios.map((scenario) => (
                              <button
                                key={scenario._id}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => {
                                  onLoadScenario(scenario._id as string);
                                  setPresetMenuOpen(false);
                                }}
                              >
                                {scenario.name}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Tools Menu */}
              <div className="relative" ref={toolsMenuRef}>
                <button
                  type="button"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    setToolsMenuOpen(!toolsMenuOpen);
                    setScenarioMenuOpen(false);
                    setPresetMenuOpen(false);
                  }}
                >
                  <span>Tools</span>
                  <span className="ml-1">▼</span>
                </button>
                
                {toolsMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          onShowSettings();
                          setToolsMenuOpen(false);
                        }}
                      >
                        Project Settings
                      </button>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          onShowImport();
                          setToolsMenuOpen(false);
                        }}
                      >
                        Import Stories
                      </button>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          onShowExport();
                          setToolsMenuOpen(false);
                        }}
                      >
                        Export / Share
                      </button>
                      {onShowShare && (
                        <button
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            onShowShare();
                            setToolsMenuOpen(false);
                          }}
                        >
                          Share
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button 
              type="button" 
              className="bg-white inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              aria-controls="mobile-menu" 
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          
          {/* Current scenario name display */}
          <div className="hidden sm:flex items-center">
            <div className="text-sm text-gray-500">
              Current: <span className="font-medium text-gray-900">{currentScenarioName || 'Untitled Scenario'}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Save Dialog Overlay */}
      {saveDialogOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-50 flex items-center justify-center">
          <div ref={saveDialogRef} className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Save Current Scenario</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="scenarioName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="scenarioName"
                  ref={nameInputRef}
                  type="text"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="My Scenario"
                />
                {newScenarioName.trim() === '' && (
                  <p className="mt-1 text-sm text-red-500">Name is required</p>
                )}
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
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setSaveDialogOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveScenario}
                  disabled={!newScenarioName.trim() || saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
