import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronRight, CheckCircle2, Loader2, AlertCircle, X } from 'lucide-react';
import { PerformanceSelector } from './PerformanceMeter';
import { addTrackerEntry } from '../../services/trackerService';

const DIFFICULTY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced', 'Revision'];

const Field = ({ label, required, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

const inputStyle = {
  padding: '11px 14px',
  borderRadius: '12px',
  border: '1.5px solid rgba(226,232,240,1)',
  fontSize: '0.88rem',
  color: '#1e293b',
  background: '#fff',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  fontFamily: 'inherit',
};

const handleFocus = (e) => {
  e.target.style.borderColor = '#6366f1';
  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
};
const handleBlur = (e) => {
  e.target.style.borderColor = 'rgba(226,232,240,1)';
  e.target.style.boxShadow = 'none';
};

const FacultyUploadForm = ({ user, students = [], onSuccess, onClose }) => {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchQ, setSearchQ] = useState('');

  const [form, setForm] = useState({
    topic: '',
    chapter: '',
    difficulty: 'Beginner',
    courseName: user?.course || '',
    classDate: new Date().toISOString().split('T')[0],
    attended: true,
    homework: '',
    assignment: '',
    practicalWork: '',
    performance: 'good',
    teacherNote: '',
    nextClassPlan: '',
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const filteredStudents = students.filter(s =>
    s.displayName?.toLowerCase().includes(searchQ.toLowerCase()) ||
    s.course?.toLowerCase().includes(searchQ.toLowerCase())
  );

  const toggleStudent = (id) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!form.topic.trim()) { setError('Topic is required.'); return; }
    if (!form.courseName.trim()) { setError('Course name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const totalXP = (form.attended ? 10 : 0) + (form.performance === 'excellent' ? 30 : 0);
      await addTrackerEntry({
        ...form,
        facultyId: user?.uid,
        facultyName: user?.displayName || 'Faculty',
        studentIds: selectedStudents,
        status: 'completed',
        xpAwarded: totalXP,
        classDate: new Date(form.classDate),
      }, selectedStudents);
      setSaved(true);
      setTimeout(() => { onSuccess?.(); }, 1800);
    } catch (err) {
      setError(err.message || 'Failed to save class entry.');
    } finally {
      setSaving(false);
    }
  };

  if (saved) return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      style={{ textAlign: 'center', padding: '48px 24px' }}
    >
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        style={{ fontSize: '4rem', marginBottom: '16px' }}
      >🎉</motion.div>
      <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '1.2rem', fontWeight: 800 }}>Class Recorded!</h3>
      <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
        Students will see their progress update now.
      </p>
    </motion.div>
  );

  return (
    <div>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{
            flex: 1, height: '4px', borderRadius: '100px',
            background: s <= step ? '#6366f1' : 'rgba(226,232,240,1)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>Class Details</h3>
            <Field label="Topic Covered" required>
              <input
                style={inputStyle} value={form.topic} placeholder="e.g. Introduction to Functions"
                onChange={e => set('topic', e.target.value)}
                onFocus={handleFocus} onBlur={handleBlur}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Chapter / Module">
                <input style={inputStyle} value={form.chapter} placeholder="e.g. Chapter 3"
                  onChange={e => set('chapter', e.target.value)} onFocus={handleFocus} onBlur={handleBlur}
                />
              </Field>
              <Field label="Class Date" required>
                <input type="date" style={inputStyle} value={form.classDate}
                  onChange={e => set('classDate', e.target.value)} onFocus={handleFocus} onBlur={handleBlur}
                />
              </Field>
            </div>
            <Field label="Course" required>
              <input style={inputStyle} value={form.courseName} placeholder="e.g. Web Development"
                onChange={e => set('courseName', e.target.value)} onFocus={handleFocus} onBlur={handleBlur}
              />
            </Field>
            <Field label="Difficulty Level">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {DIFFICULTY_OPTIONS.map(d => (
                  <button key={d} onClick={() => set('difficulty', d)} style={{
                    padding: '6px 14px', borderRadius: '100px', cursor: 'pointer', border: 'none',
                    fontWeight: 700, fontSize: '0.78rem',
                    background: form.difficulty === d ? '#6366f1' : 'rgba(226,232,240,1)',
                    color: form.difficulty === d ? '#fff' : '#475569',
                    transition: 'all 0.2s',
                  }}>
                    {d}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Practical Work">
              <input style={inputStyle} value={form.practicalWork} placeholder="Describe practical activity..."
                onChange={e => set('practicalWork', e.target.value)} onFocus={handleFocus} onBlur={handleBlur}
              />
            </Field>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>Homework & Performance</h3>
            <Field label="Homework Assigned">
              <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.homework}
                placeholder="Describe the homework or assignment given..."
                onChange={e => set('homework', e.target.value)} onFocus={handleFocus} onBlur={handleBlur}
              />
            </Field>
            <Field label="Assignment Given">
              <input style={inputStyle} value={form.assignment} placeholder="e.g. Build a calculator app"
                onChange={e => set('assignment', e.target.value)} onFocus={handleFocus} onBlur={handleBlur}
              />
            </Field>
            <Field label="Overall Student Performance" required>
              <PerformanceSelector value={form.performance} onChange={val => set('performance', val)} />
            </Field>
            <Field label="Class Attendance">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                <div
                  onClick={() => set('attended', !form.attended)}
                  style={{
                    width: 44, height: 24, borderRadius: '100px', cursor: 'pointer',
                    background: form.attended ? '#22c55e' : 'rgba(148,163,184,0.3)',
                    position: 'relative', transition: 'background 0.25s',
                  }}
                >
                  <motion.div
                    animate={{ x: form.attended ? 22 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
                  />
                </div>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569' }}>
                  {form.attended ? '✅ Students marked present' : '❌ Students absent'}
                </span>
              </label>
            </Field>
            <Field label="Teacher Note / Remark">
              <textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} value={form.teacherNote}
                placeholder="e.g. Great participation today! Focused session."
                onChange={e => set('teacherNote', e.target.value)} onFocus={handleFocus} onBlur={handleBlur}
              />
            </Field>
            <Field label="Next Class Plan">
              <input style={inputStyle} value={form.nextClassPlan} placeholder="e.g. CSS Grid & Flexbox deep dive"
                onChange={e => set('nextClassPlan', e.target.value)} onFocus={handleFocus} onBlur={handleBlur}
              />
            </Field>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>Tag Students</h3>
            <p style={{ margin: 0, fontSize: '0.83rem', color: '#64748b' }}>Select students who attended this class to award XP and update their journey.</p>
            <input
              style={{ ...inputStyle, marginBottom: '4px' }}
              placeholder="Search students..."
              value={searchQ} onChange={e => setSearchQ(e.target.value)}
              onFocus={handleFocus} onBlur={handleBlur}
            />
            {/* Select All */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 12px', borderRadius: '10px', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }}>
              <input type="checkbox"
                checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                onChange={() => {
                  if (selectedStudents.length === filteredStudents.length) setSelectedStudents([]);
                  else setSelectedStudents(filteredStudents.map(s => s.id));
                }}
              />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6366f1' }}>
                Select All ({filteredStudents.length})
              </span>
            </label>
            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredStudents.map(s => (
                <label key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                  padding: '10px 12px', borderRadius: '10px',
                  background: selectedStudents.includes(s.id) ? 'rgba(99,102,241,0.06)' : 'rgba(248,250,252,1)',
                  border: `1px solid ${selectedStudents.includes(s.id) ? 'rgba(99,102,241,0.2)' : 'rgba(226,232,240,1)'}`,
                  transition: 'all 0.2s',
                }}>
                  <input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudent(s.id)} />
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                    {(s.displayName || 'S')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>{s.displayName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{s.course}</div>
                  </div>
                </label>
              ))}
              {filteredStudents.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.85rem' }}>No students found.</div>
              )}
            </div>
            <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)', fontSize: '0.82rem', color: '#6366f1', fontWeight: 600 }}>
              ⚡ Each tagged student will receive +{(form.attended ? 10 : 0) + (form.performance === 'excellent' ? 30 : 0)} XP from this class.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.83rem', color: '#dc2626', fontWeight: 600 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'space-between' }}>
        {step > 1 ? (
          <button onClick={() => setStep(p => p - 1)} style={{
            padding: '11px 20px', borderRadius: '12px', border: '1.5px solid rgba(226,232,240,1)',
            background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
          }}>
            ← Back
          </button>
        ) : (
          <div />
        )}
        {step < 3 ? (
          <button onClick={() => setStep(p => p + 1)} style={{
            padding: '11px 24px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            Next Step <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: '11px 28px', borderRadius: '12px', border: 'none',
              background: saving ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: saving ? 'none' : '0 4px 16px rgba(34,197,94,0.3)',
            }}
          >
            {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><CheckCircle2 size={16} /> Save Class</>}
          </button>
        )}
      </div>
    </div>
  );
};

export default FacultyUploadForm;
