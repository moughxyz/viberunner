import React from "react"
import "./RunnersGrid.css"
import UiButton from "./UiButton"

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
  onDeleteRunner?: (runnerName: string) => void
}

interface OptionsMenuProps {
  runnerId: string
  isActive: boolean
  onToggle: (runnerId: string) => void
  onEdit: (runnerId: string, editType: 'agent' | 'cursor') => void
  onDelete: (runnerId: string) => void
  onEditRunner?: (runnerName: string) => void
  onEditRunnerWithCursor?: (runnerName: string) => void
  onDeleteRunner?: (runnerName: string) => void
  className?: string
}

const OptionsMenu: React.FC<OptionsMenuProps> = ({
  runnerId,
  isActive,
  onToggle,
  onEdit,
  onDelete,
  onEditRunner,
  onEditRunnerWithCursor,
  onDeleteRunner,
  className = "options-menu"
}) => {
  if (!onEditRunner && !onEditRunnerWithCursor && !onDeleteRunner) {
    return null
  }

  return (
    <div className={className}>
      <UiButton
        className={`${className}-btn`}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation()
          onToggle(runnerId)
        }}
      >
        ⋯
      </UiButton>
      {isActive && (
        <div className="options-menu-dropdown">
          {onEditRunner && (
            <button
              className="options-menu-item"
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
              className="options-menu-item"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(runnerId, 'cursor')
              }}
            >
              Edit with Cursor
            </button>
          )}
          <button
            className="options-menu-item delete-item"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(runnerId)
            }}
          >
            Delete
          </button>
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
  onDeleteRunner,
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

  const handleDeleteRunner = (runnerId: string) => {
    setActiveDropdown(null)
    if (onDeleteRunner) {
      onDeleteRunner(runnerId)
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
                        <div className="utility-action">Launch</div>
                      </div>
                    </div>

                    {/* Card footer with startup controls and options */}
                    <div className="card-footer">
                      <div className="footer-left">
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

                      <div className="footer-right">
                        <OptionsMenu
                          runnerId={runner.id}
                          isActive={activeDropdown === runner.id}
                          onToggle={handleToggleDropdown}
                          onEdit={handleEditDropdown}
                          onDelete={handleDeleteRunner}
                          onEditRunner={onEditRunner}
                          onEditRunnerWithCursor={onEditRunnerWithCursor}
                          onDeleteRunner={onDeleteRunner}
                          className="footer-options-menu"
                        />
                      </div>
                    </div>
                  </div>
                )
              } else {
                // Render contextual runner with footer structure
                return (
                  <div key={runner.id} className="contextual-card-container">
                    <div className="app-info-card">
                      <div className="app-info-header">
                        <h5 className="app-info-title">{runner.name}</h5>
                        <div className="app-info-status">
                          <span className="status-dot"></span>
                        </div>
                      </div>
                      <p className="app-info-description">{runner.description}</p>
                    </div>

                    {/* Card footer with formats and options */}
                    <div className="card-footer">
                      <div className="footer-left">
                        <div className="app-info-formats">
                          {getSupportedFormats(runner)}
                        </div>
                      </div>

                      <div className="footer-right">
                        <OptionsMenu
                          runnerId={runner.id}
                          isActive={activeDropdown === runner.id}
                          onToggle={handleToggleDropdown}
                          onEdit={handleEditDropdown}
                          onDelete={handleDeleteRunner}
                          onEditRunner={onEditRunner}
                          onEditRunnerWithCursor={onEditRunnerWithCursor}
                          onDeleteRunner={onDeleteRunner}
                          className="footer-options-menu"
                        />
                      </div>
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
