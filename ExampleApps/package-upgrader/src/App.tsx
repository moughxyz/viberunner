import React, { useState, useEffect } from 'react';

// Updated interface to match new Node API
interface FileInput {
  path: string;
  mimetype: string;
}

interface PackageUpgraderProps {
  fileInput: FileInput;
  tabId: string;
  appId: string;
  container: HTMLElement;
  // Legacy support for migration period
  fileData?: {
    path: string;
    mimetype: string;
    content: string;
    analysis?: {
      filename: string;
      size: number;
      isJson: boolean;
      jsonContent?: any;
    };
  };
}

interface DependencyInfo {
  current: string;
  latest: string;
  needsUpdate: boolean;
  error?: string;
  loading?: boolean;
  deprecated?: boolean;
  description?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  downloads?: number;
  vulnerabilities?: VulnerabilityInfo[];
}

interface VulnerabilityInfo {
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  overview?: string;
  references?: string[];
}

interface PackageData {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  [key: string]: any;
}

// Updated global API interface
declare global {
  interface Window {
    api: {
      readFile: (path: string, encoding?: string) => string;
      writeFile: (path: string, content: string, encoding?: string) => { success: boolean; error?: string };
      exists: (path: string) => boolean;
      stat: (path: string) => { size: number; mtime: Date; isFile: boolean; isDirectory: boolean };
      path: {
        dirname: (path: string) => string;
        basename: (path: string) => string;
        extname: (path: string) => string;
        join: (...paths: string[]) => string;
      };
      fs: any;
      require: (module: string) => any;
    };
    __LOAD_APP__?: (component: any) => void;
    registerCleanup?: (tabId: string, cleanup: () => void) => void;
  }
}

