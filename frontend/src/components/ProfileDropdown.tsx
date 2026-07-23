import { useState, useEffect, useRef } from 'react';
import { api, UserProfile } from '../utils/api';
import ProfileModal from './ProfileModal';

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  
  // Instant state fallback from localStorage to prevent UI flickering
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

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user profile from backend on mount
  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await api.get<UserProfile>('/users/me');
        setUser(data);
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    }

    fetchUser();
  }, []);

  // Helper for user initials fallback
  const getInitials = (name?: string) => {
    if (!name) return 'EX';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="relative inline-block text-left hud-interactive" style={{ pointerEvents: 'auto', zIndex: 9999 }} ref={dropdownRef}>
      {/* 1. Single Circular Avatar Trigger (Clickable) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        style={{ pointerEvents: 'auto', cursor: 'pointer', zIndex: 9999 }}
        className="relative group p-0.5 focus:outline-none transition-all duration-300 hover:scale-105 cursor-pointer block bg-transparent border-none hud-interactive"
        title="Click to open Profile Modal"
      >
        {/* Animated Gradient Glow Ring */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-full blur-xs opacity-75 group-hover:opacity-100 group-hover:blur-sm transition duration-500" />

        {/* Outer Glowing Circle Border */}
        <div 
          style={{ width: '46px', height: '46px', borderRadius: '9999px' }}
          className="relative rounded-full p-[2px] bg-gradient-to-br from-[#00f3ff] via-white to-purple-600 shadow-[0_0_15px_rgba(0,243,255,0.4)] group-hover:shadow-[0_0_25px_rgba(0,243,255,0.75)] transition-all flex items-center justify-center overflow-hidden"
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-[#090518] flex items-center justify-center">
            {user?.profile_picture ? (
              <img
                src={user.profile_picture}
                alt={user.name || 'User Avatar'}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '9999px',
                  objectFit: 'cover',
                  display: 'block',
                }}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-[#00f3ff] text-xs font-black font-mono">
                {getInitials(user?.name)}
              </span>
            )}
          </div>
        </div>

        {/* Active Status LED Indicator */}
        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#090518] shadow-[0_0_8px_#10b981] animate-pulse" />
      </button>

      {/* 2. Google Account-Inspired Translucent Glassmorphic Profile Modal */}
      <ProfileModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
