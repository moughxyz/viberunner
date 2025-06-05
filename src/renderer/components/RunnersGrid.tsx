import React from "react"
import "./RunnersGrid.css"

interface RunnerConfig {
  id: string
  name: string
  description: string
  version: string
  mimetypes: string[]
  author: string
  standalone?: boolean
  icon?: string
  userPreferences?: Record<string, any>
}

interface RunnersGridProps {
  runners: RunnerConfig[]
  isLoadingRunners: boolean
  startupRunners: Record<string, { enabled: boolean; tabOrder: number }>
  getAppIcon: (runner: RunnerConfig) => string
  getSupportedFormats: (runner: RunnerConfig) => string
  launchStandaloneApp: (runner: RunnerConfig) => Promise<void>
  toggleStartupApp: (runnerId: string, enabled: boolean) => Promise<void>
  updateStartupAppTabOrder: (
    runnerId: string,
    tabOrder: number
  ) => Promise<void>
  onEditRunner?: (runnerName: string) => void
  onEditRunnerWithCursor?: (runnerName: string) => void
}

interface EditDropdownProps {
  runnerId: string
  isActive: boolean
  onToggle: (runnerId: string) => void
  onEdit: (runnerId: string, editType: 'agent' | 'cursor') => void
  onEditRunner?: (runnerName: string) => void
  onEditRunnerWithCursor?: (runnerName: string) => void
  className?: string
}

const EditDropdown: React.FC<EditDropdownProps> = ({
  runnerId,
  isActive,
  onToggle,
  onEdit,
  onEditRunner,
  onEditRunnerWithCursor,
  className = "edit-dropdown"
}) => {
  if (!onEditRunner && !onEditRunnerWithCursor) {
    return null
  }

  return (
    <div className={className}>
      <button
        className={`${className}-btn`}
        onClick={(e) => {
          e.stopPropagation()
          onToggle(runnerId)
        }}
        title="Edit runner"
      >
        ✏️
      </button>
      {isActive && (
        <div className="edit-dropdown-menu">
          {onEditRunner && (
            <button
              className="edit-dropdown-item"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(runnerId, 'agent')
              }}
            >
              Edit with Agent
            </button>
          )}
          {onEditRunnerWithCursor && (
            <button
              className="edit-dropdown-item"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(runnerId, 'cursor')
              }}
            >
              Edit with Cursor
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const RunnersGrid: React.FC<RunnersGridProps> = ({
  runners,
  isLoadingRunners,
  startupRunners,
  getAppIcon,
  getSupportedFormats,
  launchStandaloneApp,
  toggleStartupApp,
  updateStartupAppTabOrder,
  onEditRunner,
  onEditRunnerWithCursor,
}) => {
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null)

  const utilityRunners = runners.filter((a) => a.standalone)
  const contextualRunners = runners.filter((f) => !f.standalone)

  // Combine all runners with utility runners first
  const allRunners = [...utilityRunners, ...contextualRunners]

  const handleEditDropdown = (runnerId: string, editType: 'agent' | 'cursor') => {
    setActiveDropdown(null)
    if (editType === 'agent' && onEditRunner) {
      onEditRunner(runnerId)
    } else if (editType === 'cursor' && onEditRunnerWithCursor) {
      onEditRunnerWithCursor(runnerId)
    }
  }

  const handleToggleDropdown = (runnerId: string) => {
    setActiveDropdown(activeDropdown === runnerId ? null : runnerId)
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
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
            {allRunners.map((runner) => {
              const isUtility = runner.standalone

              if (isUtility) {
                // Render utility runner with launch and startup controls
                const startupConfig = startupRunners[runner.id]
                const isStartupEnabled = startupConfig?.enabled || false
                const tabOrder = startupConfig?.tabOrder || 1

                return (
                  <div key={runner.id} className="utility-card-container">
                    <div
                      className="utility-card"
                      onClick={() => launchStandaloneApp(runner)}
                    >
                      <div className="utility-icon">
                        <img
                          src={getAppIcon(runner)}
                          alt={runner.name}
                          style={{
                            width: "24px",
                            height: "24px",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                      <div className="utility-content">
                        <h5 className="utility-title">{runner.name}</h5>
                        <p className="utility-description">
                          {runner.description}
                        </p>
                      </div>
                      <div className="utility-actions">
                        <EditDropdown
                          runnerId={runner.id}
                          isActive={activeDropdown === runner.id}
                          onToggle={handleToggleDropdown}
                          onEdit={handleEditDropdown}
                          onEditRunner={onEditRunner}
                          onEditRunnerWithCursor={onEditRunnerWithCursor}
                          className="utility-edit-dropdown"
                        />
                        <div className="utility-action">Launch</div>
                      </div>
                    </div>

                    {/* Startup controls */}
                    <div
                      className="startup-controls"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="startup-toggle">
                        <label
                          className="toggle-label"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isStartupEnabled}
                            onChange={(e) =>
                              toggleStartupApp(runner.id, e.target.checked)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="toggle-checkbox"
                          />
                          <span className="toggle-slider"></span>
                          <span className="toggle-text">Start on launch</span>
                        </label>
                      </div>

                      {isStartupEnabled && (
                        <div className="tab-order-control">
                          <label className="tab-order-label">
                            Tab order:
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={tabOrder}
                              onChange={(e) =>
                                updateStartupAppTabOrder(
                                  runner.id,
                                  parseInt(e.target.value) || 1
                                )
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="tab-order-input"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )
              } else {
                // Render contextual runner with only status dot
                return (
                  <div key={runner.id} className="app-info-card">
                    <div className="app-info-header">
                      <h5 className="app-info-title">{runner.name}</h5>
                      <div className="app-info-status">
                        <span className="status-dot"></span>
                        <EditDropdown
                          runnerId={runner.id}
                          isActive={activeDropdown === runner.id}
                          onToggle={handleToggleDropdown}
                          onEdit={handleEditDropdown}
                          onEditRunner={onEditRunner}
                          onEditRunnerWithCursor={onEditRunnerWithCursor}
                          className="app-info-edit-dropdown"
                        />
                      </div>
                    </div>
                    <p className="app-info-description">{runner.description}</p>
                    <div className="app-info-formats">
                      {getSupportedFormats(runner)}
                    </div>
                  </div>
                )
              }
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default RunnersGrid
