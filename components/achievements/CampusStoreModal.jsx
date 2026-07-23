import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, ShoppingBag, CheckCircle, Sparkles } from 'lucide-react';
import { CAMPUS_STORE_ITEMS, purchaseStoreItem } from '../../services/achievementService';

const CampusStoreModal = ({ isOpen, onClose, userId, userCoins = 0, onPurchaseComplete }) => {
  const [purchasingId, setPurchasingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleBuy = async (item) => {
    setPurchasingId(item.id);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await purchaseStoreItem(userId, item);
    if (res.success) {
      setSuccessMsg(`Successfully purchased ${item.title}! 🎉`);
      if (onPurchaseComplete) onPurchaseComplete(res.remainingCoins);
    } else {
      setErrorMsg(res.error || 'Failed to complete purchase.');
    }
    setPurchasingId(null);
  };

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{
            background: 'var(--white, #FFFFFF)',
            color: 'var(--text-primary, #121212)',
            borderRadius: '24px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90dvh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: 'var(--shadow-xl)',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '1.8rem' }}>🛍️</div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Campus Store</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Redeem your earned Campus Coins</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '6px 14px', borderRadius: '100px', fontWeight: 900, color: '#F59E0B', fontSize: '0.9rem' }}>
                🪙 {userCoins} Coins
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
          </div>

          {errorMsg && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px' }}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px' }}>
              {successMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {CAMPUS_STORE_ITEMS.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '16px',
                  background: 'var(--bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>{item.icon}</div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.98rem', fontWeight: 800 }}>{item.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.description}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ fontWeight: 900, color: '#F59E0B', fontSize: '0.95rem' }}>🪙 {item.price}</span>
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={purchasingId === item.id || userCoins < item.price}
                    className="btn btn-primary"
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.78rem',
                      borderRadius: '8px',
                      fontWeight: 800,
                      opacity: userCoins < item.price ? 0.5 : 1
                    }}
                  >
                    {purchasingId === item.id ? 'Buying...' : 'Redeem'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CampusStoreModal;
