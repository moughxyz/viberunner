import React from "react"
import { FileInput, RunnerConfig } from "../types"

const path = require("path")

interface AppSelectionProps {
  isVisible: boolean
  availableRunners: RunnerConfig[]
  pendingFileInput: FileInput | null
  onSelectApp: (runner: RunnerConfig) => Promise<void>
  onCancel: () => void
  getAppIcon: (runner: RunnerConfig) => string
  getSupportedFormats: (runner: RunnerConfig) => string
}

const AppSelection: React.FC<AppSelectionProps> = ({
  isVisible,
  availableRunners,
  pendingFileInput,
  onSelectApp,
  onCancel,
  getAppIcon,
  getSupportedFormats,
}) => {
  if (!isVisible) {
    return null
  }

  return (
    <div className="vr-app-selection">
      <div className="selection-header">
        <h2 className="selection-title">Choose an app</h2>
        <p className="selection-subtitle">
          Multiple runners can handle this file type. Choose one to continue:
        </p>
        <div className="file-meta">
          <span className="filename">
            {path.basename(pendingFileInput?.path || "")}
          </span>
          <span className="file-type">{pendingFileInput?.mimetype}</span>
        </div>
      </div>

      <div className="app-grid">
        {availableRunners.map((runner) => (
          <div
            key={runner.id}
            className="app-card"
            onClick={() => onSelectApp(runner)}
          >
            <div className="card-header">
              <div className="card-icon">
                <img
                  src={getAppIcon(runner)}
                  alt={runner.name}
                  style={{
                    width: "32px",
                    height: "32px",
                    objectFit: "contain",
                  }}
                />
              </div>
              <div className="card-title-section">
                <h3 className="card-title">{runner.name}</h3>
                <div className="card-badge">
                  <div className="badge-dot"></div>
                  Ready
                </div>
              </div>
            </div>
            <p className="card-description">{runner.description}</p>
            <div className="card-footer">
              <div className="supported-formats">
                {getSupportedFormats(runner)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="selection-actions">
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default AppSelection