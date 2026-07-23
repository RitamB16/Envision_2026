import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageLayout from './PageLayout';
import { api, BackendEvent } from '../utils/api';

interface EventData {
  id: string;
  name: string;
  category: string;
  price: string;
  price_amount?: number;
  requires_team: boolean;
  max_team_size: number;
  has_food: boolean;
  notes: string;
  image: string;
  placeholderAlt: string;
  benefits: string;
  date: string;
  venue: string;
  Time: string;
}

const EVENTS_DATA: EventData[] = [
  {
    id: 'techtalk',
    name: 'TECH TALK',
    category: 'SEMINAR',
    price: 'FREE',
    requires_team: false,
    max_team_size: 1,
    has_food: false,
    notes: 'Open to everyone. Free pass unlocked upon registering in any paid event.',
    image: '/images/events/techtalk.jpg',
    placeholderAlt: 'Tech Talk Seminar',
    benefits: 'Free Access to Techfest, RKMRC for keynote sessions, technical seminars, and networking hubs.',
    date: '6th August',
    venue: 'Mumukshananda Auditorium, RKMRC',
    Time: '10:30 AM'
  },
  {
    id: 'syntaxx',
    name: 'SYNTAXX',
    category: 'CODING',
    price: '₹39',
    requires_team: false,
    max_team_size: 1,
    has_food: true,
    notes: 'Individual Event',
    image: '/images/events/syntaxx.jpg',
    placeholderAlt: 'SyntaxX Coding Competition',
    benefits: 'Participation certificate, Exciting Swags for Winner',
    date: '6th August',
    venue: 'Computer Science Lab',
    Time: '1 PM'
  },
  {
    id: 'mindspark',
    name: 'MINDSPARK',
    category: 'QUIZ',
    price: '₹49',
    requires_team: true,
    max_team_size: 2,
    has_food: true,
    notes: 'Team (max. 2 members)',
    image: '/images/events/mindspark.jpg',
    placeholderAlt: 'MindSpark Quiz Competition',
    benefits: 'Participation certificate, Winning Cash prize worth ₹499',
    date: '6th August',
    venue: 'Mumukshananda Auditorium, RKMRC',
    Time: '11:30 AM'
  },
  {
    id: 'bidquest',
    name: 'BIDQUEST',
    category: 'AUCTION',
    price: '₹149',
    requires_team: true,
    max_team_size: 3,
    has_food: true,
    notes: 'Team Event (max. 3 members)',
    image: '/images/events/bidquest.jpg',
    placeholderAlt: 'BidQuest Auction Event',
    benefits: 'Participation certificate, Winning Cash prize worth ₹1199',
    date: '6th August',
    venue: 'Mumukshananda Auditorium, RKMRC',
    Time: '11:00 AM'
  },
  {
    id: 'lensverse',
    name: 'LENSVERSE',
    category: 'PHOTOGRAPHY',
    price: '₹49',
    requires_team: false,
    max_team_size: 1,
    has_food: false,
    notes: 'Individual Event (NO Food Provided)',
    image: '/images/events/lensverse.jpg',
    placeholderAlt: 'LensVerse Online Photography',
    benefits: 'Participation certificate, Winning Cash prize worth ₹499',
    date: '6th August',
    venue: 'Online Submission Portal',
    Time: 'Flexible submission'
  },
  {
    id: 'carlsen-chess',
    name: 'CARLSEN CHESS',
    category: 'CHESS',
    price: '₹49',
    requires_team: false,
    max_team_size: 1,
    has_food: true,
    notes: 'Individual Event',
    image: '/images/events/chess.jpg',
    placeholderAlt: 'Carlsen Chess Compition',
    benefits: 'Participation certificate, Winning Cash prize worth ₹499',
    date: '6th August',
    venue: 'Mumukshananda Auditorium, RKMRC',
    Time: '1 PM'
  }
];

interface TeammateInput {
  name: string;
  email: string;
  phone: string;
  college: string;
}

interface Props {
  onBack: () => void;
}

