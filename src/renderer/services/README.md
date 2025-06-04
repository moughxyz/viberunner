# RunnerService

The RunnerService is a centralized service that manages the currently available runners in Viberunner. It provides a consistent interface for loading, refreshing, and accessing runner data across the application.

## Key Features

- **Centralized State Management**: Single source of truth for runner data
- **Subscription System**: Components can subscribe to changes and automatically update their UI
- **Automatic Refresh**: Easy method to reload runners from the filesystem
- **Error Handling**: Built-in error states and loading indicators
- **Singleton Pattern**: Ensures consistency across the application

## Architecture

The service uses a singleton pattern with a subscription model:

1. **RunnerService**: Core service class that manages state and file operations
2. **useRunnerService Hook**: React hook that provides easy access to the service with automatic subscription management
3. **useRunnerRefresh Hook**: Lightweight hook for components that only need to trigger refreshes

## Usage

### Basic Usage with Full State Access

```tsx
import { useRunnerService } from '../hooks/useRunnerService'

const MyComponent = () => {
  const {
    runners,
    isLoading,
    error,
    refresh,
    findRunner,
    getStandaloneRunners
  } = useRunnerService()

  const handleRefresh = async () => {
    await refresh()
  }

  if (isLoading) return <div>Loading runners...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <button onClick={handleRefresh}>Refresh Runners</button>
      <div>Found {runners.length} runners</div>
      {getStandaloneRunners().map(runner => (
        <div key={runner.id}>{runner.name}</div>
      ))}
    </div>
  )
}
```

### Lightweight Usage for Triggering Refreshes

```tsx
import { useRunnerRefresh } from '../hooks/useRunnerService'

const AIAgentInterface = () => {
  const { refresh } = useRunnerRefresh()

  const handleRunnerCreated = async () => {
    // After creating a runner, refresh the main UI
    await refresh()
  }

  // ... rest of component
}
```

### Direct Service Access (Advanced)

```tsx
import { runnerService } from '../services/RunnerService'

// Initialize the service (usually done once at app startup)
await runnerService.initialize()

// Get current runners synchronously
const runners = runnerService.getRunners()

// Find a specific runner
const runner = runnerService.findRunner('my-runner-id')

// Subscribe to changes manually
const unsubscribe = runnerService.subscribe((state) => {
  console.log('Runners updated:', state.runners.length)
})

// Clean up subscription
unsubscribe()
```

## API Reference

### RunnerService Methods

- `initialize()`: Initialize the service and load runners
- `refresh()`: Reload runners from filesystem
- `getState()`: Get current state (runners, loading, error)
- `getRunners()`: Get current runners array
- `findRunner(id)`: Find runner by ID
- `findRunners(predicate)`: Find runners matching criteria
- `getStandaloneRunners()`: Get only standalone runners
- `getContextualRunners()`: Get only contextual (non-standalone) runners
- `loadApp(id)`: Load a specific runner's bundle and config
- `subscribe(listener)`: Subscribe to state changes

### useRunnerService Hook Returns

- `runners`: Array of current runners
- `isLoading`: Boolean indicating if refresh is in progress
- `error`: String error message or null
- `refresh`: Function to trigger refresh
- `loadApp`: Function to load specific runner
- `findRunner`: Function to find runner by ID
- `findRunners`: Function to find runners by criteria
- `getStandaloneRunners`: Function to get standalone runners
- `getContextualRunners`: Function to get contextual runners

### useRunnerRefresh Hook Returns

- `refresh`: Function to trigger refresh

## Integration Points

The RunnerService is integrated into:

1. **App.tsx**: Main component uses `useRunnerService` for primary runner management
2. **AIAgentInterface.tsx**: Uses `useRunnerRefresh` to update UI after creating runners
3. **RunnersGrid.tsx**: Receives runners as props from parent using the service
4. **File drop handlers**: Use service to find matching runners for dropped files

## Migration from Direct Loading

Before RunnerService, components would call `loadRunners()` directly:

```tsx
// OLD WAY (Don't do this)
const [runners, setRunners] = useState([])
const [isLoading, setIsLoading] = useState(false)

useEffect(() => {
  const loadRunners = async () => {
    setIsLoading(true)
    try {
      const loaded = await loadRunners()
      setRunners(loaded)
    } catch (error) {
      // handle error
    } finally {
      setIsLoading(false)
    }
  }
  loadRunners()
}, [])
```

```tsx
// NEW WAY (Do this)
const { runners, isLoading, error } = useRunnerService()
```

This ensures all components stay in sync when runners change, and provides better error handling and loading states.