const PackageUpgrader: React.FC<PackageUpgraderProps> = ({ fileInput, fileData, tabId, appId }) => {
  const [packageData, setPackageData] = useState<PackageData | null>(null);
  const [dependencyAnalysis, setDependencyAnalysis] = useState<Record<string, DependencyInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'outdated' | 'major' | 'minor' | 'patch'>('all');

  // AppId is available for future use (e.g., preferences)
  console.log('Package Upgrader loaded for app:', appId);

  const darkTheme = {
    background: '#0a0a0a',
    backgroundSecondary: '#1a1a1a',
    backgroundCard: '#1e1e1e',
    textPrimary: '#ffffff',
    textSecondary: '#b3b3b3',
    textMuted: '#808080',
    borderColor: '#333333',
    accentPrimary: '#3b82f6',
    accentSuccess: '#10b981',
    accentWarning: '#f59e0b',
    accentDanger: '#ef4444',
    accentInfo: '#06b6d4',
    shadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
    shadowHover: '0 8px 25px rgba(59, 130, 246, 0.3)'
  };

  // Register cleanup for this tab
  useEffect(() => {
    const cleanup = () => {
      // Cancel any ongoing network requests if needed
      console.log('Cleaning up package upgrader tab');
    };

    if (window.registerCleanup && tabId) {
      window.registerCleanup(tabId, cleanup);
    }

    return cleanup;
  }, [tabId]);

  useEffect(() => {
    const parsePackageJson = () => {
      try {
        setLoading(true);
        setError(null);

        // Use new Node API to read file directly
        const filePath = fileInput?.path || fileData?.path;
        if (!filePath) {
          throw new Error('No file path provided');
        }

        // Check if file exists
        if (!window.api.exists(filePath)) {
          throw new Error(`File does not exist: ${filePath}`);
        }

        // Read file directly using Node API
        const content = window.api.readFile(filePath, 'utf8');

        if (!content) {
          throw new Error('File is empty or could not be read');
        }

        const parsed = JSON.parse(content) as PackageData;
        setPackageData(parsed);

        console.log('Parsed package.json using new Node API:', parsed);
      } catch (err) {
        console.error('Error parsing package.json:', err);
        setError(`Invalid package.json: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    parsePackageJson();
  }, [fileInput, fileData]);

  const getUpdateType = (current: string, latest: string): 'major' | 'minor' | 'patch' | 'none' => {
    try {
      const cleanCurrent = current.replace(/^[\^~>=<]/, '').split('.').map(n => parseInt(n));
      const cleanLatest = latest.split('.').map(n => parseInt(n));

      if (cleanLatest[0] > cleanCurrent[0]) return 'major';
      if (cleanLatest[1] > cleanCurrent[1]) return 'minor';
      if (cleanLatest[2] > cleanCurrent[2]) return 'patch';
      return 'none';
    } catch {
      return 'none';
    }
  };

  const checkLatestVersions = async () => {
    if (!packageData) return;

    setCheckingUpdates(true);
    const allDeps = {
      ...packageData.dependencies,
      ...packageData.devDependencies,
      ...packageData.peerDependencies
    };

    const analysis: Record<string, DependencyInfo> = {};

    // Initialize with loading state
    Object.keys(allDeps).forEach(pkg => {
      analysis[pkg] = {
        current: allDeps[pkg],
        latest: 'checking...',
        needsUpdate: false,
        loading: true
      };
    });
    setDependencyAnalysis({ ...analysis });

    // Check each package
    for (const [pkgName, currentVersion] of Object.entries(allDeps)) {
      try {
        console.log(`Checking ${pkgName}...`);

        // Get package info from npm registry
        const response = await fetch(`https://registry.npmjs.org/${pkgName}`, {
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const latestVersion = data['dist-tags']?.latest;

        if (!latestVersion) {
          throw new Error('No latest version found');
        }

        // Clean version strings for comparison
        const cleanCurrent = currentVersion.replace(/^[\^~>=<]/, '');
        const needsUpdate = cleanCurrent !== latestVersion;

        // Get additional package info
        const latestVersionData = data.versions?.[latestVersion];

        analysis[pkgName] = {
          current: currentVersion,
          latest: latestVersion,
          needsUpdate,
          loading: false,
          deprecated: data.deprecated || latestVersionData?.deprecated,
          description: latestVersionData?.description || data.description,
          homepage: latestVersionData?.homepage || data.homepage,
          repository: typeof data.repository === 'string' ? data.repository : data.repository?.url,
          license: latestVersionData?.license || data.license
        };

        // Update state after each package to show progress
        setDependencyAnalysis({ ...analysis });

      } catch (err) {
        console.error(`Error checking ${pkgName}:`, err);
        analysis[pkgName] = {
          current: currentVersion,
          latest: 'error',
          needsUpdate: false,
          error: err instanceof Error ? err.message : 'Unknown error',
          loading: false
        };
        setDependencyAnalysis({ ...analysis });
      }

      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    setCheckingUpdates(false);
  };

  const toggleUpdate = (pkgName: string) => {
    const newSelected = new Set(selectedUpdates);
    if (newSelected.has(pkgName)) {
      newSelected.delete(pkgName);
    } else {
      newSelected.add(pkgName);
    }
    setSelectedUpdates(newSelected);
  };

  const toggleDetails = (pkgName: string) => {
    const newDetails = new Set(showDetails);
    if (newDetails.has(pkgName)) {
      newDetails.delete(pkgName);
    } else {
      newDetails.add(pkgName);
    }
    setShowDetails(newDetails);
  };

  const selectAllUpdates = () => {
    const filteredPackages = getFilteredPackages();
    const updatablePackages = Object.keys(filteredPackages).filter(
      pkg => filteredPackages[pkg].needsUpdate
    );
    setSelectedUpdates(new Set(updatablePackages));
  };

  const clearAllUpdates = () => {
    setSelectedUpdates(new Set());
  };

  const getFilteredPackages = () => {
    if (filterType === 'all') return dependencyAnalysis;

    return Object.fromEntries(
      Object.entries(dependencyAnalysis).filter(([_pkg, info]) => {
        if (filterType === 'outdated') return info.needsUpdate;
        if (!info.needsUpdate) return false;

        const updateType = getUpdateType(info.current, info.latest);
        return updateType === filterType;
      })
    );
  };

  const generateUpdatedPackageJson = () => {
    if (!packageData) return '';

    const updated = { ...packageData };

    // Apply selected updates
    selectedUpdates.forEach(pkgName => {
      const info = dependencyAnalysis[pkgName];
      if (!info || !info.needsUpdate) return;

      const newVersion = `^${info.latest}`;

      if (updated.dependencies && updated.dependencies[pkgName]) {
        updated.dependencies[pkgName] = newVersion;
      }
      if (updated.devDependencies && updated.devDependencies[pkgName]) {
        updated.devDependencies[pkgName] = newVersion;
      }
      if (updated.peerDependencies && updated.peerDependencies[pkgName]) {
        updated.peerDependencies[pkgName] = newVersion;
      }
    });

    return JSON.stringify(updated, null, 2);
  };

  const handleSave = async () => {
    const updatedContent = generateUpdatedPackageJson();
    const filePath = fileInput?.path || fileData?.path;

    if (!filePath) {
      alert('❌ Error: No file path available');
      return;
    }

    try {
      // Save the updated content using the new Node API
      const saveResult = window.api.writeFile(filePath, updatedContent, 'utf8');
      if (!saveResult.success) {
        throw new Error(`Failed to save file: ${saveResult.error}`);
      }

      alert(`✅ Updated package.json saved successfully!\n\n${selectedUpdates.size} dependencies upgraded.\n\nLocation: ${filePath}\n`);

      // Optionally clear selected updates after successful save
      setSelectedUpdates(new Set());

    } catch (error) {
      console.error('Error saving file:', error);
      alert(`❌ Error saving file: ${error instanceof Error ? error.message : 'Unknown error'}\n\nFalling back to download...`);

      // Fallback: Create a download link for the updated file
      const blob = new Blob([updatedContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'package.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`📥 Updated package.json downloaded!\n\n${selectedUpdates.size} dependencies upgraded.\n\nPlease replace your original package.json with the downloaded file.`);
    }
  };

  const handleSaveAs = () => {
    const updatedContent = generateUpdatedPackageJson();

    // Always download as new file for "Save As" functionality
    const blob = new Blob([updatedContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'package-updated.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`📥 Updated package.json downloaded as 'package-updated.json'!\n\n${selectedUpdates.size} dependencies upgraded.`);
  };

  const getUpdateTypeColor = (updateType: string) => {
    switch (updateType) {
      case 'major': return darkTheme.accentDanger;
      case 'minor': return darkTheme.accentWarning;
      case 'patch': return darkTheme.accentSuccess;
      default: return darkTheme.textSecondary;
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: darkTheme.background,
        color: darkTheme.textPrimary,
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📦</div>
        <div style={{ fontSize: '1.2rem' }}>Analyzing package.json...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: darkTheme.background,
        color: darkTheme.accentDanger,
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
        <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Error parsing package.json</div>
        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{error}</div>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div style={{ padding: '2rem', background: darkTheme.background, color: darkTheme.textPrimary }}>
        <div>No package data available</div>
      </div>
    );
  }

  const totalDeps = Object.keys({
    ...packageData.dependencies,
    ...packageData.devDependencies,
    ...packageData.peerDependencies
  }).length;

  const outdatedCount = Object.values(dependencyAnalysis).filter(info => info.needsUpdate).length;
  const hasAnalysis = Object.keys(dependencyAnalysis).length > 0;
  const filteredPackages = getFilteredPackages();
  const filteredCount = Object.keys(filteredPackages).length;

  // Calculate update type counts
  const updateTypeCounts = Object.values(dependencyAnalysis).reduce((acc, info) => {
    if (!info.needsUpdate) return acc;
    const updateType = getUpdateType(info.current, info.latest);
    acc[updateType] = (acc[updateType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{
      padding: '2rem',
      background: darkTheme.background,
      color: darkTheme.textPrimary,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        background: `linear-gradient(135deg, ${darkTheme.backgroundCard} 0%, ${darkTheme.backgroundSecondary} 100%)`,
        borderRadius: '16px',
        border: `1px solid ${darkTheme.borderColor}`,
        boxShadow: darkTheme.shadow
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600' }}>
            📦 Package Upgrader
          </h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={checkLatestVersions}
              disabled={checkingUpdates}
              style={{
                background: `linear-gradient(135deg, ${darkTheme.accentPrimary} 0%, #8b5cf6 100%)`,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                cursor: checkingUpdates ? 'not-allowed' : 'pointer',
                opacity: checkingUpdates ? 0.6 : 1,
                transition: 'all 0.3s ease'
              }}
            >
              {checkingUpdates ? '🔄 Checking...' : '🔍 Check Updates'}
            </button>

            {hasAnalysis && selectedUpdates.size > 0 && (
              <>
                <button
                  onClick={handleSave}
                  style={{
                    background: `linear-gradient(135deg, ${darkTheme.accentSuccess} 0%, #059669 100%)`,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  💾 Save Changes ({selectedUpdates.size})
                </button>
                <button
                  onClick={handleSaveAs}
                  style={{
                    background: `linear-gradient(135deg, ${darkTheme.accentInfo} 0%, #0891b2 100%)`,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  📥 Download Updated
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ color: darkTheme.textSecondary }}>
            📁 <strong>{packageData.name || 'Unknown'}</strong> v{packageData.version || '0.0.0'}
          </div>
          <div style={{ color: darkTheme.textSecondary }}>
            📊 {totalDeps} total dependencies
          </div>
          {hasAnalysis && (
            <>
              <div style={{ color: outdatedCount > 0 ? darkTheme.accentWarning : darkTheme.accentSuccess }}>
                {outdatedCount > 0 ? '⚠️' : '✅'} {outdatedCount} outdated packages
              </div>
              {updateTypeCounts.major > 0 && (
                <div style={{ color: darkTheme.accentDanger }}>
                  🚨 {updateTypeCounts.major} major updates
                </div>
              )}
              {updateTypeCounts.minor > 0 && (
                <div style={{ color: darkTheme.accentWarning }}>
                  📈 {updateTypeCounts.minor} minor updates
                </div>
              )}
              {updateTypeCounts.patch > 0 && (
                <div style={{ color: darkTheme.accentSuccess }}>
                  🔧 {updateTypeCounts.patch} patch updates
                </div>
              )}
            </>
          )}
        </div>

        {/* Filter Controls */}
        {hasAnalysis && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: darkTheme.textSecondary, fontSize: '0.9rem' }}>Filter:</span>
            {(['all', 'outdated', 'major', 'minor', 'patch'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setFilterType(filter)}
                style={{
                  background: filterType === filter ? darkTheme.accentPrimary : 'transparent',
                  color: filterType === filter ? 'white' : darkTheme.textSecondary,
                  border: `1px solid ${filterType === filter ? darkTheme.accentPrimary : darkTheme.borderColor}`,
                  borderRadius: '6px',
                  padding: '0.4rem 0.8rem',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  textTransform: 'capitalize'
                }}
              >
                {filter} {filter === 'all' ? `(${totalDeps})` : filter === 'outdated' ? `(${outdatedCount})` : `(${updateTypeCounts[filter] || 0})`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dependencies Analysis */}
      {hasAnalysis && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{ margin: 0, color: darkTheme.textPrimary }}>
              📋 Dependency Analysis {filteredCount !== totalDeps && `(${filteredCount} shown)`}
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {outdatedCount > 0 && (
                <>
                  <button
                    onClick={selectAllUpdates}
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: darkTheme.accentPrimary,
                      border: `1px solid ${darkTheme.accentPrimary}`,
                      borderRadius: '6px',
                      padding: '0.5rem 1rem',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearAllUpdates}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: darkTheme.accentDanger,
                      border: `1px solid ${darkTheme.accentDanger}`,
                      borderRadius: '6px',
                      padding: '0.5rem 1rem',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Clear All
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))',
            gap: '1rem'
          }}>
            {Object.entries(filteredPackages).map(([pkgName, info]) => {
              const updateType = info.needsUpdate ? getUpdateType(info.current, info.latest) : 'none';
              const isSelected = selectedUpdates.has(pkgName);
              const showDetail = showDetails.has(pkgName);

              return (
                <div
                  key={pkgName}
                  style={{
                    background: darkTheme.backgroundCard,
                    border: `1px solid ${info.needsUpdate ? getUpdateTypeColor(updateType) : darkTheme.borderColor}`,
                    borderRadius: '12px',
                    padding: '1rem',
                    transition: 'all 0.3s ease',
                    boxShadow: isSelected ? `0 0 0 2px ${darkTheme.accentPrimary}30` : undefined
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ color: darkTheme.textPrimary }}>{pkgName}</strong>
                      {info.deprecated && (
                        <span style={{
                          background: darkTheme.accentDanger,
                          color: 'white',
                          fontSize: '0.7rem',
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px'
                        }}>
                          DEPRECATED
                        </span>
                      )}
                      {info.needsUpdate && (
                        <span style={{
                          background: getUpdateTypeColor(updateType),
                          color: 'white',
                          fontSize: '0.7rem',
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                          textTransform: 'uppercase'
                        }}>
                          {updateType}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {info.needsUpdate && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleUpdate(pkgName)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '0.8rem', color: darkTheme.textSecondary }}>Update</span>
                        </label>
                      )}
                      <button
                        onClick={() => toggleDetails(pkgName)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: darkTheme.textSecondary,
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        {showDetail ? '▼' : '▶'} Info
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.9rem', color: darkTheme.textSecondary }}>
                    <div>Current: <code style={{
                      background: 'rgba(0,0,0,0.3)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontFamily: 'monospace'
                    }}>{info.current}</code></div>
                    <div>Latest: <code style={{
                      background: info.loading ? 'rgba(0,0,0,0.3)' : info.needsUpdate ? `${getUpdateTypeColor(updateType)}20` : 'rgba(16, 185, 129, 0.2)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      color: info.loading ? darkTheme.textMuted : info.needsUpdate ? getUpdateTypeColor(updateType) : darkTheme.accentSuccess,
                      fontFamily: 'monospace'
                    }}>
                      {info.loading ? '...' : info.latest}
                    </code></div>
                    {info.error && (
                      <div style={{ color: darkTheme.accentDanger, fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        Error: {info.error}
                      </div>
                    )}
                  </div>

                  {showDetail && (
                    <div style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: `1px solid ${darkTheme.borderColor}`,
                      fontSize: '0.8rem',
                      color: darkTheme.textSecondary
                    }}>
                      {info.description && (
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong>Description:</strong> {info.description}
                        </div>
                      )}
                      {info.license && (
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong>License:</strong> {info.license}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        {info.homepage && (
                          <a
                            href={info.homepage}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: darkTheme.accentPrimary, textDecoration: 'none' }}
                          >
                            🏠 Homepage
                          </a>
                        )}
                        {info.repository && (
                          <a
                            href={info.repository.replace('git+', '').replace('.git', '')}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: darkTheme.accentPrimary, textDecoration: 'none' }}
                          >
                            📚 Repository
                          </a>
                        )}
                        <a
                          href={`https://www.npmjs.com/package/${pkgName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: darkTheme.accentPrimary, textDecoration: 'none' }}
                        >
                          📦 NPM
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hasAnalysis && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: darkTheme.textMuted,
          background: darkTheme.backgroundCard,
          borderRadius: '12px',
          border: `1px dashed ${darkTheme.borderColor}`
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
          <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Click "Check Updates" to analyze dependencies
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            This will check npm registry for the latest versions and provide detailed information
          </div>
        </div>
      )}
    </div>
  );
};

// Export the component for Vizor to load
export default PackageUpgrader;

// Global registration for IIFE bundle
if (typeof window !== 'undefined' && (window as any).__LOAD_APP__) {
  (window as any).__LOAD_APP__(PackageUpgrader);
}