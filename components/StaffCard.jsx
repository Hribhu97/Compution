import React from 'react';
import { Mail, Trash2, Bookmark, Settings } from 'lucide-react';

const StaffCard = ({ staff, isAdmin = false, onDelete, onBookmark, isBookmarked = false, onConfigureLimits }) => {
  // Normalize fields between public directory and admin user lists
  const name = staff.displayName || staff.name || 'Anonymous';
  let photo = staff.photoURL || '';
  if (!photo || photo.includes('unsplash.com') || photo.includes('gravatar') || photo.includes('default') || photo.startsWith('http')) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('biswajit')) photo = '/team/biswajit.jpg';
    else if (nameLower.includes('hribhu')) photo = '/team/hribhu.jpg';
    else if (nameLower.includes('sharmistha')) photo = '/team/sharmistha.jpeg';
    else if (nameLower.includes('piyali')) photo = '/team/piyali.jpg';
    else if (nameLower.includes('rajdeep')) photo = '/team/rajdeep.jpg';
    else if (nameLower.includes('sreeparna') || nameLower.includes('panja')) photo = '/team/sreeparna.jpeg';
    else if (!photo) photo = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300';
  }
  const role = staff.roleName || staff.role || 'Staff Member';
  const availability = staff.availability || 'Available';
  const bio = staff.bio || staff.intro || 'No description provided.';
  const specs = staff.specializations || staff.subjects || [];
  const qualification = staff.qualification || 'B.Tech';
  const experience = staff.experience || '0';
  const email = staff.email || 'N/A';

  const roleCleaned = (() => {
    if (staff.email === 'biswa.maity2011@gmail.com') return 'CEO';
    if (staff.email === 'tapadarhribhu@gmail.com') return 'Team Lead';
    return role;
  })();

  return (
    <div
      style={{
        overflow: 'hidden',
        background: '#ffffff',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        borderRadius: '28px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        padding: '0px'
      }}
      className="card animate-card hover-card-effect"
    >
      <div>
        {/* Profile Photo band */}
        <div style={{ position: 'relative', height: '220px', overflow: 'hidden', borderTopLeftRadius: '28px', borderTopRightRadius: '28px' }}>
          <img
            src={photo}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
            className="staff-card-img"
          />
          {/* Gradient Overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, transparent 40%, #ffffff 100%)'
          }} />
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            padding: '4px 10px', borderRadius: '100px',
            background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(4px)',
            color: '#1e293b', fontSize: '0.72rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '4px',
            border: '1px solid rgba(0,0,0,0.06)'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: availability === 'Available' ? 'var(--success)' : 'var(--warning)' }} />
            {availability}
          </div>
        </div>

        {/* Roster Details */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>{name}</h3>
              {/* Blue Verified Badge */}
              <svg viewBox="0 0 24 24" width="16" height="16" style={{ display: 'inline-block', marginLeft: '6px', flexShrink: 0 }} fill="#3b82f6">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#fff"/>
              </svg>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
              {roleCleaned}
            </div>
          </div>

          <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.4, margin: 0, height: '38px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={bio}>
            {bio}
          </p>

          {/* Expertise Tags */}
          {specs && specs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              {specs.map((spec, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '0.68rem',
                    padding: '4px 10px',
                    borderRadius: '100px',
                    fontWeight: 600,
                    background: 'rgba(0, 0, 0, 0.04)',
                    color: '#475569',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {spec}
                </span>
              ))}
            </div>
          )}

          {/* Fast stats row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', fontSize: '0.85rem', color: '#475569', margin: '4px 0 0', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#fbbf24', fontSize: '1rem' }}>★</span>
              <span>{staff.id === 'seed-biswa' || staff.id === 'seed-hribhu' ? '4.9' : '4.8'}</span>
            </div>
            <div style={{ width: '1px', height: '14px', background: 'rgba(0, 0, 0, 0.08)' }} />
            <div title={qualification} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90px' }}>
              {qualification.includes('B.Tech') ? 'B.Tech' : qualification.includes('B.Sc') ? 'B.Sc' : qualification.includes('MCA') ? 'MCA' : qualification.includes('MBA') ? 'MBA' : 'B.Com'}
            </div>
            <div style={{ width: '1px', height: '14px', background: 'rgba(0, 0, 0, 0.08)' }} />
            <div>
              {experience}+ Yrs
            </div>
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isAdmin ? (
            <>
              <a
                href={`mailto:${email}`}
                style={{
                  flex: 1.5,
                  height: '46px',
                  borderRadius: '100px',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  background: 'rgba(0, 0, 0, 0.04)',
                  color: '#1e293b',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <Mail size={16} /> Email
              </a>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigureLimits && onConfigureLimits();
                }}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '100px',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  background: 'rgba(0, 0, 0, 0.04)',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Configure Limits"
              >
                <Settings size={16} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete && onDelete();
                }}
                style={{
                  flex: 1,
                  height: '46px',
                  borderRadius: '100px',
                  border: 'none',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={16} /> Delete
              </button>
            </>
          ) : (
            <>
              <a
                href={`https://wa.me/919674035542?text=Hello,%20I%20would%20like%20to%20get%20in%20touch%20with%20${encodeURIComponent(name)}%20(${encodeURIComponent(roleCleaned)})%20from%20Compution.`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  height: '46px',
                  borderRadius: '100px',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.25s',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.9)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0f172a'}
                onClick={(e) => e.stopPropagation()}
              >
                {/* WhatsApp Icon */}
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.37 5.082L2 22l5.09-1.33a9.92 9.92 0 004.916 1.306h.005c5.507 0 9.99-4.478 9.99-9.985 0-2.667-1.04-5.176-2.93-7.065A9.913 9.913 0 0012.012 2zm5.72 13.916c-.244.69-1.22 1.35-1.68 1.4-1.25.13-2.78-.45-5.26-1.48a16.27 16.27 0 01-5.18-3.41c-1.34-1.36-2.12-2.9-2.12-4.57 0-1.83 1-2.73 1.37-3.08.31-.3.8-.46 1.29-.46.16 0 .32.01.46.02.42.02.63.05.91.73.28.69.96 2.33 1.04 2.5.08.17.14.37.02.6-.12.23-.18.37-.36.58-.18.21-.38.47-.54.63-.18.18-.37.38-.16.74.21.36.94 1.55 2.01 2.5a10.91 10.91 0 002.92 1.8c.36.18.57.15.79-.1.21-.24.91-1.07 1.16-1.43.25-.36.5-.3.84-.17.34.13 2.16 1.02 2.53 1.21.37.19.62.28.71.44.09.16.09.92-.15 1.61z"/>
                </svg>
                Get In Touch
              </a>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmark && onBookmark();
                }}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '100px',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  background: isBookmarked ? 'rgba(83, 109, 254, 0.08)' : 'transparent',
                  color: isBookmarked ? 'var(--primary)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffCard;
