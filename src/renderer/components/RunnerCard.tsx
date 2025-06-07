import React from "react"
import { RunnerConfig } from "../types"
import "./RunnerCard.css"
import UiButton from "./UiButton"

interface OptionsMenuProps {
  runnerId: string
  isActive: boolean
  onToggle: (runnerId: string) => void
  onEdit: (runnerId: string, editType: "agent" | "cursor") => void
  onDelete: (runnerId: string) => void
  onAddToDock: (runnerId: string) => void
  onAddToMenuBar: (runnerId: string) => void
  onEditRunner?: (runnerName: string) => void
  onEditRunnerWithCursor?: (runnerName: string) => void
  className?: string
}

const OptionsMenu: React.FC<OptionsMenuProps> = ({
  runnerId,
  isActive,
  onToggle,
  onEdit,
  onDelete,
  onAddToDock,
  onAddToMenuBar,
  onEditRunner,
  onEditRunnerWithCursor,
  className = "options-menu",
}) => {
  if (!onEditRunner && !onEditRunnerWithCursor) {
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
          {process.platform === "darwin" && (
            <button
              className="options-menu-item"
              onClick={(e) => {
                e.stopPropagation()
                onAddToDock(runnerId)
              }}
            >
              Add to macOS Dock
            </button>
          )}
          {process.platform === "darwin" && (
            <button
              className="options-menu-item"
              onClick={(e) => {
                e.stopPropagation()
                onAddToMenuBar(runnerId)
              }}
            >
              Add to macOS Menu Bar
            </button>
          )}
          {onEditRunner && (
            <button
              className="options-menu-item"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(runnerId, "agent")
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
                onEdit(runnerId, "cursor")
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

interface RunnerCardProps {
  runner: RunnerConfig
  startupConfig?: { enabled: boolean; tabOrder: number }
  getAppIcon: (runner: RunnerConfig) => string
  getSupportedFormats: (runner: RunnerConfig) => string
  launchStandaloneApp: (runner: RunnerConfig) => Promise<void>
  toggleStartupApp: (runnerId: string, enabled: boolean) => Promise<void>
  updateStartupAppTabOrder: (
    runnerId: string,
    tabOrder: number
  ) => Promise<void>
  activeDropdown: string | null
  onToggleDropdown: (runnerId: string) => void
  onEditDropdown: (runnerId: string, editType: "agent" | "cursor") => void
  onDeleteRunner: (runnerId: string) => void
  onAddToDock: (runnerId: string) => void
  onAddToMenuBar: (runnerId: string) => void
  onEditRunner?: (runnerName: string) => void
  onEditRunnerWithCursor?: (runnerName: string) => void
}

const RunnerCard: React.FC<RunnerCardProps> = ({
  runner,
  startupConfig,
  getAppIcon,
  getSupportedFormats,
  launchStandaloneApp,
  toggleStartupApp,
  updateStartupAppTabOrder,
  activeDropdown,
  onToggleDropdown,
  onEditDropdown,
  onDeleteRunner,
  onAddToDock,
  onAddToMenuBar,
  onEditRunner,
  onEditRunnerWithCursor,
}) => {
  const isUtility = runner.standalone
  const isStartupEnabled = startupConfig?.enabled || false
  const tabOrder = startupConfig?.tabOrder || 1

  if (isUtility) {
    // Render utility runner with launch and startup controls
    return (
      <div className="utility-card-container">
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
            <p className="utility-description">{runner.description}</p>
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
              onToggle={onToggleDropdown}
              onEdit={onEditDropdown}
              onDelete={onDeleteRunner}
              onAddToDock={onAddToDock}
              onAddToMenuBar={onAddToMenuBar}
              onEditRunner={onEditRunner}
              onEditRunnerWithCursor={onEditRunnerWithCursor}
              className="footer-options-menu"
            />
          </div>
        </div>
      </div>
    )
  } else {
    // Render contextual runner with footer structure
    return (
      <div className="contextual-card-container">
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
              onToggle={onToggleDropdown}
              onEdit={onEditDropdown}
              onDelete={onDeleteRunner}
              onAddToDock={onAddToDock}
              onAddToMenuBar={onAddToMenuBar}
              onEditRunner={onEditRunner}
              onEditRunnerWithCursor={onEditRunnerWithCursor}
              className="footer-options-menu"
            />
          </div>
        </div>
      </div>
    )
  }
}

export default RunnerCard