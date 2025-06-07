import React from "react"

const DropZone: React.FC = () => {
  return (
    <div className="drop-zone-section">
      <div className="section-card">
        <div className="drop-zone-content">
          <div className="drop-zone-header">
            <div className="drop-zone-icon">⬇</div>
            <h3 className="drop-zone-title">Drop files here</h3>
          </div>
          <p className="drop-zone-description">
            Drag and drop files to automatically find compatible runners
          </p>
        </div>
      </div>
    </div>
  )
}

export default DropZone