import { useState, useEffect, FormEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { api, UserProfile, EventRegistration, clearAuthSession } from '../utils/api';

interface StudentDashboardProps {
  onClose?: () => void;
}

export default function StudentDashboard({ onClose }: StudentDashboardProps) {
  const location = useLocation();
  const stateData = (location.state as any) || {};
  const justRegisteredEvent = stateData.justRegisteredEvent;

  const [activeTab, setActiveTab] = useState<'overview' | 'form'>('overview');
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
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

  // Fetch initial profile & registrations from backend
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

    async function fetchRegistrations() {
      try {
        const regs = await api.get<EventRegistration[]>('/events/registrations/me');
        if (Array.isArray(regs)) {
          setRegistrations(regs);
        }
      } catch (err) {
        console.warn('Registrations fetch notice:', err);
      }
    }

    fetchProfile();
    fetchRegistrations();
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
    // Glassmorphism Overlay Container
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        pointerEvents: 'auto',
        padding: '10px',
        boxSizing: 'border-box',
      }}
      onClick={onClose || (() => (window.location.href = '/'))}
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 font-mono select-none overflow-hidden"
    >
      {/* Responsive Cyberpunk Glass Modal */}
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          height: '92dvh',
          maxHeight: '92dvh',
          backgroundColor: 'rgba(12, 7, 33, 0.96)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '2px solid rgba(0, 243, 255, 0.4)',
          borderRadius: '24px',
          boxShadow: '0 0 60px rgba(0, 243, 255, 0.3)',
          position: 'relative',
          color: '#ffffff',
          zIndex: 999999,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        className="w-full max-w-4xl h-[92dvh] max-h-[92dvh] bg-[#0c0721]/96 backdrop-blur-3xl border-2 border-[#00f3ff]/40 rounded-3xl shadow-[0_0_60px_rgba(0,243,255,0.3)] flex flex-col md:flex-row relative text-white font-sans transition-all duration-300 overflow-hidden"
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
            top: '14px',
            right: '14px',
            zIndex: 50,
            width: '34px',
            height: '34px',
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

        {/* MOBILE TOP COMPACT NAVIGATION BAR (Only visible on mobile screens < 768px) */}
        <div className="flex md:hidden flex-col p-3 bg-black/60 border-b border-white/10 relative text-left gap-2.5 shrink-0 pt-4">
          <div className="flex items-center gap-2.5 pr-10">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center text-lg shrink-0">
              🎓
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-extrabold text-white font-mono truncate m-0">
                {user?.full_name || user?.name || 'Envision Explorer'}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-mono font-bold">
                  ID: {user?.fest_id || 'ENV-2026-001'}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  ✓ VERIFIED
                </span>
              </div>
            </div>
          </div>

          {/* Compact Mobile Tab Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pt-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/60 shadow-[0_0_10px_rgba(0,243,255,0.3)]'
                  : 'bg-white/5 text-gray-400 border border-white/10'
              }`}
            >
              🎟️ TRACKS ({registrations.length})
            </button>
            <button
              onClick={() => setActiveTab('form')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'form'
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/60 shadow-[0_0_10px_rgba(0,243,255,0.3)]'
                  : 'bg-white/5 text-gray-400 border border-white/10'
              }`}
            >
              ✏️ EDIT PROFILE
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/40 whitespace-nowrap ml-auto cursor-pointer"
            >
              🚪 LOGOUT
            </button>
          </div>
        </div>

        {/* DESKTOP LEFT SIDEBAR (Only visible on screens >= 768px) */}
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            padding: '20px',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            flexDirection: 'column',
            justifyContent: 'space-between',
            textAlign: 'left',
            boxSizing: 'border-box',
          }}
          className="hidden md:flex w-80 border-r border-white/10 shrink-0"
        >
          <div>
            {/* Student Header Badge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', backgroundColor: 'rgba(0, 243, 255, 0.15)', border: '1px solid rgba(0, 243, 255, 0.4)', color: '#00f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '10px' }}>
                🎓
              </div>

              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0, fontFamily: 'monospace' }}>
                {user?.full_name || user?.name || 'Envision Explorer'}
              </h2>
              <p style={{ fontSize: '12px', color: '#38bdf8', margin: '4px 0 8px 0', fontFamily: 'monospace' }}>
                {user?.email || 'registered@user'}
              </p>
              <div style={{ padding: '4px 12px', borderRadius: '9999px', backgroundColor: 'rgba(0, 243, 255, 0.15)', border: '1px solid rgba(0, 243, 255, 0.4)', color: '#00f3ff', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace' }}>
                ID: {user?.fest_id || 'ENV-2026-001'}
              </div>
            </div>

            {/* Status Indicator */}
            <div style={{ margin: '16px 0', padding: '10px 12px', borderRadius: '12px', backgroundColor: 'rgba(6, 78, 59, 0.5)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#6ee7b7', fontSize: '11px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800 }}>✓ STATUS: ALL EVENTS UNLOCKED</span>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => setActiveTab('overview')}
                style={{
                  width: '100%',
                  padding: '12px 14px',
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
                <span>🎟️</span> Registered Events ({registrations.length})
              </button>

              <button
                onClick={() => setActiveTab('form')}
                style={{
                  width: '100%',
                  padding: '12px 14px',
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
                <span>✏️</span> Edit Profile
              </button>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              marginTop: '20px',
              width: '100%',
              padding: '12px 14px',
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

        {/* MAIN SCROLLABLE CONTENT AREA (Full-height scrollable for 100% visibility on both mobile & desktop) */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'rgba(8, 4, 21, 0.7)',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            boxSizing: 'border-box',
            WebkitOverflowScrolling: 'touch'
          }}
          className="p-3.5 sm:p-7 flex-1 overflow-y-auto custom-scrollbar"
        >
          {activeTab === 'overview' ? (
            /* TAB 1: Registered Events & Profile Overview */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
              <div>
                <div style={{ color: '#00f3ff', fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  STUDENT PORTAL NODE
                </div>
                <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', margin: 0, fontFamily: 'monospace' }}>
                  WELCOME TO ENVISION '26
                </h1>
                <p style={{ fontSize: '12px', color: '#d1d5db', marginTop: '6px', fontFamily: 'monospace', lineHeight: '1.5' }}>
                  Your student profile and registered tracks are live below.
                </p>

                {/* Success Alert Banner */}
                {justRegisteredEvent && (
                  <div style={{ marginTop: '14px', padding: '14px', borderRadius: '14px', backgroundColor: 'rgba(6, 78, 59, 0.65)', border: '1px solid rgba(16, 185, 129, 0.5)', color: '#6ee7b7', fontSize: '12px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}>
                    <span style={{ fontSize: '18px' }}>🎉</span>
                    <div>
                      <strong style={{ display: 'block', color: '#ffffff' }}>PAYMENT CONFIRMED!</strong>
                      <span>Successfully registered for <strong style={{ color: '#00f3ff' }}>{justRegisteredEvent}</strong>.</span>
                    </div>
                  </div>
                )}

                {/* REGISTERED EVENTS SECTION */}
                <div style={{ marginTop: '20px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#00f3ff', margin: 0, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      🎟️ MY REGISTERED TRACKS ({registrations.length})
                    </h3>
                  </div>

                  {registrations.length === 0 ? (
                    <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center', color: '#9ca3af', fontSize: '12px', fontFamily: 'monospace' }}>
                      No registered events found yet. Explore tracks on the <a href="/events" style={{ color: '#00f3ff', textDecoration: 'underline' }}>Events Page</a>.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {registrations.map((reg, idx) => {
                        const eventName = reg.event?.name || reg.event_id?.toUpperCase() || 'ENVISION EVENT';
                        const isTechTalk = reg.event_id === 'techtalk' || eventName.includes('TECH TALK');
                        const isPendingVerification = reg.payment_status === 'PENDING_VERIFICATION';
                        const isPaid = reg.payment_status === 'COMPLETED' || reg.payment_status === 'CONFIRMED' || reg.payment_status === 'SUCCESS' || isPendingVerification || isTechTalk;
                        const statusLabel = isTechTalk
                          ? '✓ FREE AUTO-ENROLLED PASS'
                          : isPendingVerification
                          ? '⏳ UTR SUBMITTED (VERIFICATION PENDING)'
                          : (isPaid ? '✓ CONFIRMED & PAID' : 'PENDING CHECKOUT');

                        return (
                          <div
                            key={`reg-${reg.id || idx}-${idx}`}
                            style={{
                              padding: '14px',
                              borderRadius: '14px',
                              backgroundColor: 'rgba(14, 7, 38, 0.85)',
                              border: isPaid ? '1px solid rgba(0, 243, 255, 0.3)' : '1px solid rgba(234, 179, 8, 0.4)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: isPaid ? '#10b981' : '#eab308' }} />
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace' }}>
                                  {eventName}
                                </h4>
                              </div>

                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '9999px',
                                  backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                  border: isPaid ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(234, 179, 8, 0.4)',
                                  color: isPaid ? '#6ee7b7' : '#fef08a',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  fontFamily: 'monospace'
                                }}
                              >
                                {statusLabel}
                              </span>
                            </div>

                            {/* Details Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px', fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', wordBreak: 'break-word' }}>
                              <div>REG ID: <strong style={{ color: '#38bdf8' }}>{reg.id}</strong></div>
                              {reg.food_preference && (
                                <div>FOOD PREF: <strong style={{ color: '#f472b6' }}>{reg.food_preference}</strong></div>
                              )}
                              {reg.team_name && (
                                <div>TEAM: <strong style={{ color: '#c084fc' }}>{reg.team_name}</strong></div>
                              )}
                              {reg.transaction_id && (
                                <div>TXN REF: <strong style={{ color: '#fef08a' }}>{reg.transaction_id}</strong></div>
                              )}
                              {reg.team_members && (
                                <div style={{ gridColumn: '1 / -1' }}>TEAM MEMBERS: <strong style={{ color: '#a7f3d0' }}>{reg.team_members}</strong></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Profile Academic Details Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '18px' }}>
                  <div style={{ padding: '14px', borderRadius: '14px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FULL NAME</span>
                    <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 800 }}>
                      {user?.full_name || user?.name || 'Not Specified'}
                    </span>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '14px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>COLLEGE / UNIV</span>
                    <span style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 800 }}>
                      {user?.college || 'Calcutta University'}
                    </span>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '14px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>DEPARTMENT</span>
                    <span style={{ color: '#d8b4fe', fontSize: '13px', fontWeight: 800 }}>
                      {user?.department || 'Computer Science'}
                    </span>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '14px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>GENDER</span>
                    <span style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 800 }}>
                      {user?.gender || 'Male'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: EDIT PROFILE FORM */
            <form onSubmit={handleSubmitProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', paddingBottom: '30px' }}>
              <div>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#00f3ff',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    width: 'fit-content'
                  }}
                >
                  <span>&larr;</span> BACK TO REGISTERED EVENTS
                </button>

                <div style={{ color: '#00f3ff', fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  STUDENT CREDENTIALS
                </div>
                <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff', margin: 0, fontFamily: 'monospace' }}>
                  EDIT PROFILE DETAILS
                </h1>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', fontFamily: 'monospace' }}>
                  Update your full name, college, and department for event passes.
                </p>

                {/* Notifications */}
                {successMessage && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(6, 78, 59, 0.8)', border: '1px solid rgba(16, 185, 129, 0.5)', color: '#6ee7b7', fontSize: '12px', fontFamily: 'monospace' }}>
                    {successMessage}
                  </div>
                )}
                {errorMessage && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(127, 29, 29, 0.8)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#fca5a5', fontSize: '12px', fontFamily: 'monospace' }}>
                    {errorMessage}
                  </div>
                )}

                {/* Form Fields Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '16px' }}>
                  {/* Full Name */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ color: '#d1d5db', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                      FULL NAME *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name"
                      required
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(0, 243, 255, 0.3)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        color: '#ffffff',
                        outline: 'none',
                        fontSize: '13px',
                        minHeight: '44px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Gender Dropdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ color: '#d1d5db', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                      GENDER *
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      style={{
                        backgroundColor: '#0a051d',
                        border: '1px solid rgba(0, 243, 255, 0.3)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        color: '#ffffff',
                        outline: 'none',
                        fontSize: '13px',
                        cursor: 'pointer',
                        minHeight: '44px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  {/* Department */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ color: '#d1d5db', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                      DEPARTMENT / MAJOR *
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Department / Major"
                      required
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(0, 243, 255, 0.3)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        color: '#ffffff',
                        outline: 'none',
                        fontSize: '13px',
                        minHeight: '44px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* College / University */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ color: '#d1d5db', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                      COLLEGE / UNIVERSITY *
                    </label>
                    <input
                      type="text"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      placeholder="College / University Name"
                      required
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(0, 243, 255, 0.3)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        color: '#ffffff',
                        outline: 'none',
                        fontSize: '13px',
                        minHeight: '44px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '10px',
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
                    padding: '12px 24px',
                    borderRadius: '10px',
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
