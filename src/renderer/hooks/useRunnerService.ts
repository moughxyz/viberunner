import { useEffect, useState, useCallback } from "react"
import { runnerService, RunnerServiceState } from "../services/RunnerService"
import { RunnerConfig } from "../types"

// Hook to use the RunnerService with automatic subscription management
export function useRunnerService() {
  const [state, setState] = useState<RunnerServiceState>(() => runnerService.getState())

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = runnerService.subscribe(setState)

    // Cleanup subscription on unmount
    return unsubscribe
  }, [])

  // Memoized refresh function
  const refresh = useCallback(async () => {
    await runnerService.refresh()
  }, [])

  // Memoized loadApp function
  const loadApp = useCallback(async (id: string) => {
    return await runnerService.loadApp(id)
  }, [])

  // Memoized finder functions
  const findRunner = useCallback((id: string) => {
    return runnerService.findRunner(id)
  }, [state.runners]) // Re-memoize when runners change

  const findRunners = useCallback((predicate: (runner: RunnerConfig) => boolean) => {
    return runnerService.findRunners(predicate)
  }, [state.runners])

  const getStandaloneRunners = useCallback(() => {
    return runnerService.getStandaloneRunners()
  }, [state.runners])

  const getContextualRunners = useCallback(() => {
    return runnerService.getContextualRunners()
  }, [state.runners])

  return {
    // State
    runners: state.runners,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    refresh,
    loadApp,

    // Finders
    findRunner,
    findRunners,
    getStandaloneRunners,
    getContextualRunners,
  }
}

// Hook for components that only need to trigger a refresh (like after creating a runner)
export function useRunnerRefresh() {
  const refresh = useCallback(async () => {
    await runnerService.refresh()
  }, [])

  return { refresh }
}