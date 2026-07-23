import { useState, useEffect, FormEvent, MouseEvent as ReactMouseEvent } from 'react';
import { api, UserProfile, clearAuthSession } from '../utils/api';

interface StudentDashboardProps {
  onClose?: () => void;
}

export default function StudentDashboard({ onClose }: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'form'>('overview');
  const [user, setUser] = useState<UserProfile | null>(() => {
    const name = localStorage.getItem('user_name');
    const email = localStorage.getItem('user_email');
    const fest_id = localStorage.getItem('fest_id');
    const role = localStorage.getItem('user_role') || 'PARTICIPANT';
    if (name || email) {
      return {
        id: '',
        email: email || '',
        name: name || 'Envision Explorer',
        fest_id: fest_id || 'ENV-2026-001',
        role: role,
        is_approved: true,
        department: 'Computer Science',
      };
    }
    return null;
  });

  // Form State
  const [fullName, setFullName] = useState<string>('');
  const [gender, setGender] = useState<string>('Male');
  const [college, setCollege] = useState<string>('');
  const [department, setDepartment] = useState<string>('Computer Science');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch initial profile from backend
  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await api.get<UserProfile>('/users/me');
        setUser(data);
        setFullName(data.full_name || data.name || '');
        setGender(data.gender || 'Male');
        setCollege(data.college || '');
        setDepartment(data.department || 'Computer Science');
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    }
    fetchProfile();
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = '/';
  };

  const handleSubmitProfile = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const updatedUser = await api.put<UserProfile>('/users/me/profile', {
        full_name: fullName,
        gender: gender,
        college: college,
        department: department,
      });

      setUser(updatedUser);
      if (updatedUser.name) {
        localStorage.setItem('user_name', updatedUser.name);
      }
      setSuccessMessage('✓ Profile successfully updated!');
      setTimeout(() => {
        setSuccessMessage(null);
        setActiveTab('overview');
      }, 1500);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setErrorMessage(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 1. In-Place Glassmorphism Overlay Container (3D Safe) with Explicit Inline Styles
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        pointerEvents: 'auto',
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={onClose || (() => (window.location.href = '/'))}
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 font-mono select-none overflow-y-auto"
    >
      {/* Scrollable Cyberpunk Glass Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'rgba(12, 7, 33, 0.95)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '2px solid rgba(0, 243, 255, 0.4)',
          borderRadius: '24px',
          boxShadow: '0 0 60px rgba(0, 243, 255, 0.3)',
          position: 'relative',
          color: '#ffffff',
          zIndex: 999999,
          boxSizing: 'border-box',
        }}
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto custom-scrollbar bg-[#0c0721]/95 backdrop-blur-3xl border-2 border-[#00f3ff]/40 rounded-3xl shadow-[0_0_60px_rgba(0,243,255,0.3)] flex flex-col md:flex-row relative text-white font-sans transition-all duration-300"
        onClick={(e: ReactMouseEvent) => e.stopPropagation()}
        onPointerDown={(e: ReactMouseEvent) => e.stopPropagation()}
      >
        {/* Top Glowing Laser Accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #00f3ff 0%, #a855f7 50%, #ec4899 100%)',
            boxShadow: '0 0 15px #00f3ff',
            zIndex: 30,
          }}
        />

        {/* Close Button (X) */}
        <button
          onClick={onClose || (() => (window.location.href = '/'))}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 40,
            width: '36px',
            height: '36px',
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Close Dashboard"
        >
          ✕
        </button>

        {/* 2. Left Column (Profile Summary & Navigation - 1/3 width on desktop, 100% on mobile) */}
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            padding: '24px',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            textAlign: 'left',
            boxSizing: 'border-box',
          }}
          className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10"
        >
          <div>
            {/* Student Header Badge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(0, 243, 255, 0.15)', border: '1px solid rgba(0, 243, 255, 0.4)', color: '#00f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '12px' }}>
                🎓
              </div>

              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0, fontFamily: 'monospace' }}>
                {user?.full_name || user?.name || 'Envision Explorer'}
              </h2>
              <p style={{ fontSize: '12px', color: '#38bdf8', margin: '4px 0 10px 0', fontFamily: 'monospace' }}>
                {user?.email || 'registered@user'}
              </p>
              <div style={{ padding: '4px 12px', borderRadius: '9999px', backgroundColor: 'rgba(0, 243, 255, 0.15)', border: '1px solid rgba(0, 243, 255, 0.4)', color: '#00f3ff', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace' }}>
                ID: {user?.fest_id || 'ENV-2026-001'}
              </div>
            </div>

            {/* Status Indicator */}
            <div style={{ margin: '20px 0', padding: '12px', borderRadius: '14px', backgroundColor: 'rgba(6, 78, 59, 0.5)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#6ee7b7', fontSize: '12px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800 }}>✓ STATUS: ALL EVENTS UNLOCKED</span>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => setActiveTab('overview')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: activeTab === 'overview' ? 'rgba(0, 243, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: activeTab === 'overview' ? '#00f3ff' : '#d1d5db',
                  border: activeTab === 'overview' ? '1px solid rgba(0, 243, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <span>📊</span> Overview
              </button>

              <button
                onClick={() => setActiveTab('form')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: activeTab === 'form' ? 'rgba(0, 243, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: activeTab === 'form' ? '#00f3ff' : '#d1d5db',
                  border: activeTab === 'form' ? '1px solid rgba(0, 243, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <span>✏️</span> Complete Profile
              </button>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(220, 38, 38, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>🚪</span> Log Out Session
          </button>
        </div>

        {/* 3. Right Column (Dynamic Views & Form - 2/3 width) */}
        <div style={{ flex: 1, padding: '28px', paddingBottom: '44px', backgroundColor: 'rgba(8, 4, 21, 0.7)', textAlign: 'left', display: 'flex', flexDirection: 'column', overflowY: 'auto', boxSizing: 'border-box' }}>
          {activeTab === 'overview' ? (
            /* State 1: Overview */
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', justifyContent: 'space-between', gap: '20px' }}>
              <div>
                <div style={{ color: '#00f3ff', fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  STUDENT PORTAL NODE
                </div>
                <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', margin: 0, fontFamily: 'monospace' }}>
                  WELCOME TO ENVISION '26
                </h1>
                <p style={{ fontSize: '13px', color: '#d1d5db', marginTop: '8px', fontFamily: 'monospace', lineHeight: '1.5' }}>
                  Your student pass is active. Access your fest credentials, track unlocked event workshops, or complete your academic profile below.
                </p>

                {/* Info Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '20px' }}>
                  <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FULL NAME</span>
                    <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 800 }}>
                      {user?.full_name || user?.name || 'Not Specified'}
                    </span>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>COLLEGE / UNIV</span>
                    <span style={{ color: '#38bdf8', fontSize: '14px', fontWeight: 800 }}>
                      {user?.college || 'Calcutta University'}
                    </span>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>DEPARTMENT</span>
                    <span style={{ color: '#d8b4fe', fontSize: '14px', fontWeight: 800 }}>
                      {user?.department || 'Computer Science'}
                    </span>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>GENDER</span>
                    <span style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 800 }}>
                      {user?.gender || 'Male'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Banner */}
              <div style={{ marginTop: '28px', padding: '20px', borderRadius: '16px', background: 'linear-gradient(90deg, rgba(8, 51, 68, 0.6) 0%, rgba(88, 28, 135, 0.6) 100%)', border: '1px solid rgba(0, 243, 255, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Academic Details Incomplete?</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#d1d5db' }}>
                    Update your college and department details to print your official fest badge.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('form')}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    backgroundColor: '#00f3ff',
                    color: '#000000',
                    fontWeight: 900,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 0 15px rgba(0, 243, 255, 0.4)',
                  }}
                >
                  Edit Profile →
                </button>
              </div>
            </div>
          ) : (
            /* State 2: Complete Profile (The Form) */
            <form onSubmit={handleSubmitProfile} style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', justifyContent: 'space-between', gap: '24px', paddingBottom: '24px' }}>
              <div>
                <div style={{ color: '#00f3ff', fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  ACADEMIC REGISTRATION
                </div>
                <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', margin: 0, fontFamily: 'monospace' }}>
                  COMPLETE YOUR PROFILE
                </h1>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', fontFamily: 'monospace' }}>
                  Provide your complete academic details for festival credentials and participation certificates.
                </p>

                {/* Notifications */}
                {successMessage && (
                  <div style={{ marginTop: '16px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(6, 78, 59, 0.7)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#6ee7b7', fontSize: '12px' }}>
                    {successMessage}
                  </div>
                )}
                {errorMessage && (
                  <div style={{ marginTop: '16px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(127, 29, 29, 0.7)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', fontSize: '12px' }}>
                    {errorMessage}
                  </div>
                )}

                {/* Form Fields Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '20px' }}>
                  {/* Full Name */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ color: '#d1d5db', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      FULL NAME
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g., Alex Mercer"
                      required
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        color: '#ffffff',
                        outline: 'none',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* Gender Dropdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ color: '#d1d5db', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      GENDER
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      style={{
                        backgroundColor: '#120a26',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        color: '#ffffff',
                        outline: 'none',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  {/* Department */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ color: '#d1d5db', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      DEPARTMENT / MAJOR
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g., Computer Science"
                      required
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        color: '#ffffff',
                        outline: 'none',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* College / University */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ color: '#d1d5db', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      COLLEGE / UNIVERSITY
                    </label>
                    <input
                      type="text"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      placeholder="e.g., Calcutta University"
                      required
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        color: '#ffffff',
                        outline: 'none',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#d1d5db',
                    fontWeight: 700,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '12px',
                    background: 'linear-gradient(90deg, #06b6d4 0%, #9333ea 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(0, 243, 255, 0.4)',
                  }}
                >
                  {isLoading ? 'SAVING...' : 'SAVE PROFILE'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
