import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useGoogleLogin } from '@react-oauth/google';
import PageLayout from './PageLayout';
import { api, BackendEvent, setAuthSession } from '../utils/api';
import { enqueueOfflineItem } from '../utils/offlineQueue';

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
  prize?: string;
}

const EVENT_RULES_LINKS: Record<string, string> = {
  syntaxx: 'https://ibb.co/Z69WbqC2',
  mindspark: 'https://ibb.co/v9M8dpD',
  bidquest: 'https://ibb.co/spH899Sy',
  'carlsen-chess': 'https://ibb.co/G35tjNnF',
  chess: 'https://ibb.co/G35tjNnF',
  lensverse: 'https://ibb.co/PzQxbTX5'
};

const EVENT_DESCRIPTIONS: Record<string, string> = {
  bidquest: 'This is a cricket auction event where you step into the shoes of an IPL franchise owner. Manage your virtual purse, outbid your rivals, and use your cricket IQ to strategically assemble a championship-winning squad.',
  syntaxx: 'This is a coding competition where you put your programming and problem-solving skills to the test. Tackle challenging algorithmic problems, write clean and efficient code, and race against the clock to claim victory.',
  mindspark: 'This is a quiz event featuring a wide variety of questions across multiple domains. Put your general knowledge, quick thinking, and intellect to the test, race against the clock, and outsmart your opponents to claim ultimate victory.',
  'carlsen-chess': 'This is a chess competition where you put your tactical brilliance and strategic thinking to the test. Outthink your opponents move by move, master the board, and checkmate your way to the championship.',
  chess: 'This is a chess competition where you put your tactical brilliance and strategic thinking to the test. Outthink your opponents move by move, master the board, and checkmate your way to the championship.',
  lensverse: 'This is an online photography competition where you capture stunning moments, express your unique vision, and showcase your creative eye through the lens to win recognition.',
  techtalk: "Join an engaging Tech Talk featuring experienced speakers from the technology industry and academia. The session will cover emerging technologies, career opportunities, industry trends, and practical insights to inspire and guide students. Whether you're a beginner or a tech enthusiast, this seminar offers valuable knowledge and real-world perspectives for everyone."
};

interface EventContact {
  head: string;
  phone: string;
  rawPhone: string;
  email?: string;
}

const EVENT_CONTACTS: Record<string, EventContact> = {
  syntaxx: { head: 'Ritam Bera', phone: '+91 77182 19011', rawPhone: '+917718219011' },
  mindspark: { head: 'Subhajit Mahapatra', phone: '+91 83899 44951', rawPhone: '+918389944951' },
  bidquest: { head: 'Anik Bhunia', phone: '+91 78721 69208', rawPhone: '+917872169208' },
  'carlsen-chess': { head: 'Soumyarup Sarkar', phone: '+91 82933 55649', rawPhone: '+918293355649' },
  chess: { head: 'Soumyarup Sarkar', phone: '+91 82933 55649', rawPhone: '+918293355649' },
  lensverse: { head: 'Souvik Roy', phone: '+91 89429 09735', rawPhone: '+918942909735', email: 'roysouvik0987@gmail.com' },
  techtalk: { head: 'Jyotipraba Pal', phone: '+91 97347 72175', rawPhone: '+919734772175' }
};

function getShortPrizeLabel(event: any): string {
  const dbPrize = event?.prize || '';
  if (dbPrize) {
    if (dbPrize.includes('1500') || dbPrize.includes('₹1500')) return '₹1500 PRIZE';
    if (dbPrize.includes('499') || dbPrize.includes('₹499')) return '₹499 PRIZE';
    if (dbPrize.includes('399') || dbPrize.includes('₹399')) return '₹399 PRIZE';
    if (dbPrize.toLowerCase().includes('certificate')) return 'FREE E-CERT';
    if (dbPrize.toLowerCase().includes('cash')) return 'CASH PRIZES';
  }

  const id = (event?.id || '').toLowerCase();
  if (id === 'mindspark') return '₹499 PRIZE';
  if (id === 'bidquest') return '₹1500 PRIZE';
  if (id === 'carlsen-chess' || id === 'chess') return '₹499 PRIZE';
  if (id === 'techtalk') return 'FREE E-CERT';
  if (id === 'syntaxx') return '₹399 PRIZE';
  if (id === 'lensverse' || id === 'photography') return '₹499 PRIZE';
  return dbPrize ? dbPrize.toUpperCase() : 'CASH PRIZES';
}

export const REGISTRATION_CLOSED = true;

const EVENTS_DATA: EventData[] = [
  {
    id: 'techtalk',
    name: 'techtalk',
    category: 'SEMINAR',
    price: 'FREE',
    requires_team: false,
    max_team_size: 1,
    has_food: false,
    notes: '100% FREE & Open to All! Reporting Time: 9:30 AM.',
    image: '/images/events/techtalk.jpg',
    placeholderAlt: 'Tech Talk Seminar',
    benefits: 'Free Keynote Entry Pass to RKMRC Tech Talk, Technical Seminars & Certificates.',
    date: '6th August',
    venue: 'Mumukshananda Auditorium, RKMRC',
    Time: '2:00 PM (Reporting: 9:30 AM)',
    prize: 'Free E-Certificates of Participation for Attendees'
  },
  {
    id: 'syntaxx',
    name: 'syntaxx',
    category: 'CODING',
    price: '₹39',
    requires_team: false,
    max_team_size: 1,
    has_food: true,
    notes: 'Individual Coding Event. Reporting Time: 9:30 AM.',
    image: '/images/events/syntaxx.jpg',
    placeholderAlt: 'SyntaxX Coding Competition',
    benefits: 'Participation certificate, Exciting Swags for Winner',
    date: '6th August',
    venue: 'Computer Science Lab',
    Time: '12:00 PM (Reporting: 9:30 AM)',
    prize: 'Winning Cash Prize Worth ₹399, Tech Medals & Winner Certificates'
  },
  {
    id: 'mindspark',
    name: 'mindspark',
    category: 'QUIZ',
    price: '₹49',
    requires_team: true,
    max_team_size: 2,
    has_food: true,
    notes: 'Team (max. 2 members). Reporting Time: 9:30 AM.',
    image: '/images/events/mindspark.jpg',
    placeholderAlt: 'MindSpark Quiz Competition',
    benefits: 'Participation certificate, Winning Cash prize worth ₹499',
    date: '6th August',
    venue: 'Mumukshananda Auditorium, RKMRC',
    Time: '12:00 PM (Reporting: 9:30 AM)',
    prize: 'Winning Cash Prize Worth ₹499 & Champion Medals'
  },
  {
    id: 'bidquest',
    name: 'bidquest',
    category: 'AUCTION',
    price: '₹149',
    requires_team: true,
    max_team_size: 3,
    has_food: true,
    notes: 'Team Event (max. 3 members). Reporting Time: 9:30 AM.',
    image: '/images/events/bidquest.jpg',
    placeholderAlt: 'BidQuest Auction Event',
    benefits: 'Participation certificate, Winning Cash prize worth ₹1500',
    date: '6th August',
    venue: 'Mumukshananda Auditorium, RKMRC',
    Time: '11:00 AM (Reporting: 9:30 AM)',
    prize: 'Winning Cash Prize Worth ₹1500 & Franchise Winner Medals'
  },
  {
    id: 'lensverse',
    name: 'lensverse',
    category: 'PHOTOGRAPHY',
    price: '₹49',
    requires_team: false,
    max_team_size: 1,
    has_food: true,
    notes: 'Top 30 shortlisted participants earn free entry, campus pass & FREE food for live photo competition! Submission Deadline: 4th August before 12:00 AM Midnight. Reporting Time: 9:30 AM.',
    image: '/images/events/lensverse.jpg',
    placeholderAlt: 'LensVerse Photography Competition',
    benefits: 'Top 30 shortlisted photographers get invited to RKMRC campus with FREE food & festival pass to compete in live campus photo competition for winner cash prizes! Photo submission deadline: 4th August before 12:00 AM Midnight.',
    date: '6th August',
    venue: 'RKMRC Campus (For Top 30 Participants)',
    Time: '11:00 AM (Reporting: 9:30 AM)',
    prize: 'Winning Cash Prize Worth ₹499, Winner Medals & Certificates'
  },
  {
    id: 'carlsen-chess',
    name: 'carlsen-chess',
    category: 'CHESS',
    price: '₹49',
    requires_team: false,
    max_team_size: 1,
    has_food: true,
    notes: 'Individual Event. Reporting Time: 9:30 AM.',
    image: '/images/events/chess.jpg',
    placeholderAlt: 'Carlsen Classic Competition',
    benefits: 'Participation certificate, Winning Cash prize worth ₹499',
    date: '6th August',
    venue: 'Mumukshananda Auditorium, RKMRC',
    Time: '11:00 AM (Reporting: 9:30 AM)',
    prize: 'Winning Cash Prize Worth ₹499 & Grand Master Medals'
  }
];

