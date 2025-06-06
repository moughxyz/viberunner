import React, { useRef, useCallback } from "react"
import { TabService } from "../services/TabService"
import { OpenTab, RunnerConfig, FileInput } from "../types"

export const useTabService = (
  appRootRef: React.RefObject<HTMLDivElement>
) => {
  const tabServiceRef = useRef<TabService | null>(null)

  // Initialize the TabService if not already initialized
  if (!tabServiceRef.current) {
    tabServiceRef.current = new TabService(appRootRef)
  }

  const tabService = tabServiceRef.current

  // Wrapped methods with useCallback for performance
  const generateTabId = useCallback(() => {
    return tabService.generateTabId()
  }, [tabService])

  const switchToTab = useCallback(
    (
      tabId: string,
      openTabs: OpenTab[],
      setActiveTabId: (id: string) => void,
      tabData?: OpenTab
    ) => {
      tabService.switchToTab(tabId, openTabs, setActiveTabId, tabData)
    },
    [tabService]
  )

  const createNewTab = useCallback(
    (
      openTabs: OpenTab[],
      setOpenTabs: (updater: (prev: OpenTab[]) => OpenTab[]) => void,
      setActiveTabId: (id: string) => void,
      setShowAppSelection: (show: boolean) => void,
      setPendingFileInput: (input: FileInput | null) => void
    ) => {
      tabService.createNewTab(
        openTabs,
        setOpenTabs,
        setActiveTabId,
        setShowAppSelection,
        setPendingFileInput
      )
    },
    [tabService]
  )

  const closeTab = useCallback(
    (
      tabId: string,
      openTabs: OpenTab[],
      activeTabId: string,
      setOpenTabs: (updater: (prev: OpenTab[]) => OpenTab[]) => void,
      setActiveTabId: (id: string) => void
    ) => {
      tabService.closeTab(
        tabId,
        openTabs,
        activeTabId,
        setOpenTabs,
        setActiveTabId
      )
    },
    [tabService]
  )

  const createAppContainer = useCallback(
    (tab: OpenTab) => {
      return tabService.createAppContainer(tab)
    },
    [tabService]
  )

  const createAIAgentContainer = useCallback(
    (
      tab: OpenTab,
      openTabs: OpenTab[],
      activeTabId: string,
      setOpenTabs: (updater: (prev: OpenTab[]) => OpenTab[]) => void,
      setActiveTabId: (id: string) => void
    ) => {
      return tabService.createAIAgentContainer(
        tab,
        openTabs,
        activeTabId,
        setOpenTabs,
        setActiveTabId
      )
    },
    [tabService]
  )

  const openAppInNewTab = useCallback(
    (
      runner: RunnerConfig,
      loadApp: (runnerId: string) => Promise<any>,
      openTabs: OpenTab[],
      activeTabId: string,
      setOpenTabs: (updater: (prev: OpenTab[]) => OpenTab[]) => void,
      setActiveTabId: (id: string) => void,
      setShowAppSelection: (show: boolean) => void,
      setPendingFileInput: (input: FileInput | null) => void,
      fileInput?: FileInput,
      forceNewTab: boolean = false,
      switchToTab_: boolean = true
    ) => {
      return tabService.openAppInNewTab(
        runner,
        loadApp,
        openTabs,
        activeTabId,
        setOpenTabs,
        setActiveTabId,
        setShowAppSelection,
        setPendingFileInput,
        fileInput,
        forceNewTab,
        switchToTab_
      )
    },
    [tabService]
  )

  const openAIAgentInNewTab = useCallback(
    (
      prompt: string | undefined,
      openTabs: OpenTab[],
      activeTabId: string,
      setOpenTabs: (updater: (prev: OpenTab[]) => OpenTab[]) => void,
      setActiveTabId: (id: string) => void
    ) => {
      return tabService.openAIAgentInNewTab(
        prompt,
        openTabs,
        activeTabId,
        setOpenTabs,
        setActiveTabId
      )
    },
    [tabService]
  )

  const openAIAgentForExistingRunner = useCallback(
    (
      existingRunnerName: string,
      prompt: string | undefined,
      openTabs: OpenTab[],
      activeTabId: string,
      setOpenTabs: (updater: (prev: OpenTab[]) => OpenTab[]) => void,
      setActiveTabId: (id: string) => void
    ) => {
      return tabService.openAIAgentForExistingRunner(
        existingRunnerName,
        prompt,
        openTabs,
        activeTabId,
        setOpenTabs,
        setActiveTabId
      )
    },
    [tabService]
  )

  // Handle tab switching with app selection reset
  const handleTabSwitch = useCallback(
    (
      tabId: string,
      openTabs: OpenTab[],
      setActiveTabId: (id: string) => void,
      setShowAppSelection: (show: boolean) => void,
      setPendingFileInput: (input: FileInput | null) => void
    ) => {
      // Reset app selection state when switching tabs
      setShowAppSelection(false)
      setPendingFileInput(null)
      switchToTab(tabId, openTabs, setActiveTabId)
    },
    [switchToTab]
  )

  return {
    generateTabId,
    switchToTab,
    createNewTab,
    closeTab,
    createAppContainer,
    createAIAgentContainer,
    openAppInNewTab,
    openAIAgentInNewTab,
    openAIAgentForExistingRunner,
    handleTabSwitch,
  }
}