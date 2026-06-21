import React, { Component } from 'react';
import { AlertOctagon, RotateCw, Trash2, ArrowLeft } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an exception:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      console.error("Failed to clear caches:", e);
      window.location.reload();
    }
  };

  handleGoBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          color: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '24px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '40px',
            maxWidth: '560px',
            width: '100%',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '24px'
          }}>
            
            <div style={{
              background: 'rgba(239, 83, 80, 0.1)',
              color: '#f87171',
              padding: '16px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertOctagon size={40} />
            </div>

            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 10px 0', letterSpacing: '-0.025em' }}>
                Unexpected System Interrupt
              </h1>
              <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                Our consistency doctor detected a processing error. Your database remains secure and intact.
              </p>
            </div>

            {this.state.error && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '12px',
                padding: '14px 18px',
                fontSize: '0.78rem',
                fontFamily: 'Courier New, monospace',
                color: '#fca5a5',
                textAlign: 'left',
                width: '100%',
                maxHeight: '120px',
                overflowY: 'auto',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                wordBreak: 'break-all'
              }}>
                <strong>Error:</strong> {this.state.error.toString()}
              </div>
            )}

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              width: '100%'
            }}>
              <button 
                onClick={this.handleReload}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  border: 'none',
                  color: 'var(--text-on-primary)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                  transition: 'all 0.2s'
                }}
              >
                <RotateCw size={16} /> Reload Application
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
                <button 
                  onClick={this.handleGoBack}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#e2e8f0',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <ArrowLeft size={14} /> Go Back
                </button>

                <button 
                  onClick={this.handleResetAndReload}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Trash2 size={14} /> Reset & Reload
                </button>
              </div>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
