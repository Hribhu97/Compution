import React from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw, Database, Radio, Cpu } from 'lucide-react';

const SystemHealthPanel = ({ 
  doctorRunning, 
  doctorResults, 
  onRunDoctor, 
  activeListenersCount = 9,
  allUsersCount = 0,
  allFeesCount = 0,
  auditLogsCount = 0
}) => {
  // Estimate cached queries size
  const estimatedMemoryUsage = Math.round(50 + (allUsersCount * 0.5) + (allFeesCount * 0.2));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--dark)' }}>
      
      {/* Header Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(83,109,254,0.1)', color: 'var(--primary)', padding: '12px', borderRadius: '12px' }}>
            <Radio size={24} className={navigator.onLine ? "pulse-anim" : ""} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>System Status</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: navigator.onLine ? 'var(--success)' : 'var(--danger)' }}>
              {navigator.onLine ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(102,187,106,0.1)', color: 'var(--success)', padding: '12px', borderRadius: '12px' }}>
            <Database size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Listeners</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{activeListenersCount} Pools</div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(255,167,38,0.1)', color: '#E65100', padding: '12px', borderRadius: '12px' }}>
            <Cpu size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Est. Memory Usage</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>~{estimatedMemoryUsage} KB</div>
          </div>
        </div>

      </div>

      {/* Main Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }} className="grid-2-col-mobile">
        
        {/* Doctor Sweep Panel */}
        <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} style={{ color: 'var(--primary)' }} /> Database Consistency Doctor
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Automated background scanner to locate and repair orphan records and fee discrepancies.
              </p>
            </div>
            <button 
              onClick={onRunDoctor}
              disabled={doctorRunning}
              className="btn btn-primary"
              style={{ padding: '10px 20px', borderRadius: '12px', gap: '8px', fontSize: '0.88rem' }}
            >
              {doctorRunning ? (
                <>
                  <RefreshCw size={14} style={{ animation: 'spin 1.5s linear infinite' }} /> Running Sweep...
                </>
              ) : (
                <>
                  <RefreshCw size={14} /> Run Integrity Doctor
                </>
              )}
            </button>
          </div>

          <div style={{ flex: 1, minHeight: '300px', maxHeight: '420px', overflowY: 'auto', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', padding: '16px', fontFamily: 'Courier New, monospace', fontSize: '0.82rem', lineHeight: 1.5 }}>
            {doctorResults ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {doctorResults.logs.map((log, idx) => {
                  let color = '#333';
                  if (log.includes('❌')) color = 'var(--danger)';
                  else if (log.includes('🔧') || log.includes('✅')) color = 'var(--success)';
                  else if (log.includes('🚀') || log.includes('🎉')) color = 'var(--primary)';
                  else if (log.includes('⚠️')) color = '#E65100';

                  return (
                    <div key={idx} style={{ color }}>
                      {log}
                    </div>
                  );
                })}
              </div>
            ) : doctorRunning ? (
              <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
                <RefreshCw size={18} style={{ animation: 'spin 1.5s linear infinite' }} />
                <span>Scanning collections. Verifying aggregates. Please wait...</span>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '100px' }}>
                No active sweep run. Click "Run Integrity Doctor" to trigger database analysis.
              </div>
            )}
          </div>
        </div>

        {/* Info & Rules Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} style={{ color: 'var(--primary)' }} /> Scan Integrity Rules
            </h4>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Orphan Checks:</strong> Flags active students missing assigned mentors.</li>
              <li><strong>Fee Aggregation:</strong> Recalculates student billing subcollections and syncs them to profiles.</li>
              <li><strong>Group Sync:</strong> Ensures student groups align with their class and streams.</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(83,109,254,0.04)', border: '1px dashed rgba(83,109,254,0.3)', padding: '20px', borderRadius: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.92rem', fontWeight: 800, color: 'var(--primary)' }}>
              Network & Offline Buffer
            </h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Compution uses IndexedDB offline caching. While offline, writes are queued and synced automatically on reconnection.
            </p>
          </div>

        </div>

      </div>

      <style>{`
        .pulse-anim {
          animation: pulseHealth 2s infinite;
        }
        @keyframes pulseHealth {
          0% { opacity: 0.7; }
          50% { opacity: 1; }
          100% { opacity: 0.7; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
};

export default SystemHealthPanel;
