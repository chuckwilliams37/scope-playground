# Scenario Manager Integration Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install nanoid
```

### 2. Add to Your Main App Component

```typescript
// app/page.tsx
import { ScenarioSwitcher } from '../components/scenario/ScenarioSwitcher';

export default function Home() {
  // Your existing state
  const [stories, setStories] = useState([]);
  const [storyPositions, setStoryPositions] = useState({});
  const [settings, setSettings] = useState(defaultSettings);
  const { clientSafeMode, setClientSafeMode } = useClientSafe();

  return (
    <div>
      {/* Add to header/nav */}
      <header className="flex items-center justify-between p-4">
        <h1>Scope Playground</h1>
        
        <ScenarioSwitcher
          currentStories={stories}
          currentSettings={{
            clientSafe: clientSafeMode,
            estimation: settings
          }}
          currentMatrix={{
            positions: storyPositions,
            view: 'default'
          }}
          onLoad={(scenario) => {
            // Restore app state from scenario
            setStories(scenario.payload.stories);
            setClientSafeMode(scenario.payload.settings.clientSafe);
            setSettings(scenario.payload.settings.estimation || defaultSettings);
            setStoryPositions(scenario.payload.matrix.positions);
          }}
        />
      </header>

      {/* Rest of your app */}
    </div>
  );
}
```

### 3. Test It Out

1. Add some stories to your matrix
2. Click "Scenarios (0)"
3. Click "New Scenario"
4. Enter a name and save
5. Make changes to your stories
6. Load the saved scenario - your work is restored!

---

## Complete Integration Example

```typescript
'use client';

import { useState, useEffect } from 'react';
import { ScenarioSwitcher } from '../components/scenario/ScenarioSwitcher';
import { useClientSafe } from '../hooks/useClientSafe';
import type { Scenario } from '../types/scenario';

export default function ScopePlayground() {
  // App state
  const [stories, setStories] = useState<Story[]>([]);
  const [storyPositions, setStoryPositions] = useState<Record<string, Position>>({});
  const [settings, setSettings] = useState(defaultSettings);
  const { clientSafeMode, setClientSafeMode } = useClientSafe();
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null);

  // Handle scenario load
  const handleScenarioLoad = (scenario: Scenario) => {
    // Restore stories
    setStories(scenario.payload.stories);
    
    // Restore settings
    setClientSafeMode(scenario.payload.settings.clientSafe);
    if (scenario.payload.settings.estimation) {
      setSettings(scenario.payload.settings.estimation as Settings);
    }
    
    // Restore matrix positions
    setStoryPositions(scenario.payload.matrix.positions);
    
    // Track current scenario
    setCurrentScenarioId(scenario.id);
    
    // Optional: Show success message
    console.log(`Loaded scenario: ${scenario.name}`);
  };

  // Listen for scenario load events
  useEffect(() => {
    const handleScenarioEvent = (event: CustomEvent) => {
      console.log('Scenario loaded:', event.detail.id);
      setCurrentScenarioId(event.detail.id);
    };

    window.addEventListener('scenario:loaded', handleScenarioEvent as EventListener);
    
    return () => {
      window.removeEventListener('scenario:loaded', handleScenarioEvent as EventListener);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Scenario Manager */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scope Playground</h1>
            {currentScenarioId && (
              <p className="text-sm text-gray-500 mt-1">
                Current scenario: {/* Get name from scenarioStore */}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Client Safe Mode Toggle */}
            <button
              onClick={() => setClientSafeMode(!clientSafeMode)}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                clientSafeMode
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {clientSafeMode ? 'Client Mode' : 'Internal Mode'}
            </button>

            {/* Scenario Manager */}
            <ScenarioSwitcher
              currentStories={stories}
              currentSettings={{
                clientSafe: clientSafeMode,
                estimation: settings
              }}
              currentMatrix={{
                positions: storyPositions,
                view: 'default'
              }}
              onLoad={handleScenarioLoad}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Your matrix, story list, etc. */}
      </main>
    </div>
  );
}
```

---

## Advanced Features

### Auto-Save

```typescript
// Auto-save every 30 seconds if changes detected
useEffect(() => {
  if (!currentScenarioId) return;

  const interval = setInterval(() => {
    scenarioStore.save({
      id: currentScenarioId,
      name: currentScenarioName,
      payload: {
        stories,
        settings: { clientSafe: clientSafeMode, estimation: settings },
        matrix: { positions: storyPositions }
      }
    });
    console.log('Auto-saved');
  }, 30000);

  return () => clearInterval(interval);
}, [currentScenarioId, stories, storyPositions, settings, clientSafeMode]);
```

### Unsaved Changes Warning

```typescript
// Warn user about unsaved changes
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);
```

### Keyboard Shortcuts

```typescript
// Cmd/Ctrl + S to save
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      // Trigger save
      handleSave();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## Troubleshooting

### Scenario Not Loading

**Problem**: Scenario loads but state doesn't update

**Solution**: Ensure your onLoad callback updates all necessary state:
```typescript
onLoad={(scenario) => {
  // Update ALL state that was saved
  setStories(scenario.payload.stories);
  setSettings(scenario.payload.settings.estimation);
  setStoryPositions(scenario.payload.matrix.positions);
  // Don't forget any other state!
}}
```

### Count Not Showing

**Problem**: "Scenarios (0)" always shows 0

**Solution**: Component needs to refresh. Check that ScenarioSwitcher is mounted:
```typescript
// Force refresh on mount
useEffect(() => {
  refreshScenarios();
}, []);
```

### Import Fails

**Problem**: Import doesn't work

**Solution**: Check JSON format matches schema:
```json
{
  "name": "My Scenario",
  "payload": {
    "stories": [...],
    "settings": {
      "clientSafe": false,
      "estimation": {...}
    },
    "matrix": {
      "positions": {...}
    }
  }
}
```

---

## Next Steps

1. ✅ Add ScenarioSwitcher to your app
2. ✅ Test save/load workflow
3. ✅ Export a scenario as backup
4. ⏭️ Consider auto-save feature
5. ⏭️ Add keyboard shortcuts
6. ⏭️ Plan backend migration

---

## Support

For issues or questions:
1. Check `/docs/implementation/scenario-manager.md`
2. Review test files in `/tests/scenario/`
3. Inspect browser console for errors
4. Check localStorage in DevTools