interface TeammateInput {
  name: string;
  email: string;
  phone: string;
  college: string;
  food_preference: string;
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
            Time: be.time || '10:00 AM',
            prize: be.prize || undefined
          }));
        }
      } catch (err) {
        console.warn("Backend catalog fallback:", err);
      }
      return EVENTS_DATA;
    },
    staleTime: 0,
  });

  // React Query single event detail fetch
  const { data: singleEventDetail } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      return api.get<BackendEvent>(`/events/${eventId.trim()}`).catch(() => null);
    },
    enabled: !!eventId,
    staleTime: 0,
  });

  let cleanEventId = (eventId || '').trim().toLowerCase();
  if (cleanEventId.includes('chess') || cleanEventId.includes('carlsen')) {
    cleanEventId = 'carlsen-chess';
  }
  const matchedEvent = eventsList.find(e => e.id.toLowerCase() === cleanEventId || e.name.toLowerCase() === cleanEventId) || null;

  const selectedEvent = (singleEventDetail && singleEventDetail.id?.toLowerCase() === cleanEventId)
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
      Time: singleEventDetail.time || '10:00 AM',
      prize: singleEventDetail.prize || undefined
    }
    : matchedEvent;
  const [activeTab, setActiveTab] = useState<'details' | 'rules' | 'contact' | 'terms'>('details');
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);

  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Form State for Registration
  const [fullName, setFullName] = useState<string>(() => localStorage.getItem('user_name') || '');
  const [college, setCollege] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>(() => localStorage.getItem('user_email') || '');
  const [gender, setGender] = useState<string>('Male');
  const [foodPreference, setFoodPreference] = useState<string>('Veg');
  const [teamName, setTeamName] = useState<string>('');
  const [teammates, setTeammates] = useState<TeammateInput[]>([
    { name: '', email: '', phone: '', college: '', food_preference: 'Veg' },
    { name: '', email: '', phone: '', college: '', food_preference: 'Veg' },
    { name: '', email: '', phone: '', college: '', food_preference: 'Veg' },
    { name: '', email: '', phone: '', college: '', food_preference: 'Veg' }
  ]);

  const [teammatesCount, setTeammatesCount] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [regErrorMsg, setRegErrorMsg] = useState<string | null>(null);
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);
  const [magicInviteUrl, setMagicInviteUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState<boolean>(false);

  const [utrInput, setUtrInput] = useState<string>('');
  const [copiedVpa, setCopiedVpa] = useState<boolean>(false);
  const [registeredPass, setRegisteredPass] = useState<any | null>(null);

  const isUserSignedIn = !!(localStorage.getItem('access_token') || localStorage.getItem('user_email'));

  useEffect(() => {
    const savedEmail = localStorage.getItem('user_email');
    const savedName = localStorage.getItem('user_name');
    if (savedEmail && !email) {
      setEmail(savedEmail);
    }
    if (savedName && !fullName) {
      setFullName(savedName);
    }
  }, [email, fullName]);

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (tokenResponse.access_token) {
        setIsLoadingGoogle(true);
        setRegErrorMsg(null);
        try {
          const data: any = await api.post('/auth/google', { token: tokenResponse.access_token });
          setAuthSession(data.access_token, data.user);

          // Pre-fill email and name dynamically without data loss!
          setEmail(data.user.email);
          if (data.user.name && !fullName) {
            setFullName(data.user.name);
          }
          setRegSuccessMsg(`🎉 Signed in as ${data.user.email}! Continue your registration below.`);
        } catch (err: any) {
          console.error("Google login error during registration:", err);
          setRegErrorMsg(err.message || "Failed to sign in with Google.");
        } finally {
          setIsLoadingGoogle(false);
        }
      }
    },
    onError: () => {
      setRegErrorMsg("Google Sign-In was cancelled or failed.");
    }
  });

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
    setActiveTab('details');
    setSearchParams({ view: 'detail', id: event.id });
  };

  const handleRegister = (event: EventData, from: 'grid' | 'detail') => {
    if (REGISTRATION_CLOSED) {
      alert("🚫 REGISTRATION FOR ENVISION '26 IS OFFICIALLY CLOSED!\n\nAll event slots are 100% filled. Thank you for your overwhelming support!");
      return;
    }
    setRegErrorMsg(null);
    setRegSuccessMsg(null);
    setMagicInviteUrl(null);
    setRegisteredPass(null);
    setUtrInput('');
    setTeammatesCount(1);
    setSearchParams({ view: 'register', id: event.id, from });
  };

  const handleTeammateDetailChange = (index: number, field: keyof TeammateInput, value: string) => {
    const updated = [...teammates];
    if (!updated[index]) {
      updated[index] = { name: '', email: '', phone: '', college: '', food_preference: 'Veg' };
    }
    updated[index] = { ...updated[index], [field]: value };
    setTeammates(updated);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    if (REGISTRATION_CLOSED) {
      setIsSubmitting(false);
      setRegErrorMsg("🚫 REGISTRATION FOR ENVISION '26 IS OFFICIALLY CLOSED. Thank you for your overwhelming response!");
      return;
    }

    setIsSubmitting(true);
    setRegErrorMsg(null);
    setRegSuccessMsg(null);
    setMagicInviteUrl(null);

    try {
      // 1. Mandatory Sign-In Check
      const hasUserSession = !!(localStorage.getItem('access_token') || localStorage.getItem('user_email'));
      if (!hasUserSession) {
        setRegErrorMsg("🔐 Please click 'ONE-CLICK GOOGLE SIGN IN' above to lock in your email and complete registration.");
        setIsSubmitting(false);
        loginWithGoogle();
        return;
      }

      const isFreeEvent = selectedEvent.price_amount === 0 || selectedEvent.price === '₹0' || selectedEvent.price === 'FREE';
      const cleanUtr = utrInput.trim();

      if (!isFreeEvent) {
        if (!cleanUtr || cleanUtr.length !== 12 || !/^\d{12}$/.test(cleanUtr)) {
          setRegErrorMsg("💳 Please enter the valid 12-digit numeric UPI UTR / Ref number from your payment app receipt (e.g. 420185938210).");
          setIsSubmitting(false);
          return;
        }
      }

      let res: any;

      if (selectedEvent.requires_team) {
        // Team Event Registration -> /register/team
        if (!teamName.trim()) {
          setRegErrorMsg("Please enter a valid Team Name.");
          setIsSubmitting(false);
          return;
        }

        const validTeammates: any[] = [];

        for (let i = 0; i < teammatesCount; i++) {
          const tm = teammates[i] || { name: '', email: '', phone: '', college: '', food_preference: 'Veg' };
          const hasName = tm.name && tm.name.trim().length > 0;
          const hasEmail = tm.email && tm.email.trim().length > 0;

          if (hasName && !hasEmail) {
            setRegErrorMsg(`Teammate #${i + 1} has a name but is missing an Email Address. Please enter a valid email or remove the teammate.`);
            setIsSubmitting(false);
            return;
          }

          if (!hasName && hasEmail) {
            setRegErrorMsg(`Teammate #${i + 1} has an email but is missing a Full Name. Please enter a full name or remove the teammate.`);
            setIsSubmitting(false);
            return;
          }

          if (hasName && hasEmail) {
            validTeammates.push({
              name: tm.name.trim(),
              email: tm.email.trim().toLowerCase(),
              mobile: tm.phone ? tm.phone.trim() : undefined,
              college: tm.college ? tm.college.trim() : (college.trim() || undefined),
              food_pref: selectedEvent.has_food ? (tm.food_preference || 'Veg') : undefined
            });
          }
        }

        const teamPayload = {
          team_name: teamName.trim(),
          event_name: selectedEvent.name,
          leader_name: fullName.trim(),
          leader_email: email.trim().toLowerCase(),
          leader_mobile: phone ? phone.trim() : undefined,
          leader_college: college ? college.trim() : undefined,
          leader_food_pref: selectedEvent.has_food ? foodPreference : undefined,
          members: validTeammates
        };

        res = await api.post<any>('/register/team', teamPayload);
      } else {
        // Individual Event Registration -> /register/solo
        const soloPayload = {
          event_name: selectedEvent.name,
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          mobile: phone ? phone.trim() : undefined,
          college: college ? college.trim() : undefined,
          food_pref: selectedEvent.has_food ? foodPreference : undefined
        };

        res = await api.post<any>('/register/solo', soloPayload);
      }

      if (phone && phone.trim()) {
        localStorage.setItem('user_phone', phone.trim());
      }

      const regId = res.registration_id || res.team_id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'f' + Date.now().toString(16) + '-4000-8000-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0'));

      if (!isFreeEvent && cleanUtr) {
        try {
          await api.post('/payments/submit-utr', {
            registration_id: regId,
            utr_number: cleanUtr,
            event_name: selectedEvent.name,
            user_email: email.trim().toLowerCase()
          });
        } catch (utrErr: any) {
          console.warn("Direct UTR post notice:", utrErr);
          if (utrErr?.response?.status === 400) {
            setRegErrorMsg(utrErr?.response?.data?.detail || "SECURITY ERROR: Invalid UTR format or duplicate UTR number already submitted.");
            setIsSubmitting(false);
            return;
          }
          enqueueOfflineItem('UTR_SUBMIT', '/payments/submit-utr', {
            registration_id: regId,
            utr_number: cleanUtr,
            event_name: selectedEvent.name,
            user_email: email.trim().toLowerCase()
          });
        }
      }

      // Store in local student passes
      try {
        const existingPasses = JSON.parse(localStorage.getItem('my_event_registrations') || '[]');
        existingPasses.push({
          id: regId,
          event_name: selectedEvent.name,
          food_preference: foodPreference,
          status: isFreeEvent ? 'COMPLETED' : 'PENDING_VERIFICATION',
          utr: isFreeEvent ? undefined : cleanUtr,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('my_event_registrations', JSON.stringify(existingPasses));
      } catch (e) {}

      setRegisteredPass({
        regId,
        eventName: selectedEvent.name,
        amount: isFreeEvent ? 'FREE (₹0)' : selectedEvent.price,
        status: isFreeEvent ? 'CONFIRMED' : 'PENDING VERIFICATION',
        utr: isFreeEvent ? null : cleanUtr
      });

      setRegSuccessMsg(isFreeEvent 
        ? `🎉 REGISTRATION CONFIRMED FOR ${selectedEvent.name.toUpperCase()}!`
        : `🎉 REGISTRATION & PAYMENT UTR SUBMITTED FOR ${selectedEvent.name.toUpperCase()}!`
      );

    } catch (err: any) {
      console.warn("Registration endpoint notice on current mobile network:", err);
      setRegErrorMsg(err?.response?.data?.detail || err?.message || "Registration failed. Please check your details and try again.");
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
            padding: 0.85rem !important;
            border-radius: 12px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
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

        .cyber-card.hovered, .cyber-card:active, .cyber-card:focus-within, .cyber-card-wrapper:active .cyber-card {
          border-color: #00f3ff;
          box-shadow: 0 0 35px rgba(0, 243, 255, 0.4), inset 0 0 20px rgba(0, 243, 255, 0.15);
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

        .cyber-card.hovered .cyber-card-img, .cyber-card:active .cyber-card-img, .cyber-card-wrapper:active .cyber-card-img {
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

        .card-prize-tag {
          font-size: 0.68rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          color: #fbbf24;
          text-transform: uppercase;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: 0.3rem 0.65rem;
          border-radius: 6px;
          border: 1px solid rgba(251, 191, 36, 0.6);
          box-shadow: 0 0 10px rgba(251, 191, 36, 0.25);
        }

        .cyber-card-bottom-badge-overlay {
          position: absolute;
          bottom: 10px;
          right: 10px;
          z-index: 10;
          pointer-events: none;
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
          padding: 12px 14px 40px 14px;
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

        .mobile-prize-badge {
          background: rgba(0, 0, 0, 0.85);
          border: 1px solid rgba(251, 191, 36, 0.6);
          color: #fbbf24;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 900;
          text-transform: uppercase;
          box-shadow: 0 0 10px rgba(251, 191, 36, 0.25);
        }

        .mobile-bottom-badge-bar {
          position: absolute;
          bottom: 10px;
          right: 10px;
          z-index: 10;
          pointer-events: none;
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
          box-shadow: 0 0 10px rgba(0, 243, 255, 0.25);
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
        .mobile-stat-label.prize { color: #fbbf24; }

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
          background: rgba(0, 0, 0, 0.65);
          border: 1px solid rgba(0, 243, 255, 0.25);
          border-radius: 14px;
          padding: 16px;
          color: #d4d4d8;
          font-size: 0.82rem;
          line-height: 1.65;
          text-align: left;
          margin-bottom: 20px;
          width: 100%;
          max-height: 380px;
          overflow-y: auto;
          box-sizing: border-box;
          -webkit-overflow-scrolling: touch;
          box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);
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

      {/* Payment Failure Popup Modal */}
      {searchParams.get('payment_failed') === 'true' && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#120521] border-2 border-red-500/60 rounded-2xl p-6 text-center shadow-[0_0_50px_rgba(239,68,68,0.4)] relative">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center mx-auto mb-4 text-2xl text-red-400">
              ❌
            </div>
            <h3 className="text-xl font-extrabold text-red-400 font-mono tracking-wider uppercase mb-2">
              PAYMENT FAILED / CANCELED
            </h3>
            <p className="text-xs text-gray-300 font-sans leading-relaxed mb-6">
              Your payment for <strong className="text-cyan-300">{searchParams.get('event') || 'Envision Track'}</strong> could not be completed or was canceled. You can try registering again below.
            </p>
            <button
              onClick={() => setSearchParams({})}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg cursor-pointer"
            >
              DISMISS & RETRY REGISTRATION
            </button>
          </div>
        </div>
      )}

      {/* State Router View: Grid */}
      {view === 'grid' && (
        <>
          {/* Top EVENTS Section Header Label */}
          <div className="flex flex-col items-center justify-center text-center p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/40 to-slate-950/60 border border-cyan-500/30 mb-8 sm:mb-10 w-full box-border shadow-[0_0_25px_rgba(0,243,255,0.15)] backdrop-blur-md">
            <div className="flex flex-col items-center justify-center gap-1.5 text-center">
              <h2 className="text-xl sm:text-2xl font-black font-mono tracking-widest uppercase m-0 text-center">
                <span className="bg-gradient-to-r from-cyan-300 via-purple-200 to-pink-400 bg-clip-text text-transparent">EVENTS</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-cyan-200/70 font-mono tracking-wide m-0 text-center">
                ENVISION '26 COMPETITIONS & KEYNOTE SEMINARS
              </p>
            </div>
          </div>

          {isLoading && (
            <div className="w-full py-4 text-center text-xs font-mono text-cyan-400 animate-pulse bg-cyan-950/20 border border-cyan-500/20 rounded-xl mb-4">
              ⚡ Loading...
            </div>
          )}

          {isError && (
            <div className="w-full py-3 text-center text-xs font-mono text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl mb-4">
              ⚠️ Unable to reach backend catalog server. Displaying offline events cache.
            </div>
          )}

          <div className="events-grid">
            {eventsList.map(event => (
              <div
                key={event.id}
                className="cyber-card-wrapper"
                onTouchStart={() => setHoveredCardId(event.id)}
                onTouchEnd={() => setTimeout(() => setHoveredCardId(null), 800)}
              >
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
                        <span className="card-prize-tag">🏆 {getShortPrizeLabel(event)}</span>
                      </div>
                      <div className="cyber-card-bottom-badge-overlay">
                        <span className={`card-price-tag ${event.price === 'FREE' ? 'free' : ''}`}>FEE: {event.price}</span>
                      </div>
                    </div>
                    <h3 className="card-title">{event.name}</h3>
                    <p className="card-desc">{event.notes}</p>
                  </div>

                  <div className="card-actions">
                    <button
                      className="btn-cyber-primary"
                      onClick={() => handleRegister(event, 'grid')}
                      style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(153, 27, 27, 0.45) 100%)',
                        border: '1px solid #ef4444',
                        color: '#fca5a5'
                      }}
                    >
                      🚫 REGISTRATION CLOSED
                    </button>
                    <button
                      className="btn-cyber-secondary"
                      onClick={() => handleExplore(event)}
                    >
                      DETAILS
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Download Official Envision '26 Festival Brochure Banner */}
          <div 
            className="mt-12 mb-16 sm:mt-16 sm:mb-24 p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-slate-950/90 via-purple-950/50 to-cyan-950/80 border-2 border-cyan-400/50 text-center space-y-4 shadow-[0_0_35px_rgba(0,243,255,0.2)] relative overflow-hidden backdrop-blur-xl"
            style={{ marginBottom: '3.5rem' }}
          >
            {/* Ambient Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/10 via-purple-500/10 to-transparent pointer-events-none"></div>

            <div className="space-y-1.5 relative z-10">
              <h3 className="text-lg sm:text-xl font-black font-mono uppercase tracking-wider m-0 flex items-center justify-center gap-2">
                <span></span>
                <span className="bg-gradient-to-r from-cyan-300 via-purple-200 to-pink-400 bg-clip-text text-transparent">ENVISION BROCHURE</span>
              </h3>
              <p className="text-xs sm:text-sm text-cyan-200/80 font-mono m-0">
                Click below to view or download the official festival PDF brochure.
              </p>
            </div>

            <div className="pt-1 relative z-10 flex justify-center">
              <a
                href="https://drive.google.com/file/d/18zngC1fwb-heQlqg14H6lDjgBvioxfeJ/view?usp=drivesdk"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto min-w-[250px] px-7 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 hover:from-cyan-400 hover:via-purple-500 hover:to-pink-400 text-white font-mono text-xs sm:text-sm font-black transition-all transform hover:scale-[1.03] active:scale-95 shadow-[0_0_25px_rgba(0,243,255,0.4)] hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] flex items-center justify-center gap-3 no-underline cursor-pointer border border-cyan-300/40"
              >
                <span className="text-lg"></span>
                <span className="tracking-widest uppercase">VIEW OFFICIAL BROCHURE</span>
                <span className="text-sm">&rarr;</span>
              </a>
            </div>
          </div>

          {/* Global Festival Terms & Conditions Section */}
          <div 
            className="mt-12 sm:mt-16 p-6 rounded-2xl bg-black/45 border border-purple-500/30 text-left backdrop-blur-md shadow-2xl"
            style={{ marginTop: '3.5rem' }}
          >
            <h3 className="text-sm font-black text-cyan-300 uppercase tracking-widest font-mono mb-4 flex items-center gap-2">
              <span>📜</span> ENVISION '26 TECHFEST TERMS & CONDITIONS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300 leading-relaxed font-sans">
              <ul className="list-disc pl-5 flex flex-col gap-2.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 m-0">
                <li className="pl-1"><strong className="text-purple-400">Reporting Time:</strong> All participants must report to the campus by 9:30 AM on the event day. Late reporting may result in disqualification.</li>
                <li className="pl-1"><strong className="text-purple-400">On-Spot Registration:</strong> On-spot registration is available after online registration closes, strictly subject to seat availability.</li>
                <li className="pl-1"><strong className="text-purple-400">Verification & ID:</strong> Valid college student photo ID is strictly required at venue entry points.</li>
                <li className="pl-1"><strong className="text-purple-400">Non-Refundable:</strong> All paid event registration slots are non-refundable and non-transferable.</li>
              </ul>
              <ul className="list-disc pl-5 flex flex-col gap-2.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 m-0">
                <li className="pl-1"><strong className="text-purple-400">Lunch Provision:</strong> Lunch is provided only to participants who registered for at least one event during online registration.</li>
                <li className="pl-1"><strong className="text-purple-400">Seminar & Lunch Exclusions:</strong> Any participant may register for the seminar (Tech Talk). However, lunch will be provided only to participants registered for at least one other event; seminar-only participants are not eligible for lunch.</li>
                <li className="pl-1"><strong className="text-purple-400">Event Head Communication:</strong> Each event has a designated Event Head; participants must contact only the respective Event Head for any event-related queries or issues. Please do not contact the Event Head of another event regarding matters unrelated to their event.</li>
                <li className="pl-1"><strong className="text-purple-400">Prize Pool:</strong> The prize pool is variable and will be determined based on the total number of valid registrations received for each event.</li>
              </ul>
            </div>
          </div>
        </>
      )}

      {/* State Router View: Detail */}
      {view === 'detail' && selectedEvent && (
        <div className="mobile-detail-wrapper">
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
                <span className="mobile-prize-badge">
                  🏆 {getShortPrizeLabel(selectedEvent)}
                </span>
              </div>
              <div className="mobile-bottom-badge-bar">
                <span className={`mobile-price-badge ${selectedEvent.price === 'FREE' ? 'free' : ''}`}>
                  FEE: {selectedEvent.price}
                </span>
              </div>
            </div>

            {/* 2. Event Title */}
            <h2 className="mobile-event-title">
              {selectedEvent.name}
            </h2>

            {/* 3. Organized Stats Tiles (Date, Venue, Time, Prize) */}
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
              <div className="mobile-stat-tile">
                <span className="mobile-stat-label prize">
                  <span>🏆</span> PRIZE :
                </span>
                <span className="mobile-stat-value">{selectedEvent.prize || 'Exciting Cash Prizes & Winner Trophies'}</span>
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
                <p className="text-xs text-gray-200 leading-relaxed font-sans m-0">
                  {EVENT_DESCRIPTIONS[selectedEvent.id.toLowerCase()] || selectedEvent.notes || `Welcome to ${selectedEvent.name}. Get ready to showcase your skills.`}
                </p>
              )}
              {activeTab === 'rules' && (
                <div className="space-y-4 font-sans text-left">
                  {selectedEvent.id.toLowerCase() === 'techtalk' ? (
                    /* Tech Talk Seminar Guidelines */
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-950/80 via-slate-950/90 to-cyan-950/80 border border-purple-500/40 space-y-3 shadow-lg">
                      <div className="text-xs sm:text-sm font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                        <span>📜</span> TECH TALK (SEMINAR) – RULES & GUIDELINES
                      </div>
                      <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-gray-200 leading-relaxed font-sans">
                        <li><strong className="text-cyan-300">Participation is absolutely FREE</strong> for everyone.</li>
                        <li><strong className="text-purple-300">No food or refreshments</strong> will be provided for this seminar.</li>
                        <li>Participants who register for <strong className="text-cyan-300">any other event</strong> in the tech fest are <strong className="text-amber-300">required to attend</strong> the Tech Talk seminar.</li>
                        <li>All registered participants who attend the seminar will receive an <strong className="text-emerald-300">E-Certificate of Participation</strong>.</li>
                        <li>Anyone is welcome to attend the seminar, even if they are not participating in any other event.</li>
                      </ul>
                    </div>
                  ) : (
                    /* All Other Events: High-Visual VIEW RULES Card (No text points) */
                    <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-950/90 via-purple-950/50 to-cyan-950/80 border-2 border-cyan-400/60 text-center space-y-5 shadow-[0_0_35px_rgba(0,243,255,0.25)] relative overflow-hidden backdrop-blur-xl">
                      {/* Subtle Ambient Radial Light */}
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent pointer-events-none"></div>

                      <div className="space-y-1.5 relative z-10">
                        <span className="text-[11px] font-mono font-extrabold text-cyan-300 uppercase tracking-widest block">
                          OFFICIAL EVENT RULEBOOK
                        </span>
                        <h3 className="text-lg sm:text-2xl font-black text-white font-mono uppercase tracking-wide m-0">
                          {selectedEvent.name} RULES & REGULATIONS
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-300 font-sans max-w-md mx-auto m-0">
                          Click below to open and inspect the official full image rulebook for {selectedEvent.name}.
                        </p>
                      </div>

                      {/* Prominent Visual View Rules Button */}
                      {EVENT_RULES_LINKS[selectedEvent.id.toLowerCase()] && (
                        <div className="pt-2 relative z-10 flex justify-center">
                          <a
                            href={EVENT_RULES_LINKS[selectedEvent.id.toLowerCase()]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto min-w-[240px] px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 hover:from-cyan-400 hover:via-purple-500 hover:to-pink-400 text-white font-mono text-sm font-black transition-all transform hover:scale-[1.03] active:scale-95 shadow-[0_0_25px_rgba(0,243,255,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] flex items-center justify-center gap-3 no-underline cursor-pointer border border-cyan-300/40"
                          >
                            <span className="text-lg">📜</span>
                            <span className="tracking-widest">VIEW OFFICIAL RULES</span>
                            <span className="text-xs opacity-90 font-sans">&rarr;</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'contact' && (() => {
                const contact = EVENT_CONTACTS[selectedEvent.id.toLowerCase()];
                const isPhotographyEvent = selectedEvent.id.toLowerCase() === 'lensverse' || selectedEvent.id.toLowerCase() === 'photography';

                return (
                  <div className="space-y-4 font-sans text-left">
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed m-0 font-mono">
                      For event rules, scheduling, or queries regarding <strong className="text-cyan-300 uppercase">{selectedEvent.name}</strong>, contact the Event Head directly:
                    </p>

                    {contact && (
                      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-950/90 via-purple-950/40 to-cyan-950/80 border-2 border-cyan-400/60 space-y-4 text-left shadow-[0_0_35px_rgba(0,243,255,0.25)] relative overflow-hidden backdrop-blur-xl">
                        {/* Header Badge Row */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-white/15">
                          <span className="text-xs font-mono text-cyan-300 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                            DESIGNATED EVENT HEAD
                          </span>
                          <span className="text-[11px] font-mono text-purple-200 bg-purple-900/70 px-3 py-1 rounded-full border border-purple-400/50 font-black uppercase tracking-wider shadow-sm">
                            {selectedEvent.name}
                          </span>
                        </div>

                        {/* Event Head Name & Phone Card */}
                        <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider">EVENT COORDINATOR</div>
                            <div className="text-base sm:text-lg font-black text-white tracking-wide font-mono flex items-center gap-2">
                              <span className="text-cyan-400 text-lg">👤</span>
                              <span>{contact.head}</span>
                            </div>
                          </div>

                          <div className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-mono text-xs sm:text-sm font-extrabold tracking-widest text-center">
                            📱 {contact.phone}
                          </div>
                        </div>

                        {/* Action Buttons Bar */}
                        {isPhotographyEvent ? (
                          /* 3 Visual Icons/Pills Specifically for Photography (LENSVERSE) */
                          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* 1. Direct Phone Call Action */}
                            <a
                              href={`tel:${contact.rawPhone}`}
                              className="py-3 px-3.5 rounded-xl bg-gradient-to-r from-cyan-500/25 to-blue-500/25 hover:from-cyan-500/40 hover:to-blue-500/40 border border-cyan-400/60 text-cyan-200 font-mono text-xs font-black text-center transition-all flex items-center justify-center gap-2 no-underline cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(0,243,255,0.2)] hover:shadow-[0_0_20px_rgba(0,243,255,0.4)]"
                              title={`Call ${contact.head}`}
                            >
                              <span className="text-sm">📞</span>
                              <span>CALL {contact.phone}</span>
                            </a>

                            {/* 2. Official Email Action */}
                            <a
                              href={`mailto:${contact.email || 'roysouvik0987@gmail.com'}`}
                              className="py-3 px-3.5 rounded-xl bg-gradient-to-r from-purple-500/25 to-indigo-500/25 hover:from-purple-500/40 hover:to-indigo-500/40 border border-purple-400/60 text-purple-200 font-mono text-xs font-black text-center transition-all flex items-center justify-center gap-2 no-underline cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                              title={`Email ${contact.email || 'roysouvik0987@gmail.com'}`}
                            >
                              <span className="text-sm">✉️</span>
                              <span>EMAIL US</span>
                            </a>

                            {/* 3. Official Instagram Action */}
                            <a
                              href="https://www.instagram.com/envision_rkm?igsh=aTEyYTdiZmcydHN0"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-3 px-3.5 rounded-xl bg-gradient-to-r from-pink-500/25 to-rose-500/25 hover:from-pink-500/40 hover:to-rose-500/40 border border-pink-400/60 text-pink-200 font-mono text-xs font-black text-center transition-all flex items-center justify-center gap-2 no-underline cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.2)] hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                              title="Visit Official Envision Instagram"
                            >
                              <span className="text-sm">📸</span>
                              <span>INSTAGRAM</span>
                            </a>
                          </div>
                        ) : (
                          /* Standard High-Visual 2-Button Action Bar for Other Events */
                          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                            <a
                              href={`tel:${contact.rawPhone}`}
                              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500/25 to-blue-500/25 hover:from-cyan-500/40 hover:to-blue-500/40 border border-cyan-400/60 text-cyan-200 font-mono text-xs font-black text-center transition-all flex items-center justify-center gap-2.5 no-underline cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(0,243,255,0.2)] hover:shadow-[0_0_20px_rgba(0,243,255,0.4)]"
                            >
                              <span className="text-sm">📞</span>
                              <span>CALL EVENT HEAD</span>
                            </a>
                            <a
                              href={`https://wa.me/${contact.rawPhone.replace('+', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500/25 to-teal-500/25 hover:from-emerald-500/40 hover:to-teal-500/40 border border-emerald-400/60 text-emerald-200 font-mono text-xs font-black text-center transition-all flex items-center justify-center gap-2.5 no-underline cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                            >
                              <span className="text-sm">💬</span>
                              <span>WHATSAPP CHAT</span>
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
              {activeTab === 'terms' && (
                selectedEvent.id.toLowerCase() === 'techtalk' ? (
                  <ul className="list-disc pl-5 space-y-2.5 text-[11.5px] sm:text-xs text-gray-200 font-sans leading-relaxed text-left">
                    <li className="pl-1"><strong className="text-purple-300">Free Registration:</strong> Registration is free of charge and open to all participants.</li>
                    <li className="pl-1"><strong className="text-purple-300">Prior Registration:</strong> Participants must register before attending the seminar.</li>
                    <li className="pl-1"><strong className="text-purple-300">Mandatory Attendance:</strong> Attendance is mandatory for participants registered in any other event of the tech fest.</li>
                    <li className="pl-1"><strong className="text-purple-300">E-Certificate Issuance:</strong> E-Certificates will be issued only to registered participants who attend the complete seminar.</li>
                    <li className="pl-1"><strong className="text-purple-300">No Refreshments:</strong> No food or refreshments will be provided during the seminar.</li>
                    <li className="pl-1"><strong className="text-purple-300">Code of Conduct:</strong> Participants are expected to maintain discipline and follow the instructions of the organisers throughout the event.</li>
                    <li className="pl-1"><strong className="text-purple-300">Discipline Enforcement:</strong> Any form of misconduct or disruption may result in removal from the seminar without a certificate.</li>
                    <li className="pl-1"><strong className="text-purple-300">Schedule Amendments:</strong> The organisers reserve the right to modify the schedule or rules if necessary.</li>
                  </ul>
                ) : (
                  <ul className="list-disc pl-5 space-y-2.5 text-[11.5px] sm:text-xs text-gray-200 font-sans leading-relaxed text-left">
                    <li className="pl-1"><strong className="text-purple-300">Non-Refundable Policy:</strong> All event registration fees are strictly non-refundable and non-transferable.</li>
                    <li className="pl-1"><strong className="text-purple-300">ID Verification:</strong> Participants must produce valid College Student Photo ID cards at venue registration desks.</li>
                    <li className="pl-1"><strong className="text-purple-300">Decorum & Conduct:</strong> Plagiarism, malicious exploits, or misconduct result in instant forfeiture and track expulsion.</li>
                    <li className="pl-1"><strong className="text-purple-300">Schedule Amendments:</strong> Organizers reserve the right to revise schedule timelines or disqualification parameters if required.</li>
                    <li className="pl-1"><strong className="text-purple-300">On-Spot Registration:</strong> On-spot registration is available after online registration closes, subject to seat availability.</li>
                    <li className="pl-1"><strong className="text-purple-300">Lunch Eligibility:</strong> Lunch is provided only to participants who registered for at least one event during online registration.</li>
                    <li className="pl-1"><strong className="text-purple-300">Event Head Protocol:</strong> Each event has a designated Event Head; participants must contact only the respective Event Head for any event-related queries or issues.</li>
                    <li className="pl-1"><strong className="text-purple-300">No Cross-Event Contact:</strong> Please do not contact the Event Head of another event regarding matters unrelated to their event.</li>
                    <li className="pl-1"><strong className="text-purple-300">Reporting Time:</strong> All participants must report to the campus by 9:30 AM on the event day. Late reporting may result in disqualification from the event.</li>
                    <li className="pl-1"><strong className="text-purple-300">Seminar & Lunch Rule:</strong> Any participant may register for the seminar. Lunch will be provided only to participants registered for at least one other event; seminar-only participants are not eligible for lunch.</li>
                    <li className="pl-1"><strong className="text-purple-300">Prize Pool Policy:</strong> The prize pool is variable and will be determined based on the total number of valid registrations received for each event.</li>
                  </ul>
                )
              )}
            </div>

            {/* 6. Prominent Call-To-Action Button */}
            <button
              className="mobile-cta-btn"
              onClick={() => handleRegister(selectedEvent, 'detail')}
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(153, 27, 27, 0.6) 100%)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.35)'
              }}
            >
              🚫 REGISTRATION CLOSED
            </button>
          </div>
        </div>
      )}

      {/* State Router View: Register */}
      {view === 'register' && selectedEvent && (
        <div className="reg-container">
          {REGISTRATION_CLOSED ? (
            <div className="text-center py-12 px-6 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center mx-auto mb-4 text-3xl shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-pulse">
                🚫
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wider font-mono uppercase mb-2">
                REGISTRATION OFFICIALLY CLOSED
              </h2>
              <p className="text-xs sm:text-sm text-red-300 font-mono max-w-md mx-auto mb-6 leading-relaxed">
                Online registration for Envision '26 has reached 100% capacity and is now closed for all events. Thank you for your overwhelming response!
              </p>
              <button
                onClick={() => setSearchParams({ view: 'grid' })}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 hover:from-cyan-400 hover:via-purple-500 text-white font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_25px_rgba(0,243,255,0.4)] hover:scale-105 active:scale-95"
              >
                ← BACK TO EVENTS CATALOG
              </button>
            </div>
          ) : (
            <>
          <div className="reg-header">
            <h2 className="reg-title">{selectedEvent.name} REGISTRATION</h2>
            <div className="reg-subtitle">
              {selectedEvent.requires_team ? `Team Event (Leader + up to ${selectedEvent.max_team_size - 1} Teammates)` : 'Individual Track Registration'}
            </div>
          </div>

          {REGISTRATION_CLOSED && (
            <div className="mb-6 p-4 rounded-2xl bg-red-950/90 border-2 border-red-500/80 text-red-200 text-xs font-mono font-bold shadow-[0_0_30px_rgba(239,68,68,0.5)] text-center flex flex-col items-center justify-center gap-1.5 backdrop-blur-xl">
              <div className="flex items-center justify-center gap-2 text-sm text-red-400 font-extrabold tracking-wider uppercase font-mono">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0"></span>
                <span>🚫 REGISTRATION OFFICIALLY CLOSED</span>
              </div>
              <p className="text-[11.5px] text-gray-200 font-sans m-0 leading-relaxed text-center">
                Online registration for Envision '26 has reached maximum capacity and is now closed. Thank you for your overwhelming support!
              </p>
            </div>
          )}

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
                <label className="text-[10px] font-mono text-cyan-400 font-bold uppercase mb-1 block">
                  👤 Full Name *
                </label>
                <input
                  type="text"
                  className="reg-input"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="reg-input-group">
                <label className="text-[10px] font-mono text-cyan-400 font-bold uppercase mb-1 block">
                  🏫 College / University Name *
                </label>
                <input
                  type="text"
                  className="reg-input"
                  placeholder="Enter your college / university name"
                  value={college}
                  onChange={e => setCollege(e.target.value)}
                  required
                />
              </div>

              <div className="reg-input-group">
                <label className="text-[10px] font-mono text-cyan-400 font-bold uppercase mb-1 block">
                  📱 Phone / WhatsApp Number *
                </label>
                <input
                  type="tel"
                  className="reg-input"
                  placeholder="Enter 10-digit mobile number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                />
              </div>

              {/* Email Address Section */}
              <div className="reg-input-group">
                <label className="text-[10px] font-mono text-cyan-400 font-bold uppercase mb-1 block">
                  ✉️ Email Address *
                </label>
                {isUserSignedIn ? (
                  <div className="relative">
                    <input
                      type="email"
                      className="reg-input opacity-90 cursor-not-allowed bg-black/60 border-cyan-500/50 text-cyan-300 font-bold pr-32"
                      placeholder="Email Address"
                      value={email || localStorage.getItem('user_email') || ''}
                      readOnly={true}
                      disabled={true}
                      required
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-cyan-400 bg-cyan-950/90 px-2 py-1 rounded border border-cyan-500/40 flex items-center gap-1">
                      🔒 LOCKED EMAIL
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-purple-950/60 border border-cyan-400/50 flex flex-col items-center justify-center gap-2 text-center my-1">
                    <span className="text-[11px] font-mono text-cyan-300 font-extrabold uppercase tracking-wider">
                      🔐 ONE-CLICK SIGN IN TO UNLOCK EMAIL & REGISTER
                    </span>
                    <p className="text-[10.5px] text-gray-300 font-mono m-0">
                      Sign in with Google to lock in your email & track passes on your dashboard:
                    </p>
                    <button
                      type="button"
                      onClick={() => loginWithGoogle()}
                      disabled={isLoadingGoogle}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-extrabold text-xs font-mono uppercase tracking-wider shadow-[0_0_20px_rgba(0,243,255,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 mt-1"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>{isLoadingGoogle ? 'AUTHENTICATING...' : 'ONE-CLICK GOOGLE SIGN IN'}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="reg-input-group">
                <label className="text-[10px] font-mono text-cyan-400 font-bold uppercase mb-1 block">
                  🚻 Gender *
                </label>
                <div className="reg-select-wrapper">
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
              </div>

              {/* Conditional Food Preference Dropdown (Only rendered if selectedEvent.has_food is true) */}
              {selectedEvent.has_food && (
                <div className="reg-input-group">
                  <label className="text-[10px] font-mono text-cyan-400 font-bold uppercase mb-1 block">
                    🍱 Member 1 (Team Leader - You) Food Preference *
                  </label>
                  <div className="reg-select-wrapper">
                    <select
                      className="reg-input reg-select"
                      value={foodPreference}
                      onChange={e => setFoodPreference(e.target.value)}
                      required
                    >
                      <option value="Veg">Veg (Vegetarian Meal Pass)</option>
                      <option value="Non-Veg">Non-Veg (Non-Vegetarian Meal Pass)</option>
                    </select>
                    <svg className="reg-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
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
                      placeholder="Team Name"
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Dynamic Teammate Member Cards (Allows adding 0 to max_team_size - 1 extra members) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-2 mb-2 pt-2.5 border-t border-white/10">
                    <div>
                      <span className="text-xs font-mono text-cyan-300 font-extrabold uppercase block tracking-wider">
                        ADDITIONAL TEAMMATES ({teammatesCount} of max {selectedEvent.max_team_size - 1})
                      </span>
                      <span className="text-[10.5px] text-gray-300 font-sans block mt-0.5">
                        Fill teammate details below or click remove to register solo
                      </span>
                    </div>

                    {selectedEvent.max_team_size > 1 && (
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                        {teammatesCount < selectedEvent.max_team_size - 1 && (
                          <button
                            type="button"
                            onClick={() => setTeammatesCount(prev => Math.min(prev + 1, selectedEvent.max_team_size - 1))}
                            className="flex-1 sm:flex-none px-3 py-1.5 text-[11px] font-mono font-extrabold bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/60 text-cyan-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(0,243,255,0.15)]"
                          >
                            <span className="text-sm">+</span>
                            <span>ADD TEAMMATE {teammatesCount + 1}</span>
                          </button>
                        )}
                        {teammatesCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setTeammatesCount(prev => Math.max(prev - 1, 0))}
                            className="flex-1 sm:flex-none px-3 py-1.5 text-[11px] font-mono font-extrabold bg-red-500/20 hover:bg-red-500/35 border border-red-400/60 text-red-300 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                          >
                            <span className="text-sm">-</span>
                            <span>REMOVE TEAMMATE</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {Array.from({ length: teammatesCount }).map((_, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-black/60 border border-cyan-500/40 flex flex-col gap-2.5 shadow-md">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-2 mb-1 gap-1">
                        <span className="text-[11.5px] font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                          <span>👤</span> MEMBER {idx + 2} (TEAMMATE {idx + 1}) DETAILS
                        </span>
                        <span className="text-[10px] font-mono text-purple-300 bg-purple-900/60 px-2.5 py-0.5 rounded-full border border-purple-500/40 self-start sm:self-auto">
                          AUTO-GENERATES FEST ID
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10.5px] font-mono text-cyan-400 font-bold mb-1 block">Full Name *</label>
                          <input
                            type="text"
                            className="reg-input text-xs min-h-[42px]"
                            placeholder="Teammate Full Name"
                            value={teammates[idx]?.name || ''}
                            onChange={e => handleTeammateDetailChange(idx, 'name', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10.5px] font-mono text-cyan-400 font-bold mb-1 block">Email Address *</label>
                          <input
                            type="email"
                            className="reg-input text-xs min-h-[42px]"
                            placeholder="Teammate Email Address"
                            value={teammates[idx]?.email || ''}
                            onChange={e => handleTeammateDetailChange(idx, 'email', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10.5px] font-mono text-gray-300 mb-1 block">Mobile No</label>
                          <input
                            type="tel"
                            className="reg-input text-xs min-h-[42px]"
                            placeholder="Phone Number"
                            value={teammates[idx]?.phone || ''}
                            onChange={e => handleTeammateDetailChange(idx, 'phone', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[10.5px] font-mono text-gray-300 mb-1 block">College Name</label>
                          <input
                            type="text"
                            className="reg-input text-xs min-h-[42px]"
                            placeholder="College / University Name"
                            value={teammates[idx]?.college || ''}
                            onChange={e => handleTeammateDetailChange(idx, 'college', e.target.value)}
                          />
                        </div>

                        {selectedEvent.has_food && (
                          <div className="md:col-span-2 mt-1">
                            <label className="text-[10px] font-mono text-cyan-300 font-bold uppercase mb-1 block">
                              🍱 Member {idx + 2} (Teammate {idx + 1}) Food Preference *
                            </label>
                            <div className="reg-select-wrapper">
                              <select
                                className="reg-input reg-select text-xs"
                                value={teammates[idx]?.food_preference || 'Veg'}
                                onChange={e => handleTeammateDetailChange(idx, 'food_preference', e.target.value)}
                                required
                              >
                                <option value="Veg">Veg (Vegetarian Meal Pass)</option>
                                <option value="Non-Veg">Non-Veg (Non-Vegetarian Meal Pass)</option>
                              </select>
                              <svg className="reg-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Success Ticket Pass Screen */}
              {registeredPass ? (
                <div className="p-6 rounded-2xl bg-[#09031a]/95 border border-cyan-400/50 text-center shadow-[0_0_40px_rgba(0,243,255,0.2)] my-4">
                  <div className="w-14 h-14 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center mx-auto mb-3 text-2xl">
                    🎉
                  </div>
                  <h3 className="text-lg font-black text-cyan-300 font-mono uppercase m-0">
                    REGISTRATION SUBMITTED!
                  </h3>
                  <p className="text-xs text-gray-300 font-mono mt-1 mb-4">
                    {registeredPass.eventName} Pass Generated
                  </p>

                  <div className="p-4 rounded-xl bg-black/60 border border-cyan-500/30 text-left font-mono text-xs space-y-2 mb-5">
                    <div>📌 <span className="text-gray-400">EVENT:</span> <strong className="text-white">{registeredPass.eventName}</strong></div>
                    <div>🎫 <span className="text-gray-400">PASS ID:</span> <span className="text-cyan-300 font-bold">{registeredPass.regId}</span></div>
                    {registeredPass.utr && (
                      <div>💳 <span className="text-gray-400">SUBMITTED UTR:</span> <span className="text-purple-300 font-bold">UTR-{registeredPass.utr}</span></div>
                    )}
                    <div>⏳ <span className="text-gray-400">STATUS:</span> <span className="text-emerald-400 font-bold">✓ {registeredPass.status}</span></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setRegisteredPass(null);
                      setSearchParams({});
                      navigate('/dashboard');
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,243,255,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    VIEW TICKET IN DASHBOARD
                  </button>
                </div>
              ) : (
                <>
                  {/* Embedded UPI Payment & Scanner Section for Paid Events */}
                  {(selectedEvent.price_amount ?? 0) > 0 && (
                    <div className="p-4 rounded-2xl bg-[#09031a]/95 border border-cyan-500/40 text-left shadow-[0_0_30px_rgba(0,243,255,0.15)] my-3.5">
                      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📲</span>
                          <h4 className="text-xs font-extrabold text-cyan-300 uppercase tracking-widest font-mono m-0">
                            UPI PAYMENT & SCANNER ({selectedEvent.price})
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                          PAYEE: RITAM BERA
                        </span>
                      </div>

                      {/* QR Code & Payee Info */}
                      <div className="flex flex-col sm:flex-row items-center gap-3.5 mb-3.5 bg-black/50 p-3 rounded-xl border border-cyan-500/20">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`upi://pay?pa=ritambera6969@oksbi&pn=RITAM%20BERA&am=${selectedEvent.price_amount ?? 49}&cu=INR&tn=Envision2026`)}&color=00f3ff&bgcolor=0a051d`}
                          alt="Envision UPI QR Code"
                          className="w-32 h-32 rounded-xl border border-cyan-400/40 p-1.5 bg-[#0a051d] shadow-[0_0_20px_rgba(0,243,255,0.25)] select-none shrink-0"
                        />
                        <div className="flex-1 text-center sm:text-left min-w-0">
                          <div className="text-[10px] font-mono text-gray-400 uppercase">OFFICIAL UPI ID (VPA):</div>
                          <div className="flex items-center justify-center sm:justify-start gap-2 my-1">
                            <span className="font-mono text-xs font-black text-cyan-300 bg-black/70 px-2 py-1 rounded-lg border border-cyan-500/30 truncate">
                              ritambera6969@oksbi
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText('ritambera6969@oksbi');
                                setCopiedVpa(true);
                                setTimeout(() => setCopiedVpa(false), 2000);
                              }}
                              className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/40 text-cyan-300 text-[10px] font-bold transition-all cursor-pointer shrink-0"
                            >
                              {copiedVpa ? '✓ COPIED' : '📋 COPY'}
                            </button>
                          </div>
                          <p className="text-[10px] text-gray-300 font-mono m-0 mt-1">
                            Scan QR with any UPI app (GPay, PhonePe, Paytm) to pay <strong className="text-cyan-300">{selectedEvent.price}</strong>.
                          </p>
                        </div>
                      </div>

                      {/* 12-Digit UTR Input Field */}
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-mono text-cyan-300 font-bold uppercase block">
                            💳 ENTER 12-DIGIT UPI UTR / REF NUMBER *
                          </label>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            utrInput.trim().length === 12
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          }`}>
                            {utrInput.trim().length === 12 ? '✓ 12 DIGITS COMPLETE' : `${utrInput.trim().length}/12 DIGITS`}
                          </span>
                        </div>
                        <input
                          type="text"
                          maxLength={12}
                          required={(selectedEvent.price_amount ?? 0) > 0}
                          className={`reg-input text-xs font-mono tracking-wider transition-all ${
                            utrInput.trim().length === 12
                              ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                              : 'border-cyan-400/50 text-cyan-300 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,243,255,0.3)]'
                          }`}
                          placeholder="e.g. 420185938210 (12 numeric digits)"
                          value={utrInput}
                          onChange={e => setUtrInput(e.target.value.replace(/[^0-9]/g, ''))}
                        />
                        <div className="text-[10px] text-gray-400 font-mono mt-1 flex items-center justify-between">
                          <span>Found on GPay/PhonePe/Paytm receipt as "UPI Transaction ID" or "Ref No."</span>
                        </div>
                      </div>
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
                    style={{
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(153, 27, 27, 0.6) 100%)',
                      border: '1px solid #ef4444',
                      color: '#fca5a5',
                      cursor: 'not-allowed',
                      opacity: 0.9,
                      boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)'
                    }}
                    disabled={isSubmitting || REGISTRATION_CLOSED}
                  >
                    CLOSED
                  </button>
                </>
              )}
            </form>
          </div>
        </>
      )}
        </div>
      )}
    </PageLayout>
  );
}
