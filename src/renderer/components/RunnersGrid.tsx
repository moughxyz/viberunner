import React from "react"
import "./RunnersGrid.css"
import ConfirmDialog from "./ConfirmDialog"
import RunnerCard from "./RunnerCard"
import { runnerService } from "../services/RunnerService"
import { macService } from "../services/MacService"
import { useRunnerService } from "../hooks/useRunnerService"
import { getSupportedFormats } from "../../lib/utils"
import { RunnerConfig } from "../types"

interface RunnersGridProps {
  runners: RunnerConfig[]
  onEditRunner?: (runnerName: string) => void
  onEditRunnerWithCursor?: (runnerName: string) => void
  launchStandaloneApp?: (runner: RunnerConfig) => Promise<void>
}

const RunnersGrid: React.FC<RunnersGridProps> = ({
  runners,
  onEditRunner,
  onEditRunnerWithCursor,
  launchStandaloneApp,
}) => {
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(
    null
  )
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null)

  // Use the runner service hook to get state and functions
  const {
    isLoading: isLoadingRunners,
    startupRunners,
    getAppIcon,
  } = useRunnerService()

  const utilityRunners = runners.filter((a) => a.standalone)
  const contextualRunners = runners.filter((f) => !f.standalone)

  // Combine all runners with utility runners first
  const allRunners = [...utilityRunners, ...contextualRunners]

  // Service functions accessed directly
  const toggleStartupApp = async (runnerId: string, enabled: boolean) => {
    try {
      await runnerService.toggleStartupRunner(runnerId, enabled)
    } catch (error) {
      console.error("Error toggling startup runner:", error)
    }
  }

  const updateStartupAppTabOrder = async (
    runnerId: string,
    tabOrder: number
  ) => {
    try {
      await runnerService.updateStartupRunnerTabOrder(runnerId, tabOrder)
    } catch (error) {
      console.error("Error updating startup runner tab order:", error)
    }
  }

  const handleLaunchStandaloneApp = async (runner: RunnerConfig) => {
    if (launchStandaloneApp) {
      try {
        await launchStandaloneApp(runner)
      } catch (error) {
        console.error("Failed to launch standalone app:", error)
        alert(`Failed to launch ${runner.name}: ${error}`)
      }
    }
  }

  const handleEditDropdown = (
    runnerId: string,
    editType: "agent" | "cursor"
  ) => {
    setActiveDropdown(null)
    if (editType === "agent" && onEditRunner) {
      onEditRunner(runnerId)
    } else if (editType === "cursor" && onEditRunnerWithCursor) {
      onEditRunnerWithCursor(runnerId)
    }
  }

  const handleDeleteRunner = (runnerId: string) => {
    setActiveDropdown(null)
    setIsDeleting(runnerId)
  }

  const handleAddToDock = async (runnerId: string) => {
    setActiveDropdown(null)
    try {
      const runner = runners.find((r) => r.id === runnerId)
      if (runner) {
        await macService.addRunnerToDock(runner)
      }
    } catch (error) {
      console.error("Failed to add runner to dock:", error)
      alert(
        `Failed to add runner to dock: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  const handleAddToMenuBar = async (runnerId: string) => {
    setActiveDropdown(null)
    try {
      const runner = runners.find((r) => r.id === runnerId)
      if (runner) {
        await macService.addRunnerToMenuBar(runner)
      }
    } catch (error) {
      console.error("Failed to add runner to menu bar:", error)
      alert(
        `Failed to add runner to menu bar: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  const confirmDeleteRunner = async (runnerId: string) => {
    try {
      await runnerService.deleteRunner(runnerId)
      setIsDeleting(null)
    } catch (error) {
      console.error("Failed to delete runner:", error)
      alert(
        `Failed to delete runner: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
      setIsDeleting(null)
    }
  }

  const cancelDeleteRunner = () => {
    setIsDeleting(null)
  }

  const handleToggleDropdown = (runnerId: string) => {
    setActiveDropdown(activeDropdown === runnerId ? null : runnerId)
  }

  const handleLaunchModeChange = async (
    runnerId: string,
    launchMode: "newTab" | "macDock" | "macMenuBar"
  ) => {
    try {
      await runnerService.changeRunnerLaunchMode(runnerId, launchMode)
    } catch (error) {
      console.error("Failed to change launch mode:", error)
      alert(
        `Failed to change launch mode: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null)
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  if (allRunners.length === 0) {
    return null
  }

  return (
    <div className="unified-runners-section">
      <div className="section-card">
        <div className="section-header">
          <h4 className="section-title">Runners</h4>
          <span className="section-count">{allRunners.length}</span>
        </div>
        {isLoadingRunners ? (
          <div className="loading-state">
            <span className="loading-spinner">⟳</span>
            Loading runners...
          </div>
        ) : (
          <div className="unified-runners-grid">
            {allRunners.map((runner) => (
              <RunnerCard
                key={runner.id}
                runner={runner}
                startupConfig={startupRunners[runner.id]}
                getAppIcon={getAppIcon}
                getSupportedFormats={getSupportedFormats}
                launchStandaloneApp={handleLaunchStandaloneApp}
                toggleStartupApp={toggleStartupApp}
                updateStartupAppTabOrder={updateStartupAppTabOrder}
                activeDropdown={activeDropdown}
                onToggleDropdown={handleToggleDropdown}
                onEditDropdown={handleEditDropdown}
                onDeleteRunner={handleDeleteRunner}
                onAddToDock={handleAddToDock}
                onAddToMenuBar={handleAddToMenuBar}
                onEditRunner={onEditRunner}
                onEditRunnerWithCursor={onEditRunnerWithCursor}
                onLaunchModeChange={handleLaunchModeChange}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!isDeleting}
        title="Delete Runner"
        message={`Are you sure you want to delete "${
          runners.find((r) => r.id === isDeleting)?.name || isDeleting
        }"?`}
        warningMessage="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => isDeleting && confirmDeleteRunner(isDeleting)}
        onCancel={cancelDeleteRunner}
      />
    </div>
  )
}

export default RunnersGrid
