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
}) => {
  const utilityRunners = runners.filter((a) => a.standalone)
  const contextualRunners = runners.filter((f) => !f.standalone)

  // Combine all runners with utility runners first
  const allRunners = [...utilityRunners, ...contextualRunners]

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
                        {onEditRunner && (
                          <button
                            className="utility-edit-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditRunner(runner.id)
                            }}
                            title="Edit runner"
                          >
                            ✏️
                          </button>
                        )}
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
                        {onEditRunner && (
                          <button
                            className="app-info-edit-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditRunner(runner.id)
                            }}
                            title="Edit runner"
                          >
                            ✏️
                          </button>
                        )}
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
