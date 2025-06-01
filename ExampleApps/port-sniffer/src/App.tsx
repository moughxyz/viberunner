import React, { useState, useEffect } from 'react';

declare global {
  interface Window {
    api?: any;
  }
}

interface PortInfo {
  protocol: string;
  localAddress: string;
  localPort: number;
  foreignAddress: string;
  foreignPort: number;
  state: string;
  pid?: number;
  processName?: string;
}

interface StandaloneVisualizerProps {
  fileData: null;
}

const PortSniffer: React.FC<StandaloneVisualizerProps> = ({ fileData }) => {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState('all');

  const parseNetstatOutput = (output: string): PortInfo[] => {
    const lines = output.split('\n').slice(1); // Skip header
    const portInfos: PortInfo[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.trim().split(/\s+/);
      if (parts.length < 4) continue;

      const protocol = parts[0];
      const localAddr = parts[1];
      const foreignAddr = parts[2];
      const state = parts[3];

      // Parse local address and port
      const localParts = localAddr.split(':');
      const localPort = parseInt(localParts[localParts.length - 1]);
      const localAddress = localParts.slice(0, -1).join(':');

      // Parse foreign address and port
      const foreignParts = foreignAddr.split(':');
      const foreignPort = parseInt(foreignParts[foreignParts.length - 1]) || 0;
      const foreignAddress = foreignParts.slice(0, -1).join(':');

      if (!isNaN(localPort)) {
        portInfos.push({
          protocol,
          localAddress,
          localPort,
          foreignAddress,
          foreignPort,
          state,
        });
      }
    }

    return portInfos;
  };

  const getLsofInfo = async (port: number): Promise<{ pid?: number; processName?: string }> => {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync(`lsof -i :${port} -P -n`);
      const lines = stdout.split('\n');

      for (const line of lines) {
        if (line.includes('LISTEN') || line.includes('ESTABLISHED')) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            return {
              pid: parseInt(parts[1]),
              processName: parts[0]
            };
          }
        }
      }
    } catch (error) {
      // Process not found or permission denied
    }

    return {};
  };

  const scanPorts = async () => {
    setLoading(true);
    setError(null);

    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      const os = require('os');

      let command = 'netstat -an';
      if (os.platform() === 'darwin' || os.platform() === 'linux') {
        command = 'netstat -an -p tcp && netstat -an -p udp';
      }

      const { stdout } = await execAsync(command);
      const portInfos = parseNetstatOutput(stdout);

      // Get process info for listening ports
      const portsWithProcessInfo = await Promise.all(
        portInfos.map(async (portInfo) => {
          if (portInfo.state === 'LISTEN' || portInfo.state === '*.*') {
            const processInfo = await getLsofInfo(portInfo.localPort);
            return { ...portInfo, ...processInfo };
          }
          return portInfo;
        })
      );

      setPorts(portsWithProcessInfo);
    } catch (err) {
      setError(`Failed to scan ports: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scanPorts();
  }, []);

  const filteredPorts = ports.filter(port => {
    const matchesFilter = filter === '' ||
      port.localPort.toString().includes(filter) ||
      port.localAddress.includes(filter) ||
      (port.processName && port.processName.toLowerCase().includes(filter.toLowerCase())) ||
      port.state.toLowerCase().includes(filter.toLowerCase());

    const matchesProtocol = selectedProtocol === 'all' ||
      port.protocol.toLowerCase() === selectedProtocol.toLowerCase();

    return matchesFilter && matchesProtocol;
  });

  const getStateColor = (state: string) => {
    switch (state.toUpperCase()) {
      case 'LISTEN': return '#10b981'; // green
      case 'ESTABLISHED': return '#3b82f6'; // blue
      case 'TIME_WAIT': return '#f59e0b'; // yellow
      case 'CLOSE_WAIT': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const styles = {
    container: {
      padding: '20px',
      background: '#0a0a0a',
      color: '#fff',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      flexWrap: 'wrap' as const,
      gap: '10px'
    },
    title: {
      margin: 0,
      fontSize: '24px',
      fontWeight: 'bold'
    },
    controls: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      flexWrap: 'wrap' as const
    },
    input: {
      padding: '8px 12px',
      background: '#1e1e1e',
      border: '1px solid #333',
      borderRadius: '6px',
      color: '#fff',
      fontSize: '14px'
    },
    select: {
      padding: '8px 12px',
      background: '#1e1e1e',
      border: '1px solid #333',
      borderRadius: '6px',
      color: '#fff',
      fontSize: '14px'
    },
    refreshButton: {
      padding: '8px 16px',
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
    },
    table: {
      width: '100%',
      background: '#1e1e1e',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #333'
    },
    tableHeader: {
      background: '#2d2d2d',
      fontWeight: 'bold',
      padding: '12px',
      borderBottom: '1px solid #333'
    },
    tableRow: {
      borderBottom: '1px solid #333'
    },
    tableCell: {
      padding: '12px',
      fontSize: '14px',
      borderRight: '1px solid #333'
    },
    stateBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      color: 'white'
    },
    processInfo: {
      fontSize: '12px',
      color: '#b3b3b3'
    },
    loading: {
      textAlign: 'center' as const,
      padding: '40px',
      fontSize: '16px',
      color: '#b3b3b3'
    },
    error: {
      background: '#ef4444',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px'
    },
    stats: {
      display: 'flex',
      gap: '20px',
      marginBottom: '20px',
      fontSize: '14px',
      color: '#b3b3b3'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          🔍 Scanning open ports...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          ❌ {error}
        </div>
        <button style={styles.refreshButton} onClick={scanPorts}>
          🔄 Retry
        </button>
      </div>
    );
  }

  const listeningPorts = ports.filter(p => p.state === 'LISTEN').length;
  const establishedConnections = ports.filter(p => p.state === 'ESTABLISHED').length;
  const tcpPorts = ports.filter(p => p.protocol.toLowerCase().includes('tcp')).length;
  const udpPorts = ports.filter(p => p.protocol.toLowerCase().includes('udp')).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔍 Port Sniffer</h1>
        <div style={styles.controls}>
          <input
            style={styles.input}
            type="text"
            placeholder="Filter by port, address, process..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <select
            style={styles.select}
            value={selectedProtocol}
            onChange={(e) => setSelectedProtocol(e.target.value)}
          >
            <option value="all">All Protocols</option>
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
          </select>
          <button style={styles.refreshButton} onClick={scanPorts}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div style={styles.stats}>
        <span>📊 Total: {filteredPorts.length}</span>
        <span>🟢 Listening: {listeningPorts}</span>
        <span>🔗 Established: {establishedConnections}</span>
        <span>📡 TCP: {tcpPorts}</span>
        <span>📦 UDP: {udpPorts}</span>
      </div>

      <div style={styles.table}>
        <div style={{ display: 'flex', ...styles.tableHeader }}>
          <div style={{ ...styles.tableCell, width: '80px' }}>Protocol</div>
          <div style={{ ...styles.tableCell, width: '150px' }}>Local Address</div>
          <div style={{ ...styles.tableCell, width: '100px' }}>Port</div>
          <div style={{ ...styles.tableCell, width: '150px' }}>Foreign Address</div>
          <div style={{ ...styles.tableCell, width: '100px' }}>State</div>
          <div style={{ ...styles.tableCell, flex: 1 }}>Process</div>
        </div>

        {filteredPorts.map((port, index) => (
          <div key={index} style={{ display: 'flex', ...styles.tableRow }}>
            <div style={{ ...styles.tableCell, width: '80px' }}>
              {port.protocol.toUpperCase()}
            </div>
            <div style={{ ...styles.tableCell, width: '150px' }}>
              {port.localAddress || '*'}
            </div>
            <div style={{ ...styles.tableCell, width: '100px', fontWeight: 'bold' }}>
              {port.localPort}
            </div>
            <div style={{ ...styles.tableCell, width: '150px' }}>
              {port.foreignAddress || '*'}
              {port.foreignPort ? `:${port.foreignPort}` : ''}
            </div>
            <div style={{ ...styles.tableCell, width: '100px' }}>
              <span
                style={{
                  ...styles.stateBadge,
                  background: getStateColor(port.state)
                }}
              >
                {port.state}
              </span>
            </div>
            <div style={{ ...styles.tableCell, flex: 1 }}>
              {port.processName && (
                <div>
                  <div style={{ fontWeight: 'bold' }}>{port.processName}</div>
                  {port.pid && (
                    <div style={styles.processInfo}>PID: {port.pid}</div>
                  )}
                </div>
              )}
              {!port.processName && <span style={{ color: '#666' }}>—</span>}
            </div>
          </div>
        ))}

        {filteredPorts.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            No ports match the current filter
          </div>
        )}
      </div>
    </div>
  );
};

// Export the component for Viberunner to load
export default PortSniffer;

// Global registration for IIFE bundle
if (typeof window !== 'undefined' && (window as any).__LOAD_APP__) {
  (window as any).__LOAD_APP__(PortSniffer);
}