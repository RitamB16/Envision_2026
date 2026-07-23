import { useState, useEffect } from 'react';
import { api, UserProfile, clearAuthSession } from '../utils/api';
import StudentDashboard from './StudentDashboard';

interface User {
  name: string;
  email: string;
  fest_id: string;
  college?: string;
  department?: string;
  gender?: string;
  profile_picture?: string;
}

interface ProfileModalProps {
  isOpen?: boolean;
  user?: User;
  onClose: () => void;
  onLogout?: () => void;
  onEditProfile?: () => void;
}

export default function ProfileModal({ isOpen = true, user: initialUser, onClose, onLogout, onEditProfile }: ProfileModalProps) {
  const [showDashboard, setShowDashboard] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (initialUser) {
      return {
        id: '',
        email: initialUser.email,
        name: initialUser.name,
        fest_id: initialUser.fest_id,
        role: 'PARTICIPANT',
        is_approved: true,
        department: initialUser.department || 'Computer Science',
        college: initialUser.college || '',
        gender: initialUser.gender || 'Male',
        profile_picture: initialUser.profile_picture,
      };
    }

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

  // Fetch updated profile on mount
  useEffect(() => {
    if (!isOpen) return;

    async function fetchProfile() {
      try {
        const data = await api.get<UserProfile>('/users/me');
        setUser(data);
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    }

    fetchProfile();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogoutAction = () => {
    if (onLogout) {
      onLogout();
    } else {
      clearAuthSession();
      window.location.href = '/';
    }
  };

  const handleSwitchAccount = () => {
    clearAuthSession();
    window.location.href = '/register';
  };

  const handleEditClick = () => {
    if (onEditProfile) {
      onEditProfile();
    } else {
      setShowDashboard(true);
    }
  };

  return (
    // 1. Full-Screen Dark Overlay with fixed position & inline style fallback
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
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        pointerEvents: 'auto',
        padding: '16px',
        boxSizing: 'border-box',
      }}
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md font-sans select-none overflow-y-auto"
      onClick={onClose}
    >
      {/* 2. Glassmorphic Modal Card Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'rgba(10, 8, 22, 0.94)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: '28px',
          padding: '24px',
          paddingBottom: '36px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 243, 255, 0.2)',
          position: 'relative',
          color: '#ffffff',
          zIndex: 999999,
          boxSizing: 'border-box',
        }}
        className="w-full max-w-md bg-[#0a0816]/95 backdrop-blur-3xl border border-white/20 rounded-[28px] p-6 pb-9 shadow-[0_0_50px_rgba(0,243,255,0.2)] relative max-h-[90vh] overflow-y-auto custom-scrollbar text-white transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Clean SVG Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '9999px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#9ca3af',
          }}
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10"
          title="Close Modal"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 3. Header & Perfect Circular Avatar */}
        <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '8px' }}>
          <img
            src={user?.profile_picture || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user?.name || "User") + "&background=random"}
            alt="Profile Avatar"
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '9999px',
              objectFit: 'cover',
              border: '3px solid rgba(0, 243, 255, 0.7)',
              boxShadow: '0 0 20px rgba(0, 243, 255, 0.4)',
              margin: '0 auto 16px auto',
              display: 'block',
            }}
            className="w-24 h-24 rounded-full object-cover border-[3px] border-cyan-400 shadow-[0_0_20px_rgba(0,243,255,0.4)] mx-auto mb-4"
          />

          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0', letterSpacing: '0.02em' }}>
            Hi, {user?.name || "Participant"}!
          </h2>
          <p style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 500, margin: 0, fontFamily: 'monospace' }}>
            {user?.email || "No email provided"}
          </p>
        </div>

        {/* 4. Action Buttons */}
        <div style={{ marginBottom: '24px' }}>
          {/* Primary Edit Button */}
          <button
            onClick={handleEditClick}
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.5)',
              borderRadius: '14px',
              padding: '12px 16px',
              color: '#ecfeff',
              fontWeight: 700,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 0 15px rgba(6, 182, 212, 0.25)',
              marginBottom: '12px',
              transition: 'all 0.2s ease',
            }}
            className="w-full bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-500/40 hover:to-blue-500/40 border border-cyan-500/50 rounded-xl py-3 text-cyan-50 text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <span>✏️</span> Complete / Edit Profile
          </button>

          {/* Secondary Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <button
              onClick={handleSwitchAccount}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '14px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                color: '#ffffff',
                transition: 'all 0.2s ease',
              }}
              className="flex-1 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 transition-colors text-white text-xs font-semibold cursor-pointer active:scale-[0.98]"
            >
              <span>🔄</span> Switch
            </button>

            <button
              onClick={handleLogoutAction}
              style={{
                flex: 1,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '14px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                color: '#fca5a5',
                transition: 'all 0.2s ease',
              }}
              className="flex-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 transition-colors text-xs font-semibold cursor-pointer active:scale-[0.98]"
            >
              <span>🚪</span> Sign Out
            </button>
          </div>
        </div>

        {/* 5. Flawless Data Formatting (Flexbox Rows with Explicit Spacing) */}
        <div style={{ textAlign: 'left' }}>
          <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', paddingLeft: '4px' }}>
            Student Information
          </h3>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '18px',
              padding: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
            className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3 text-left"
          >
            {/* Row 1: Fest ID */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fest ID</span>
              <span style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 700, fontFamily: 'monospace' }}>{user?.fest_id || "ENV-2026-001"}</span>
            </div>

            {/* Row 2: College */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>College</span>
              <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>{user?.college || "Calcutta University"}</span>
            </div>

            {/* Row 3: Department */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</span>
              <span style={{ color: '#d8b4fe', fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>{user?.department || "Computer Science"}</span>
            </div>

            {/* Row 4: Gender */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</span>
              <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>{user?.gender || "Male"}</span>
            </div>

            {/* Row 5: Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
              <span style={{ color: '#34d399', fontSize: '12px', fontWeight: 700, textAlign: 'right' }}>✓ All Events Unlocked</span>
            </div>
          </div>
        </div>

      </div>

      {/* 6. In-Place Student Dashboard Modal */}
      {showDashboard && (
        <StudentDashboard onClose={() => setShowDashboard(false)} />
      )}
    </div>
  );
}