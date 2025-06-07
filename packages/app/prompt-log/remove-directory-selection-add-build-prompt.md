# Remove Directory Selection & Add Build Prompt

## Summary

This update removes the apps directory selection user experience and replaces it with a hardcoded location, while introducing a new AI agent prompt as the primary interaction point for users.

## Changes Made

### Main Process (`src/main/index.ts`)

1. **Removed directory selection functionality:**
   - Removed `selectedAppsDir` variable
   - Removed `selectAppsDirectory()` function that showed directory picker dialog
   - Removed `ensureApps()` function that copied apps from selected directory
   - Removed `savePreferences()` function and related interfaces
   - Removed IPC handlers: `change-apps-directory` and `reload-apps`

2. **Added hardcoded Apps directory:**
   - Created `getAppsDirectory()` function that returns `userData/Apps` (case sensitive)
   - Function automatically creates the directory if it doesn't exist
   - Updated `loadApps()` to use the hardcoded directory
   - Updated `load-app` IPC handler to use the hardcoded directory

### Renderer Process (`src/renderer/App.tsx`)

1. **Updated directory handling:**
   - Modified `getAppsDirectory()` to use hardcoded `Apps` directory
   - Removed fallback to preferences file reading
   - Simplified error handling for directory access

2. **Removed directory selection UI:**
   - Removed `appsDirectory` state variable
   - Removed `handleChangeAppsDirectory()` and `handleReloadApps()` functions
   - Removed directory setup/selection interface from new tab
   - Removed directory controls from settings modal
   - Removed persistent directory controls

3. **Added AI Agent Build Prompt:**
   - Added `buildPrompt` state for capturing user input
   - Created new prompt UI at the top of new tab interface
   - Prompt includes:
     - Main title: "What do you want to build today?"
     - Subtitle: "Describe your idea and I'll help you create it"
     - Text input with placeholder "I want to build..."
     - Submit button "Start Building"
     - Skeleton event handlers (currently just console.log)

4. **Restructured new tab layout:**
   - AI prompt is now the primary element at the top
   - Existing apps (drop zone, utilities, contextual apps) only show if apps exist
   - Simplified content structure with better visual hierarchy

### Styling (`src/renderer/styles.css`)

1. **Added AI Agent Prompt styles:**
   - `.ai-agent-prompt`: Main container with surface background and border
   - `.prompt-header`: Centered header section
   - `.prompt-title`: Large gradient text title (3xl size)
   - `.prompt-subtitle`: Secondary description text
   - `.prompt-input-container`: Flexbox layout for input and button
   - `.prompt-input`: Styled text input with focus states
   - `.prompt-submit-btn`: Accent-colored submit button with hover effects
   - Responsive design for mobile devices

## Technical Details

### Directory Structure
- **Before**: User-selected directory anywhere on filesystem
- **After**: `<electron-userData>/Apps/` (automatically created)

### User Experience Flow
- **Before**: Launch → Directory selection dialog → Choose folder → Apps load
- **After**: Launch → Build prompt displayed → Apps load automatically from hardcoded location

### Backward Compatibility
- Existing apps in the old `userData/apps` directory will not be automatically migrated
- Users will need to manually move their apps to the new `Apps` directory

## Next Steps for AI Agent Implementation

The skeleton prompt is now in place with TODO markers for:
1. Build prompt submission handling
2. Integration with AI agent backend
3. App generation workflow
4. Progress feedback UI

## Files Modified

- `src/main/index.ts` - Main process changes
- `src/renderer/App.tsx` - UI and logic changes
- `src/renderer/styles.css` - New prompt styling
- `prompt-log/remove-directory-selection-add-build-prompt.md` - This summary

## Migration Notes

If users have existing apps in the old location (`userData/apps`), they should manually copy them to the new location (`userData/Apps`) to continue using them.