import React, { useState } from "react"
import { OpenTab, RunnerConfig } from "../types"
import { getViberunnerLogoPath } from "../util"
import "./TabBar.css"

interface TabBarProps {
  openTabs: OpenTab[]
  activeTabId: string
  onTabsChange: (tabs: OpenTab[]) => void
  onActiveTabChange: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onCreateNewTab: () => void
  runnerIcons: Record<string, string>
}

const TabBar: React.FC<TabBarProps> = ({
  openTabs,
  activeTabId,
  onTabsChange,
  onActiveTabChange,
  onCloseTab,
  onCreateNewTab,
  runnerIcons,
}) => {
  // Tab drag and drop state
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null)
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null)

  // Function to get icon for display (returns Viberunner logo fallback if no custom icon)
  const getAppIcon = (runner: RunnerConfig): string => {
    if (runnerIcons[runner.id]) {
      return runnerIcons[runner.id]
    }

    // Return Viberunner SVG logo as fallback
    return getViberunnerLogoPath()
  }

  // Handle tab switching
  const handleTabSwitch = (tabId: string) => {
    onActiveTabChange(tabId)
  }

  // Tab drag and drop handlers
  const handleTabDragStart = (e: React.DragEvent, tabId: string) => {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", tabId)
    setDraggedTabId(tabId)
  }

  const handleTabDragEnd = () => {
    setDraggedTabId(null)
    setDragOverTabId(null)
  }

  const handleTabDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"

    if (draggedTabId && draggedTabId !== tabId) {
      setDragOverTabId(tabId)
    }
  }

  const handleTabDragLeave = (e: React.DragEvent, _tabId: string) => {
    // Only clear if we're actually leaving this tab (not entering a child element)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTabId(null)
    }
  }

  const handleTabDrop = (e: React.DragEvent, dropTargetTabId: string) => {
    e.preventDefault()

    const draggedId = e.dataTransfer.getData("text/plain")
    if (!draggedId || draggedId === dropTargetTabId) {
      return
    }

    // Reorder tabs
    const newTabs = [...openTabs]
    const draggedIndex = newTabs.findIndex((tab) => tab.id === draggedId)
    const targetIndex = newTabs.findIndex((tab) => tab.id === dropTargetTabId)

    if (draggedIndex === -1 || targetIndex === -1) {
      return
    }

    // Remove dragged tab and insert at target position
    const [draggedTab] = newTabs.splice(draggedIndex, 1)
    newTabs.splice(targetIndex, 0, draggedTab)

    onTabsChange(newTabs)

    setDraggedTabId(null)
    setDragOverTabId(null)
  }

  return (
    <div className="vr-header-tabs">
      <div className="vr-tabs-list">
        {openTabs.map((tab) => (
          <div
            key={tab.id}
            className={`vr-tab ${
              tab.id === activeTabId ? "vr-tab-active" : ""
            } ${draggedTabId === tab.id ? "vr-tab-dragging" : ""} ${
              dragOverTabId === tab.id ? "vr-tab-drop-target" : ""
            }`}
            onClick={() => handleTabSwitch(tab.id)}
            draggable={true}
            onDragStart={(e) => handleTabDragStart(e, tab.id)}
            onDragEnd={handleTabDragEnd}
            onDragOver={(e) => handleTabDragOver(e, tab.id)}
            onDragLeave={(e) => handleTabDragLeave(e, tab.id)}
            onDrop={(e) => handleTabDrop(e, tab.id)}
          >
            <div className="vr-tab-icon">
              {tab.type === "newtab" ? (
                <img
                  src={getViberunnerLogoPath()}
                  alt="New Tab"
                  style={{
                    width: "16px",
                    height: "16px",
                    objectFit: "contain",
                  }}
                />
              ) : tab.type === "ai-agent" ? (
                <img
                  src={getViberunnerLogoPath()}
                  alt="New Tab"
                  style={{
                    width: "16px",
                    height: "16px",
                    objectFit: "contain",
                  }}
                />
              ) : tab.runner ? (
                <img
                  src={getAppIcon(tab.runner)}
                  alt={tab.runner.name}
                  style={{
                    width: "16px",
                    height: "16px",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <img
                  src={getViberunnerLogoPath()}
                  alt="Default"
                  style={{
                    width: "16px",
                    height: "16px",
                    objectFit: "contain",
                  }}
                />
              )}
            </div>
            <div className="vr-tab-content">
              <span className="vr-tab-title">{tab.title}</span>
              {tab.runner && (
                <span className="vr-tab-subtitle">{tab.runner.name}</span>
              )}
            </div>
            {tab.type !== "newtab" || openTabs.length > 1 ? (
              <button
                className="vr-tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseTab(tab.id)
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                }}
                onDragStart={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                title="Close tab"
              >
                ✕
              </button>
            ) : null}
          </div>
        ))}

        {/* New Tab Button */}
        <button
          className="vr-new-tab-btn"
          onClick={onCreateNewTab}
          title="New tab"
        >
          +
        </button>
      </div>
    </div>
  )
}

export default TabBar
