import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, WifiOff, ShieldAlert, AlertTriangle, HelpCircle, RefreshCw, Home } from 'lucide-react';

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '80vh',
  padding: '40px 24px',
  textAlign: 'center',
  color: 'var(--text-primary)',
  background: 'var(--background)'
};

const cardStyle = {
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(20px)',
  border: '1px solid var(--border)',
  padding: '48px 32px',
  borderRadius: '24px',
  boxShadow: '0 20px 50px rgba(0,0,0,0.06)',
  maxWidth: '480px',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '24px'
};

const titleStyle = {
  fontSize: '1.5rem',
  fontWeight: 800,
  margin: 0,
  color: 'var(--dark)'
};

const bodyStyle = {
  fontSize: '0.9rem',
  color: 'var(--text-secondary)',
  lineHeight: 1.6,
  margin: 0
};

const buttonGroupStyle = {
  display: 'flex',
  gap: '12px',
  width: '100%',
  justifyContent: 'center',
  marginTop: '8px'
};

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ background: 'rgba(94, 107, 255, 0.1)', padding: '20px', borderRadius: '50%', color: 'var(--primary)' }}>
          <HelpCircle size={48} />
        </div>
        <div>
          <h1 style={titleStyle}>Page Not Found</h1>
          <p style={bodyStyle}>The page you are looking for does not exist or has been relocated.</p>
        </div>
        <div style={buttonGroupStyle}>
          <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ padding: '12px 24px', borderRadius: '10px' }}>Go Back</button>
          <button onClick={() => navigate('/')} className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><Home size={16} /> Home</button>
        </div>
      </div>
    </div>
  );
}

export function StudentNotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ background: 'rgba(239, 83, 80, 0.1)', padding: '20px', borderRadius: '50%', color: 'var(--danger)' }}>
          <AlertOctagon size={48} />
        </div>
        <div>
          <h1 style={titleStyle}>Student Record Not Found</h1>
          <p style={bodyStyle}>We could not retrieve any student profile matching this account. Please verify credentials or contact the support helpdesk.</p>
        </div>
        <div style={buttonGroupStyle}>
          <button onClick={() => navigate('/')} className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '10px' }}>Back to Home</button>
        </div>
      </div>
    </div>
  );
}

export function PaymentFailedPage() {
  const navigate = useNavigate();
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ background: 'rgba(239, 83, 80, 0.1)', padding: '20px', borderRadius: '50%', color: 'var(--danger)' }}>
          <AlertTriangle size={48} />
        </div>
        <div>
          <h1 style={titleStyle}>Transaction Verification Failed</h1>
          <p style={bodyStyle}>The payment verification timed out or was rejected by the bank server. Please retry the payment or visit the front desk for cash deposition.</p>
        </div>
        <div style={buttonGroupStyle}>
          <button onClick={() => navigate('/dashboard/fees')} className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCw size={16} /> Retry Payment</button>
        </div>
      </div>
    </div>
  );
}

export function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ background: 'rgba(239, 83, 80, 0.1)', padding: '20px', borderRadius: '50%', color: 'var(--danger)' }}>
          <ShieldAlert size={48} />
        </div>
        <div>
          <h1 style={titleStyle}>Access Denied</h1>
          <p style={bodyStyle}>You do not have the required permissions to access this dashboard folder or restricted route.</p>
        </div>
        <div style={buttonGroupStyle}>
          <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ padding: '12px 24px', borderRadius: '10px' }}>Go Back</button>
          <button onClick={() => navigate('/')} className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '10px' }}>Home</button>
        </div>
      </div>
    </div>
  );
}

export function MaintenancePage() {
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '50%', color: '#F59E0B' }}>
          <AlertTriangle size={48} />
        </div>
        <div>
          <h1 style={titleStyle}>Under Scheduled Maintenance</h1>
          <p style={bodyStyle}>Compution platform is undergoing a scheduled database upgrade. We will be back online shortly. Thank you for your patience.</p>
        </div>
      </div>
    </div>
  );
}

export function NetworkOfflinePage() {
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ background: 'rgba(120, 144, 156, 0.1)', padding: '20px', borderRadius: '50%', color: '#78909C' }}>
          <WifiOff size={48} />
        </div>
        <div>
          <h1 style={titleStyle}>You Are Offline</h1>
          <p style={bodyStyle}>Please check your Wi-Fi or cellular network connections. The billing portal requires an active internet connection to synchronize ledger entries.</p>
        </div>
        <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCw size={16} /> Reconnect</button>
      </div>
    </div>
  );
}

export function ServerErrorPage() {
  const navigate = useNavigate();
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ background: 'rgba(239, 83, 80, 0.1)', padding: '20px', borderRadius: '50%', color: 'var(--danger)' }}>
          <AlertTriangle size={48} />
        </div>
        <div>
          <h1 style={titleStyle}>Internal Server Error</h1>
          <p style={bodyStyle}>An unexpected database connection timeout occurred. Our engineers have been automatically notified of the service interruption.</p>
        </div>
        <div style={buttonGroupStyle}>
          <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCw size={16} /> Reload Page</button>
        </div>
      </div>
    </div>
  );
}