export default function Events({ onBack: _onBack }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const view = (searchParams.get('view') as 'grid' | 'detail' | 'register') || 'grid';
  const eventId = searchParams.get('id') || '';

  // React Query catalog fetch with 5-minute staleTime
  const { data: eventsList = EVENTS_DATA, isLoading, isError } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      try {
        const res = await api.get<BackendEvent[]>('/events');
        if (res && res.length > 0) {
          return res.map(be => ({
            id: be.id,
            name: be.name,
            category: be.category,
            price: be.price,
            price_amount: be.price_amount,
            requires_team: be.requires_team ?? false,
            max_team_size: be.max_team_size ?? 1,
            has_food: be.has_food ?? true,
            notes: be.notes || '',
            image: be.image || '/images/events/syntaxx.jpg',
            placeholderAlt: be.name,
            benefits: be.benefits || '',
            date: be.date || '6th August',
            venue: be.venue || 'RKMRC',
            Time: be.time || '10:00 AM'
          }));
        }
      } catch (err) {
        console.warn("Backend catalog fallback:", err);
      }
      return EVENTS_DATA;
    },
    staleTime: 300000,
  });

  // React Query single event detail fetch
  const { data: singleEventDetail } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      return api.get<BackendEvent>(`/events/${eventId}`).catch(() => null);
    },
    enabled: !!eventId,
    staleTime: 300000,
  });

  const matchedEvent = eventsList.find(e => e.id === eventId) || null;
  const selectedEvent = singleEventDetail
    ? {
        id: singleEventDetail.id,
        name: singleEventDetail.name,
        category: singleEventDetail.category,
        price: singleEventDetail.price,
        price_amount: singleEventDetail.price_amount,
        requires_team: singleEventDetail.requires_team ?? false,
        max_team_size: singleEventDetail.max_team_size ?? 1,
        has_food: singleEventDetail.has_food ?? true,
        notes: singleEventDetail.notes || '',
        image: singleEventDetail.image || '/images/events/syntaxx.jpg',
        placeholderAlt: singleEventDetail.name,
        benefits: singleEventDetail.benefits || '',
        date: singleEventDetail.date || '6th August',
        venue: singleEventDetail.venue || 'RKMRC',
        Time: singleEventDetail.time || '10:00 AM'
      }
    : matchedEvent;
  const [activeTab, setActiveTab] = useState<'details' | 'rules' | 'contact' | 'terms'>('details');
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);

  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Form State for Registration
  const [fullName, setFullName] = useState<string>(() => localStorage.getItem('user_name') || '');
  const [college, setCollege] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>(() => localStorage.getItem('user_email') || '');
  const [gender, setGender] = useState<string>('Male');
  const [foodPreference, setFoodPreference] = useState<string>('Veg');
  const [teamName, setTeamName] = useState<string>('');
  const [teammates, setTeammates] = useState<TeammateInput[]>([
    { name: '', email: '', phone: '', college: '' },
    { name: '', email: '', phone: '', college: '' },
    { name: '', email: '', phone: '', college: '' },
    { name: '', email: '', phone: '', college: '' }
  ]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [regErrorMsg, setRegErrorMsg] = useState<string | null>(null);
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);
  const [magicInviteUrl, setMagicInviteUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [searchParams]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, cardId: string) => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;

    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const rx = ((yc - y) / yc) * 8;
    const ry = ((x - xc) / xc) * 8;
    setTilt({ rx, ry });
    setHoveredCardId(cardId);
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
    setHoveredCardId(null);
  };

  useEffect(() => {
    const handleEnvisionBack = (e: Event) => {
      if (view === 'detail' || view === 'register') {
        e.preventDefault();
        if (isNavigating) return;
        setIsNavigating(true);
        navigate(-1);
      }
    };

    window.addEventListener('envision-back', handleEnvisionBack);
    return () => {
      window.removeEventListener('envision-back', handleEnvisionBack);
    };
  }, [view, navigate, isNavigating]);

  const handleExplore = (event: EventData) => {
    if (isNavigating) return;
    setIsNavigating(true);
    setActiveTab('details');
    setSearchParams({ view: 'detail', id: event.id });
  };

  const handleRegister = (event: EventData, from: 'grid' | 'detail') => {
    if (isNavigating) return;
    setIsNavigating(true);
    setRegErrorMsg(null);
    setRegSuccessMsg(null);
    setMagicInviteUrl(null);
    setSearchParams({ view: 'register', id: event.id, from });
  };

  const handleTeammateDetailChange = (index: number, field: keyof TeammateInput, value: string) => {
    const updated = [...teammates];
    if (!updated[index]) {
      updated[index] = { name: '', email: '', phone: '', college: '' };
    }
    updated[index] = { ...updated[index], [field]: value };
    setTeammates(updated);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    setIsSubmitting(true);
    setRegErrorMsg(null);
    setRegSuccessMsg(null);
    setMagicInviteUrl(null);

    try {
      const payload: any = {
        event_id: selectedEvent.id,
        phone,
        college,
      };

      if (selectedEvent.has_food) {
        payload.food_preference = foodPreference;
      }

      if (selectedEvent.requires_team) {
        payload.team_name = teamName;
        const activeTeammates = teammates
          .slice(0, selectedEvent.max_team_size - 1)
          .filter(tm => tm.email.trim().length > 0 || tm.name.trim().length > 0)
          .map(tm => ({
            name: tm.name.trim(),
            email: tm.email.trim(),
            phone: tm.phone.trim() || undefined,
            college: tm.college.trim() || undefined
          }));
        payload.teammate_details = activeTeammates;
      }

      const res = await api.post<any>(`/events/${selectedEvent.id}/register`, payload);

      if (selectedEvent.requires_team && res.team_members) {
        setRegSuccessMsg(`🎉 TEAM REGISTRATION CONFIRMED!\nTeam Name: ${res.team_name || teamName}\nRegistered Members & Fest IDs: ${res.team_members}`);
      } else {
        setRegSuccessMsg(`🎉 REGISTRATION CONFIRMED FOR ${selectedEvent.name.toUpperCase()}!`);
      }

      if (res.is_free || res.amount === 0) {
        setRegSuccessMsg(`🎉 Free registration successful for ${selectedEvent.name}! Unlocking pass...`);
        setTimeout(() => {
          navigate('/profile');
        }, 1500);
      } else {
        const regId = res.registration_id || res.id;
        if (phone && phone.trim()) {
          localStorage.setItem('user_phone', phone.trim());
        }
        setRegSuccessMsg(`🎉 Registration created! Redirecting to checkout...`);
        setTimeout(() => {
          navigate(`/checkout/${regId}`, {
            state: {
              registrationId: regId,
              eventName: selectedEvent.name,
              baseFee: res.amount || selectedEvent.price,
              registrationType: selectedEvent.requires_team ? 'Team' : 'Individual',
              phone: phone,
              userName: fullName,
            }
          });
        }, 1000);
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setRegErrorMsg(err.message || "Registration failed. Please check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyInviteToClipboard = () => {
    if (magicInviteUrl) {
      navigator.clipboard.writeText(magicInviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <PageLayout title={view === 'register' ? 'EVENT REGISTRATION' : view === 'detail' ? 'EVENT SPECIFICATIONS' : 'EVENTS'} isWide={true}>
      <style>{`
        /* Global Page / Grid Styles */
        .events-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2.5rem;
          width: 100%;
          padding: 1.5rem 0;
          box-sizing: border-box;
          justify-items: stretch;
          align-items: stretch;
        }

        @media (max-width: 767px) {
          .events-grid {
            grid-template-columns: 1fr;
            gap: 1.25rem;
            padding: 0.25rem 0 1rem 0;
          }
          .cyber-card {
            padding: 1.15rem !important;
            background: rgba(10, 6, 22, 0.8) !important;
            border: 1px solid rgba(168, 85, 247, 0.35) !important;
            border-radius: 16px !important;
          }
          .cyber-card-banner {
            height: 160px !important;
            margin-bottom: 0.9rem !important;
            border-radius: 12px !important;
            border: 1px solid rgba(0, 243, 255, 0.3) !important;
          }
          .card-title {
            font-size: 1.25rem !important;
            margin-bottom: 0.4rem !important;
          }
          .card-desc {
            font-size: 0.8rem !important;
            line-height: 1.5 !important;
            margin-bottom: 1.1rem !important;
          }
          .card-actions {
            display: flex !important;
            gap: 0.75rem !important;
            width: 100% !important;
          }
          .btn-cyber-primary, .btn-cyber-secondary {
            padding: 0.75rem 0 !important;
            font-size: 0.78rem !important;
            font-weight: 900 !important;
            border-radius: 8px !important;
          }
          .detail-panel {
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .reg-container {
            padding: 1.1rem !important;
          }
          .detail-grid {
            grid-template-columns: 1fr !important;
            gap: 1.2rem !important;
          }
          .detail-image-box {
            height: 180px !important;
            border-radius: 12px !important;
          }
          .detail-info-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1rem;
            gap: 0.5rem;
          }
          .detail-title-heading {
            font-size: 1.25rem !important;
            margin-top: 0.2rem !important;
            word-break: break-word;
          }
          .detail-price-heading {
            font-size: 0.95rem !important;
            margin-top: 0.2rem !important;
          }
          .info-panel-grid {
            grid-template-columns: 1fr !important;
            gap: 0.6rem !important;
            padding: 0.85rem !important;
            background: rgba(255, 255, 255, 0.04) !important;
            border-radius: 12px !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
          }
          .info-panel-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.2rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          }
          .info-panel-item:last-child {
            border-bottom: none;
          }
          .info-item-label {
            font-size: 0.68rem !important;
            color: #00f3ff !important;
            margin-bottom: 0 !important;
          }
          .info-item-value {
            font-size: 0.82rem !important;
            text-align: right !important;
            color: #ffffff !important;
          }
          .detail-tabs-row {
            display: flex !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            padding-bottom: 6px !important;
            gap: 0.4rem !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .detail-tab-btn {
            font-size: 0.72rem !important;
            padding: 0.45rem 0.8rem !important;
            flex-shrink: 0 !important;
          }
        }

         .back-nav-btn {
           display: inline-flex;
           align-items: center;
           gap: 0.5rem;
           background: linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(3, 1, 20, 0.75) 100%);
           border: 1px dashed rgba(168, 85, 247, 0.5);
           color: #ffffff;
           padding: 0.45rem 1.1rem;
           font-size: 0.68rem;
           font-weight: 900;
           letter-spacing: 0.12em;
           text-transform: uppercase;
           border-radius: 4px 10px 4px 10px;
           cursor: pointer;
           margin-bottom: 1.4rem;
           position: relative;
           transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
           box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), inset 0 0 8px rgba(168, 85, 247, 0.1);
         }

         .back-nav-btn::before {
           content: '◀';
           font-size: 0.55rem;
           color: #00f3ff;
           text-shadow: 0 0 6px #00f3ff;
           transition: transform 0.3s ease;
         }

         .back-nav-btn:hover {
           background: linear-gradient(135deg, rgba(0, 243, 255, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%);
           border: 1px solid #00f3ff;
           box-shadow: 0 0 16px rgba(0, 243, 255, 0.4);
         }

        /* 3D Cyberpunk Card Plate */
        .cyber-card-wrapper {
          perspective: 1000px;
          height: 100%;
        }

        .cyber-card {
          background: rgba(12, 8, 24, 0.45);
          border: 1px solid rgba(168, 85, 247, 0.25);
          border-radius: 14px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          box-sizing: border-box;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(168, 85, 247, 0.05);
          transition: transform 0.15s ease-out, border-color 0.3s ease, box-shadow 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .cyber-card.hovered {
          border-color: #00f3ff;
          box-shadow: 0 0 35px rgba(0, 243, 255, 0.3), inset 0 0 20px rgba(0, 243, 255, 0.1);
        }

        .cyber-card-banner {
          position: relative;
          width: 100%;
          height: 145px;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 1.1rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: inset 0 0 25px rgba(0, 0, 0, 0.7);
        }

        .cyber-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .cyber-card.hovered .cyber-card-img {
          transform: scale(1.08);
        }

        .cyber-card-badge-overlay {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 10;
          pointer-events: none;
        }

        .cyber-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.2rem;
        }

        .card-category-tag {
          font-size: 0.68rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          color: #d8b4fe;
          text-transform: uppercase;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: 0.3rem 0.65rem;
          border-radius: 6px;
          border: 1px solid rgba(168, 85, 247, 0.4);
        }

        .card-price-tag {
          font-size: 0.75rem;
          font-weight: 900;
          color: #00f3ff;
          font-family: 'Orbitron', sans-serif;
          letter-spacing: 0.05em;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: 0.3rem 0.65rem;
          border-radius: 6px;
          border: 1px solid rgba(0, 243, 255, 0.4);
        }

        .card-price-tag.free {
          color: #4ade80;
          border-color: rgba(34, 197, 94, 0.5);
        }

        .card-title {
          font-size: 1.35rem;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin: 0 0 0.8rem 0;
          font-family: 'Orbitron', sans-serif;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
        }

        .card-desc {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.5;
          margin-bottom: 1.5rem;
          flex-grow: 1;
        }

        .card-actions {
          display: flex;
          gap: 0.8rem;
          margin-top: auto;
        }

        .btn-cyber-primary {
          flex: 1;
          background: linear-gradient(135deg, rgba(0, 243, 255, 0.2) 0%, rgba(168, 85, 247, 0.25) 100%);
          border: 1px solid #00f3ff;
          color: #ffffff;
          padding: 0.65rem 0;
          font-size: 0.75rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.25s ease;
          text-shadow: 0 0 5px rgba(0, 243, 255, 0.5);
          box-shadow: 0 4px 15px rgba(0, 243, 255, 0.15);
        }

        .btn-cyber-primary:hover {
          background: linear-gradient(135deg, rgba(0, 243, 255, 0.4) 0%, rgba(168, 85, 247, 0.45) 100%);
          box-shadow: 0 0 25px rgba(0, 243, 255, 0.5);
          transform: translateY(-2px);
        }

        .btn-cyber-secondary {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.8);
          padding: 0.65rem 0;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-cyber-secondary:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.3);
          color: #ffffff;
        }

        /* Detail View Styles */
        .detail-panel {
          background: rgba(10, 6, 22, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 243, 255, 0.3);
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 0 40px rgba(0, 243, 255, 0.15);
          width: 100%;
          box-sizing: border-box;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        @media (min-width: 768px) {
          .detail-grid {
            grid-template-columns: 320px 1fr;
          }
        }

        .detail-image-box {
          width: 100%;
          height: 240px;
          border-radius: 12px;
          overflow: hidden;
          border: 1.5px solid rgba(168, 85, 247, 0.4);
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
        }

        .detail-image-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .detail-info-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
          gap: 0.75rem;
        }

        .detail-title-heading {
          font-size: 1.7rem;
          margin-top: 0.4rem;
          font-weight: 900;
          line-height: 1.2;
        }

        .detail-price-heading {
          font-size: 1.15rem;
          flex-shrink: 0;
        }

        .info-panel-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin: 1.5rem 0;
          background: rgba(255, 255, 255, 0.03);
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .info-item-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          color: #a855f7;
          font-weight: 800;
          display: block;
          margin-bottom: 0.2rem;
        }

        .info-item-value {
          font-size: 0.85rem;
          font-weight: 700;
          color: #ffffff;
        }

        .detail-tabs-row {
          display: flex;
          gap: 0.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 1rem;
        }

        .detail-tab-btn {
          padding: 0.5rem 1rem;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.78rem;
          font-weight: 800;
          text-transform: uppercase;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
        }

        .detail-tab-btn.active {
          color: #00f3ff;
          border-bottom-color: #00f3ff;
        }

        /* Mobile Detail View Explicit CSS Fallback Classes */
        .mobile-detail-wrapper {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
          box-sizing: border-box;
          padding: 85px 14px 40px 14px;
          margin: 0 auto;
        }

        .mobile-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 243, 255, 0.1);
          border: 1px solid rgba(0, 243, 255, 0.4);
          color: #00f3ff;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          margin-bottom: 16px;
          transition: all 0.2s ease;
        }

        .mobile-hero-image-box {
          position: relative;
          width: 100%;
          height: 200px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(0, 243, 255, 0.3);
          box-shadow: 0 0 20px rgba(0, 243, 255, 0.15);
          background: #000000;
          margin-bottom: 16px;
        }

        .mobile-hero-image-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .mobile-badge-bar {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 10;
          pointer-events: none;
        }

        .mobile-category-badge {
          background: rgba(0, 0, 0, 0.85);
          border: 1px solid rgba(168, 85, 247, 0.5);
          color: #d8b4fe;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .mobile-price-badge {
          background: rgba(0, 0, 0, 0.85);
          border: 1px solid rgba(0, 243, 255, 0.5);
          color: #00f3ff;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .mobile-price-badge.free {
          border-color: rgba(34, 197, 94, 0.5);
          color: #4ade80;
        }

        .mobile-event-title {
          font-size: 1.4rem;
          font-weight: 900;
          color: #ffffff;
          margin: 0 0 16px 0;
          font-family: 'Orbitron', monospace, sans-serif;
          line-height: 1.25;
          text-align: left;
        }

        .mobile-stats-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          margin-bottom: 20px;
        }

        .mobile-stat-tile {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 12px 14px;
          width: 100%;
          box-sizing: border-box;
        }

        .mobile-stat-label {
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .mobile-stat-label.date { color: #00f3ff; }
        .mobile-stat-label.venue { color: #c084fc; }
        .mobile-stat-label.time { color: #f472b6; }

        .mobile-stat-value {
          font-size: 0.82rem;
          font-weight: 700;
          color: #ffffff;
          text-align: right;
          word-break: break-word;
          max-width: 60%;
        }

        .mobile-tabs-container {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          white-space: nowrap;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 6px;
          margin-bottom: 16px;
          width: 100%;
          box-sizing: border-box;
          -webkit-overflow-scrolling: touch;
        }

        .mobile-tab-btn {
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          background: transparent;
          border: 1px solid transparent;
          color: #a1a1aa;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .mobile-tab-btn.active {
          background: rgba(0, 243, 255, 0.2);
          border-color: rgba(0, 243, 255, 0.5);
          color: #00f3ff;
          box-shadow: 0 0 12px rgba(0, 243, 255, 0.25);
        }

        .mobile-tab-content-box {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 16px;
          color: #d4d4d8;
          font-size: 0.82rem;
          line-height: 1.6;
          text-align: left;
          margin-bottom: 20px;
          width: 100%;
          box-sizing: border-box;
        }

        .mobile-cta-btn {
          width: 100%;
          background: linear-gradient(135deg, #00f3ff 0%, #a855f7 100%);
          border: none;
          color: #000000;
          font-weight: 900;
          font-size: 0.85rem;
          letter-spacing: 0.1em;
          padding: 14px 0;
          border-radius: 10px;
          cursor: pointer;
          text-transform: uppercase;
          box-shadow: 0 0 20px rgba(0, 243, 255, 0.35);
          transition: all 0.2s ease;
        }

        /* Registration View Styles */
        .reg-container {
          background: rgba(10, 6, 22, 0.75);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 243, 255, 0.3);
          border-radius: 16px;
          padding: 2rem;
          width: 100%;
          box-sizing: border-box;
          box-shadow: 0 0 40px rgba(0, 243, 255, 0.15);
        }

        .reg-header {
          margin-bottom: 1.8rem;
          text-align: left;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 1rem;
        }

        .reg-title {
          font-size: 1.5rem;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 0.1em;
          font-family: 'Orbitron', sans-serif;
          margin: 0 0 0.4rem 0;
          text-shadow: 0 0 10px rgba(0, 243, 255, 0.4);
        }

        .reg-subtitle {
          font-size: 0.75rem;
          color: #00f3ff;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 700;
        }

        .reg-layout-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        @media (min-width: 768px) {
          .reg-layout-grid {
            grid-template-columns: 0.9fr 1.1fr;
          }
        }

        .reg-info-panel {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: left;
        }

        .reg-info-title {
          font-size: 1rem;
          font-weight: 800;
          color: #a855f7;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 0 0 1rem 0;
        }

        .reg-bullet-item {
          display: flex;
          gap: 0.8rem;
          margin-bottom: 1rem;
        }

        .reg-bullet-icon {
          color: #00f3ff;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .reg-bullet-label {
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          display: block;
          font-weight: 800;
        }

        .reg-bullet-value {
          font-size: 0.82rem;
          color: #ffffff;
          font-weight: 700;
        }

        .reg-form {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }

        .reg-input-group {
          position: relative;
        }

        .reg-input {
          width: 100%;
          background: rgba(8, 4, 20, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-left: 4px solid #a855f7;
          border-radius: 6px;
          padding: 0.75rem 1rem;
          color: #ffffff;
          font-size: 0.88rem;
          outline: none;
          transition: all 0.25s ease;
          box-sizing: border-box;
        }

        .reg-input:focus {
          border-color: #00f3ff;
          border-left-color: #00f3ff;
          box-shadow: 0 0 12px rgba(0, 243, 255, 0.3);
        }

        .reg-select-wrapper {
          position: relative;
        }

        .reg-select {
          appearance: none;
          cursor: pointer;
        }

        .reg-select-chevron {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #00f3ff;
          pointer-events: none;
        }

        .reg-submit-btn {
          width: 100%;
          padding: 0.95rem 0;
          background: linear-gradient(135deg, rgba(0, 243, 255, 0.25) 0%, rgba(168, 85, 247, 0.35) 100%);
          border: 1px solid #00f3ff;
          color: #ffffff;
          font-family: 'Orbitron', sans-serif;
          font-size: 0.85rem;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 0.5rem;
          box-shadow: 0 0 20px rgba(0, 243, 255, 0.3);
        }

        .reg-submit-btn:hover {
          background: linear-gradient(135deg, rgba(0, 243, 255, 0.4) 0%, rgba(168, 85, 247, 0.5) 100%);
          box-shadow: 0 0 30px rgba(0, 243, 255, 0.5);
          transform: translateY(-2px);
        }
      `}</style>

      {/* State Router View: Grid */}
      {view === 'grid' && (
        <>
          {/* Category Filter Pills Bar */}
          <div className="flex overflow-x-auto p-1.5 rounded-xl bg-black/60 border border-white/10 gap-2 mb-2 scrollbar-hide w-full box-border">
            {['ALL', 'SEMINAR', 'CODING', 'QUIZ', 'AUCTION', 'PHOTOGRAPHY', 'CHESS'].map(cat => (
              <button
                key={cat}
                className={`px-3.5 py-1.5 text-xs font-extrabold uppercase rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(0,243,255,0.25)]'
                    : 'text-gray-400 hover:text-white bg-white/5 border border-transparent'
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="w-full py-4 text-center text-xs font-mono text-cyan-400 animate-pulse bg-cyan-950/20 border border-cyan-500/20 rounded-xl mb-4">
              ⚡ Loading catalog via React Query cache (5m staleTime)...
            </div>
          )}

          {isError && (
            <div className="w-full py-3 text-center text-xs font-mono text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl mb-4">
              ⚠️ Unable to reach backend catalog server. Displaying offline events cache.
            </div>
          )}

          <div className="events-grid">
            {(selectedCategory === 'ALL'
              ? eventsList
              : eventsList.filter(e => e.category.toUpperCase() === selectedCategory)
            ).map(event => (
              <div key={event.id} className="cyber-card-wrapper">
                <div
                  className={`cyber-card ${hoveredCardId === event.id ? 'hovered' : ''}`}
                  onMouseMove={e => handleMouseMove(e, event.id)}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    transform:
                      hoveredCardId === event.id
                        ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(10px)`
                        : 'rotateX(0deg) rotateY(0deg) translateZ(0px)'
                  }}
                >
                  <div>
                    <div className="cyber-card-banner">
                      <img src={event.image} alt={event.placeholderAlt} className="cyber-card-img" />
                      <div className="cyber-card-badge-overlay">
                        <span className="card-category-tag">{event.category}</span>
                        <span className={`card-price-tag ${event.price === 'FREE' ? 'free' : ''}`}>{event.price}</span>
                      </div>
                    </div>
                    <h3 className="card-title">{event.name}</h3>
                    <p className="card-desc">{event.notes}</p>
                  </div>

                  <div className="card-actions">
                    <button
                      className="btn-cyber-primary"
                      onClick={() => handleRegister(event, 'grid')}
                      disabled={isNavigating}
                    >
                      REGISTER NOW
                    </button>
                    <button
                      className="btn-cyber-secondary"
                      onClick={() => handleExplore(event)}
                      disabled={isNavigating}
                    >
                      DETAILS
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Global Festival Terms & Conditions Section */}
          <div className="mt-8 p-6 rounded-2xl bg-black/45 border border-purple-500/30 text-left backdrop-blur-md shadow-2xl">
            <h3 className="text-sm font-black text-cyan-300 uppercase tracking-widest font-mono mb-4 flex items-center gap-2">
              <span>📜</span> ENVISION '26 FESTIVAL TERMS & CONDITIONS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300 leading-relaxed font-sans">
              <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <p><strong className="text-purple-400">1. Verification:</strong> Valid college student photo ID is strictly required at venue entry points.</p>
                <p><strong className="text-purple-400">2. Decorum:</strong> Any form of cheating, malicious code injection, or misconduct results in instant expulsion.</p>
              </div>
              <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <p><strong className="text-purple-400">3. Non-Refundable:</strong> All paid event registration slots are non-refundable and non-transferable.</p>
                <p><strong className="text-purple-400">4. Certificates:</strong> Certificates of participation will be issued only to participants who complete their track.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* State Router View: Detail */}
      {view === 'detail' && selectedEvent && (
        <div className="mobile-detail-wrapper">
          <button className="mobile-back-btn" onClick={() => setSearchParams({})}>
            ← BACK TO EVENTS
          </button>

          <div className="flex flex-col w-full min-w-0">
            {/* 1. Hero Cover Image Card with Glass Badges */}
            <div className="mobile-hero-image-box">
              <img 
                src={selectedEvent.image} 
                alt={selectedEvent.placeholderAlt}
              />
              <div className="mobile-badge-bar">
                <span className="mobile-category-badge">
                  {selectedEvent.category}
                </span>
                <span className={`mobile-price-badge ${selectedEvent.price === 'FREE' ? 'free' : ''}`}>
                  {selectedEvent.price}
                </span>
              </div>
            </div>

            {/* 2. Event Title */}
            <h2 className="mobile-event-title">
              {selectedEvent.name}
            </h2>

            {/* 3. Organized Stats Tiles (Date, Venue, Time) */}
            <div className="mobile-stats-container">
              <div className="mobile-stat-tile">
                <span className="mobile-stat-label date">
                  <span>📅</span> DATE :
                </span>
                <span className="mobile-stat-value">{selectedEvent.date}</span>
              </div>
              <div className="mobile-stat-tile">
                <span className="mobile-stat-label venue">
                  <span>📍</span> VENUE :
                </span>
                <span className="mobile-stat-value">{selectedEvent.venue}</span>
              </div>
              <div className="mobile-stat-tile">
                <span className="mobile-stat-label time">
                  <span>⏰</span> TIME :
                </span>
                <span className="mobile-stat-value">{selectedEvent.Time}</span>
              </div>
            </div>

            {/* 4. Organized Segmented Pill Tabs Bar */}
            <div className="mobile-tabs-container scrollbar-hide">
              <button
                className={`mobile-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                DETAILS
              </button>
              <button
                className={`mobile-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
                onClick={() => setActiveTab('rules')}
              >
                RULES
              </button>
              <button
                className={`mobile-tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
                onClick={() => setActiveTab('contact')}
              >
                CONTACT
              </button>
              <button
                className={`mobile-tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
                onClick={() => setActiveTab('terms')}
              >
                TERMS & CONDITIONS
              </button>
            </div>

            {/* 5. Tab Content Box */}
            <div className="mobile-tab-content-box">
              {activeTab === 'details' && (
                <p>
                  This section covers the core timeline structure, setup protocols, and target deliverables for the {selectedEvent.name} technical track. Learn key strategies, align workspace dependencies, and prepare to interact with team coaches.
                </p>
              )}
              {activeTab === 'rules' && (
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>All participants must adhere to general techfest decorum.</li>
                  <li>Submissions must be finalized before the strict schedule timeline bounds.</li>
                  <li>Code snippets or presentation files must be original work.</li>
                  <li>Team formations must fall within the range parameters specified ({selectedEvent.requires_team ? `Max ${selectedEvent.max_team_size} members` : 'Individual'}).</li>
                </ul>
              )}
              {activeTab === 'contact' && (
                <p>
                  For tracking queries, resource support, or generic coordination assistance, reach out to the event supervisor at: <strong className="text-cyan-300">{selectedEvent.id}@envision.org</strong>.
                </p>
              )}
              {activeTab === 'terms' && (
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>All event registration fees are strictly non-refundable and non-transferable.</li>
                  <li>Participants must produce valid College Student Photo ID cards at venue registration desks.</li>
                  <li>Plagiarism, malicious exploits, or misconduct result in instant forfeiture and track expulsion.</li>
                  <li>Organizers reserve the right to revise schedule timelines or disqualification parameters if required.</li>
                </ul>
              )}
            </div>

            {/* 6. Prominent Call-To-Action Button */}
            <button
              className="mobile-cta-btn"
              onClick={() => handleRegister(selectedEvent, 'detail')}
            >
              REGISTER FOR THIS TRACK →
            </button>
          </div>
        </div>
      )}

      {/* State Router View: Register */}
      {view === 'register' && selectedEvent && (
        <div className="reg-container">
          <button className="back-nav-btn" onClick={() => setSearchParams({})}>
            BACK TO EVENTS
          </button>

          <div className="reg-header">
            <h2 className="reg-title">{selectedEvent.name} REGISTRATION</h2>
            <div className="reg-subtitle">
              {selectedEvent.requires_team ? `Team Event (Leader + up to ${selectedEvent.max_team_size - 1} Teammates)` : 'Individual Track Registration'}
            </div>
          </div>

          {/* Feedback Banners */}
          {regErrorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-300 text-xs font-mono font-bold shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center gap-2 text-left">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping flex-shrink-0" />
              <span>{regErrorMsg}</span>
            </div>
          )}

          {regSuccessMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs font-mono font-bold shadow-[0_0_20px_rgba(0,243,255,0.4)] flex flex-col items-center justify-center gap-2 text-center">
              <span className="text-sm">{regSuccessMsg}</span>

              {magicInviteUrl && (
                <div className="mt-2 w-full p-3 rounded-lg bg-black/60 border border-cyan-400/40 flex flex-col items-center gap-2">
                  <span className="text-gray-300 text-[11px] font-sans">✉️ TEAM MAGIC INVITATION LINK GENERATED:</span>
                  <input
                    type="text"
                    readOnly
                    value={magicInviteUrl}
                    className="w-full bg-black/80 border border-cyan-500/40 rounded px-2 py-1 text-[11px] text-cyan-400 font-mono text-center outline-none select-all"
                  />
                  <button
                    onClick={copyInviteToClipboard}
                    className="px-3 py-1 bg-cyan-500 text-black font-extrabold text-[10px] rounded uppercase tracking-wider hover:bg-cyan-400 cursor-pointer"
                  >
                    {copiedLink ? '✓ LINK COPIED!' : '📋 COPY INVITE LINK'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="reg-layout-grid">
            {/* Left Column: Event details summary */}
            <div className="reg-info-panel">
              <h3 className="reg-info-title">Track Rules & Details</h3>

              <div className="reg-info-details">
                <div className="reg-bullet-item">
                  <div className="reg-bullet-icon">🏷️</div>
                  <div className="reg-bullet-text">
                    <span className="reg-bullet-label">Category & Fee</span>
                    <span className="reg-bullet-value">{selectedEvent.category} • {selectedEvent.price}</span>
                  </div>
                </div>

                <div className="reg-bullet-item">
                  <div className="reg-bullet-icon">👥</div>
                  <div className="reg-bullet-text">
                    <span className="reg-bullet-label">Format</span>
                    <span className="reg-bullet-value">
                      {selectedEvent.requires_team ? `Team (Max ${selectedEvent.max_team_size} Members)` : 'Individual Participant'}
                    </span>
                  </div>
                </div>

                <div className="reg-bullet-item">
                  <div className="reg-bullet-icon">🍱</div>
                  <div className="reg-bullet-text">
                    <span className="reg-bullet-label">Food Provided</span>
                    <span className="reg-bullet-value">
                      {selectedEvent.has_food ? 'Yes (Veg / Non-Veg Options)' : 'No Food Provided'}
                    </span>
                  </div>
                </div>

                <div className="reg-bullet-item">
                  <div className="reg-bullet-icon">📍</div>
                  <div className="reg-bullet-text">
                    <span className="reg-bullet-label">Venue</span>
                    <span className="reg-bullet-value">{selectedEvent.venue}</span>
                  </div>
                </div>

                <div className="reg-bullet-item">
                  <div className="reg-bullet-icon">📅</div>
                  <div className="reg-bullet-text">
                    <span className="reg-bullet-label">Schedule</span>
                    <span className="reg-bullet-value">{selectedEvent.date} at {selectedEvent.Time}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Form fields */}
            <form className="reg-form" onSubmit={handleFormSubmit}>
              <div className="reg-input-group">
                <input
                  type="text"
                  className="reg-input"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="reg-input-group">
                <input
                  type="text"
                  className="reg-input"
                  placeholder="College / University Name"
                  value={college}
                  onChange={e => setCollege(e.target.value)}
                  required
                />
              </div>

              <div className="reg-input-group">
                <input
                  type="tel"
                  className="reg-input"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="reg-input-group">
                <input
                  type="email"
                  className="reg-input"
                  placeholder="Email Address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="reg-input-group reg-select-wrapper">
                <select
                  className="reg-input reg-select"
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <svg className="reg-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {/* Conditional Food Preference Dropdown (Only rendered if selectedEvent.has_food is true) */}
              {selectedEvent.has_food && (
                <div className="reg-input-group reg-select-wrapper">
                  <select
                    className="reg-input reg-select"
                    value={foodPreference}
                    onChange={e => setFoodPreference(e.target.value)}
                    required
                  >
                    <option value="Veg">Veg (Vegetarian Meal)</option>
                    <option value="Non-Veg">Non-Veg (Non-Vegetarian Meal)</option>
                  </select>
                  <svg className="reg-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              )}

              {/* Conditional Team Registration Fields (Only rendered if selectedEvent.requires_team is true) */}
              {selectedEvent.requires_team && (
                <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex flex-col gap-3 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                      👥 TEAM CONFIGURATION ({selectedEvent.name})
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      MAX SIZE: {selectedEvent.max_team_size} MEMBERS
                    </span>
                  </div>

                  {/* Team Name Input */}
                  <div className="reg-input-group">
                    <label className="text-[10px] font-mono text-cyan-400 font-bold uppercase mb-1 block">Team Name *</label>
                    <input
                      type="text"
                      className="reg-input"
                      placeholder="e.g. CyberKnights"
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Dynamic Teammate Member Cards (Max Team Size - 1 fields) */}
                  {Array.from({ length: selectedEvent.max_team_size - 1 }).map((_, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-black/50 border border-cyan-500/30 flex flex-col gap-2">
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1">
                        <span className="text-[10.5px] font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                          <span>👤</span> TEAMMATE {idx + 1} DETAILS
                        </span>
                        <span className="text-[9px] font-mono text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded-full border border-purple-500/40">
                          AUTO-GENERATES FEST ID
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9.5px] font-mono text-gray-300 mb-0.5 block">Full Name *</label>
                          <input
                            type="text"
                            className="reg-input text-xs"
                            placeholder="e.g. Alex Hunter"
                            value={teammates[idx]?.name || ''}
                            onChange={e => handleTeammateDetailChange(idx, 'name', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[9.5px] font-mono text-gray-300 mb-0.5 block">Email Address *</label>
                          <input
                            type="email"
                            className="reg-input text-xs"
                            placeholder="alex@gmail.com"
                            value={teammates[idx]?.email || ''}
                            onChange={e => handleTeammateDetailChange(idx, 'email', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[9.5px] font-mono text-gray-300 mb-0.5 block">Mobile No</label>
                          <input
                            type="tel"
                            className="reg-input text-xs"
                            placeholder="10-digit Phone No"
                            value={teammates[idx]?.phone || ''}
                            onChange={e => handleTeammateDetailChange(idx, 'phone', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[9.5px] font-mono text-gray-300 mb-0.5 block">College Name</label>
                          <input
                            type="text"
                            className="reg-input text-xs"
                            placeholder="e.g. RKMRC Belur Math"
                            value={teammates[idx]?.college || ''}
                            onChange={e => handleTeammateDetailChange(idx, 'college', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Terms & Conditions Agreement Checkbox */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-black/50 border border-purple-500/25 text-left">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  required
                  className="mt-0.5 accent-cyan-400 cursor-pointer w-4 h-4"
                />
                <label htmlFor="agreeTerms" className="text-xs text-gray-300 cursor-pointer leading-tight select-none">
                  I agree to the <span className="text-cyan-300 font-bold underline">Envision '26 Terms & Conditions</span>, event decorum rules, and non-refundable slot policy.
                </label>
              </div>

              <button
                type="submit"
                className="reg-submit-btn"
                disabled={isSubmitting || isNavigating || !agreeTerms}
              >
                {isSubmitting ? 'PROCESSING REGISTRATION...' : `SUBMIT REGISTRATION (${selectedEvent.price})`}
              </button>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
