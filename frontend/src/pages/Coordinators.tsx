import React, { useState } from 'react';
import PageLayout from './PageLayout';

interface Props {
  onBack: () => void;
}

interface MemberItem {
  name: string;
  role: string;
  phone?: string;
  photoUrl: string;
  imgId: string;
}

interface SectionTheme {
  border: string;
  hoverBorder: string;
  textGlow: string;
  roleText: string;
  pillBg: string;
  pillText: string;
  shadowGlow: string;
  headerGlow: string;
  badgeBg: string;
}

interface CategorySection {
  id: string;
  title: string;
  theme: SectionTheme;
  members: MemberItem[];
}

// 1. FACULTY MEMBERS (Strict Order)
const FACULTY_SECTION: CategorySection = {
  id: 'faculty',
  title: 'DEPARTMENT FACULTY',
  theme: {
    border: 'border-amber-500/60',
    hoverBorder: 'hover:border-amber-300',
    textGlow: 'text-amber-300',
    roleText: 'text-amber-400/90',
    pillBg: 'bg-amber-950/80 border-amber-500/60',
    pillText: 'text-amber-200',
    shadowGlow: 'shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:shadow-[0_0_40px_rgba(245,158,11,0.45)]',
    headerGlow: 'from-amber-400 via-yellow-200 to-amber-500',
    badgeBg: 'bg-amber-500/20 border-amber-400/50 text-amber-300'
  },
  members: [
    {
      name: 'DR. SIDDHARTHA BANERJEE',
      role: 'ASSOCIATE PROFESSOR (HOD)',
      photoUrl: 'https://ibb.co/ycSN2FhM',
      imgId: 'ycSN2FhM'
    },
    {
      name: 'SRI BIBEK RANJAN GHOSH',
      role: 'ASSOCIATE PROFESSOR',
      photoUrl: 'https://ibb.co/0RzpWTRZ',
      imgId: '0RzpWTRZ'
    },
    {
      name: 'DR. SURAJIT GIRI',
      role: 'STATE AIDED COLLEGE TEACHER',
      photoUrl: 'https://ibb.co/Vp3w6LWK',
      imgId: 'Vp3w6LWK'
    },
    {
      name: 'DR. MD. FIROZ ALI',
      role: 'ASSISTANT PROFESSOR',
      photoUrl: 'https://ibb.co/PsdwKnZk',
      imgId: 'PsdwKnZk'
    },
    {
      name: 'SRI DEBASISH SARDAR',
      role: 'STATE AIDED COLLEGE TEACHER',
      photoUrl: 'https://ibb.co/hxVv1hts',
      imgId: 'hxVv1hts'
    }
  ]
};

// 2. COORDINATORS & ORGANISERS (Strict Order & Categories)
const OTHER_SECTIONS: CategorySection[] = [
  {
    id: 'organisers',
    title: 'FEST ORGANISERS',
    theme: {
      border: 'border-cyan-500/60',
      hoverBorder: 'hover:border-cyan-300',
      textGlow: 'text-cyan-300',
      roleText: 'text-cyan-400/90',
      pillBg: 'bg-cyan-950/80 border-cyan-400/60',
      pillText: 'text-cyan-200',
      shadowGlow: 'shadow-[0_0_30px_rgba(0,243,255,0.25)] hover:shadow-[0_0_40px_rgba(0,243,255,0.45)]',
      headerGlow: 'from-cyan-300 via-blue-200 to-cyan-400',
      badgeBg: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
    },
    members: [
      {
        name: 'SUMAN GUCHAIT',
        role: 'FEST ORGANISER',
        phone: '+91 7477623839',
        photoUrl: 'https://ibb.co/zH77702m',
        imgId: 'zH77702m'
      },
      {
        name: 'RITAM BERA',
        role: 'ADMIN / FEST ORGANISER',
        phone: '+91 7718219011',
        photoUrl: 'https://ibb.co/wrhssYSJ',
        imgId: 'wrhssYSJ'
      },
      {
        name: 'JYOTIPRABA PAL',
        role: 'FEST ORGANISER',
        phone: '+91 9734772175',
        photoUrl: 'https://ibb.co/TxSz8pjq',
        imgId: 'TxSz8pjq'
      },
      {
        name: 'ANIRBAN MANDAL',
        role: 'FEST ORGANISER',
        phone: '+91 7384416208',
        photoUrl: 'https://ibb.co/ksdy31VR',
        imgId: 'ksdy31VR'
      },
      {
        name: 'ANIK BHUNIA',
        role: 'FEST ORGANISER',
        phone: '+91 7872169208',
        photoUrl: 'https://ibb.co/QvtNvxSr',
        imgId: 'QvtNvxSr'
      },
      {
        name: 'SUBHAJIT MAHAPATRA',
        role: 'FEST ORGANISER',
        phone: '+91 8389944951',
        photoUrl: 'https://ibb.co/k66M3MrG',
        imgId: 'k66M3MrG'
      },
      {
        name: 'RUDRA PRATAP ROY',
        role: 'FEST ORGANISER',
        phone: '+91 8158093926',
        photoUrl: 'https://ibb.co/7JQwK1mc',
        imgId: '7JQwK1mc'
      }
    ]
  },
  {
    id: 'photography',
    title: 'PHOTOGRAPHY COORDINATORS',
    theme: {
      border: 'border-rose-500/60',
      hoverBorder: 'hover:border-rose-300',
      textGlow: 'text-rose-300',
      roleText: 'text-rose-400/90',
      pillBg: 'bg-rose-950/80 border-rose-400/60',
      pillText: 'text-rose-200',
      shadowGlow: 'shadow-[0_0_30px_rgba(244,63,94,0.25)] hover:shadow-[0_0_40px_rgba(244,63,94,0.45)]',
      headerGlow: 'from-rose-300 via-pink-200 to-rose-400',
      badgeBg: 'bg-rose-500/20 border-rose-400/50 text-rose-300'
    },
    members: [
      {
        name: 'SOUVIK ROY',
        role: 'PHOTOGRAPHY COORDINATOR',
        phone: '+91 8942909735',
        photoUrl: 'https://ibb.co/b5nHSfKT',
        imgId: 'b5nHSfKT'
      },
      {
        name: 'RAJESH TIKADAR',
        role: 'PHOTOGRAPHY COORDINATOR',
        phone: '+91 9733811590',
        photoUrl: 'https://ibb.co/RTGQxj84',
        imgId: 'RTGQxj84'
      },
      {
        name: 'SABUJSOM DAS',
        role: 'PHOTOGRAPHY COORDINATOR',
        phone: '+91 7679856455',
        photoUrl: 'https://ibb.co/spQ29RGp',
        imgId: 'spQ29RGp'
      },
      {
        name: 'Subhadeep Samai',
        role: 'PHOTOGRAPHY COORDINATOR',
        phone: '+91 9832217168',
        photoUrl: 'https://ibb.co/D05KZSc',
        imgId: 'D05KZSc'
      }
    ]
  },
  {
    id: 'chess',
    title: 'CHESS COORDINATORS',
    theme: {
      border: 'border-emerald-500/60',
      hoverBorder: 'hover:border-emerald-300',
      textGlow: 'text-emerald-300',
      roleText: 'text-emerald-400/90',
      pillBg: 'bg-emerald-950/80 border-emerald-400/60',
      pillText: 'text-emerald-200',
      shadowGlow: 'shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:shadow-[0_0_40px_rgba(16,185,129,0.45)]',
      headerGlow: 'from-emerald-300 via-teal-200 to-emerald-400',
      badgeBg: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
    },
    members: [
      {
        name: 'SAUMYARUP SARKAR',
        role: 'CHESS COORDINATOR',
        phone: '+91 8293355649',
        photoUrl: 'https://ibb.co/CKg4j2XB',
        imgId: 'CKg4j2XB'
      },
      {
        name: 'HIRAK JYOTI SARKAR',
        role: 'CHESS COORDINATOR',
        phone: '+91 9907485141',
        photoUrl: 'hhttps://ibb.co/b5DLByzW',
        imgId: 'b5DLByzW'
      },
      {
        name: 'JYOTIPRABA PAL',
        role: 'CHESS COORDINATOR',
        phone: '+91 9734772175',
        photoUrl: 'https://ibb.co/TxSz8pjq',
        imgId: 'TxSz8pjq'
      }
    ]
  },
  {
    id: 'auction',
    title: 'AUCTION COORDINATORS',
    theme: {
      border: 'border-purple-500/60',
      hoverBorder: 'hover:border-purple-300',
      textGlow: 'text-purple-300',
      roleText: 'text-purple-400/90',
      pillBg: 'bg-purple-950/80 border-purple-400/60',
      pillText: 'text-purple-200',
      shadowGlow: 'shadow-[0_0_30px_rgba(168,85,247,0.25)] hover:shadow-[0_0_40px_rgba(168,85,247,0.45)]',
      headerGlow: 'from-purple-300 via-fuchsia-200 to-purple-400',
      badgeBg: 'bg-purple-500/20 border-purple-400/50 text-purple-300'
    },
    members: [
      {
        name: 'RUDRA PRATAP ROY',
        role: 'AUCTION COORDINATOR',
        phone: '+91 8158093926',
        photoUrl: 'https://ibb.co/7JQwK1mc',
        imgId: '7JQwK1mc'
      },
      {
        name: 'ANIK BHUNIA',
        role: 'AUCTION COORDINATOR',
        phone: '+91 7872169208',
        photoUrl: 'https://ibb.co/QvtNvxSr',
        imgId: 'QvtNvxSr'
      }
    ]
  },
  {
    id: 'quiz',
    title: 'QUIZ COORDINATORS',
    theme: {
      border: 'border-indigo-500/60',
      hoverBorder: 'hover:border-indigo-300',
      textGlow: 'text-indigo-300',
      roleText: 'text-indigo-400/90',
      pillBg: 'bg-indigo-950/80 border-indigo-400/60',
      pillText: 'text-indigo-200',
      shadowGlow: 'shadow-[0_0_30px_rgba(99,102,241,0.25)] hover:shadow-[0_0_40px_rgba(99,102,241,0.45)]',
      headerGlow: 'from-indigo-300 via-sky-200 to-indigo-400',
      badgeBg: 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300'
    },
    members: [
      {
        name: 'SUBHAJIT MAHAPATRA',
        role: 'QUIZ COORDINATOR',
        phone: '+91 8389944951',
        photoUrl: 'https://ibb.co/k66M3MrG',
        imgId: 'k66M3MrG'
      },
      {
        name: 'DEBAYAN ROY',
        role: 'QUIZ COORDINATOR',
        phone: '+91 9062084778',
        photoUrl: 'https://ibb.co/C3JrGQzx',
        imgId: 'C3JrGQzx'
      }
    ]
  },
  {
    id: 'coding',
    title: 'CODING COORDINATORS',
    theme: {
      border: 'border-cyan-400/70',
      hoverBorder: 'hover:border-cyan-200',
      textGlow: 'text-cyan-200',
      roleText: 'text-cyan-300/90',
      pillBg: 'bg-cyan-950/85 border-cyan-300/60',
      pillText: 'text-cyan-100',
      shadowGlow: 'shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)]',
      headerGlow: 'from-cyan-200 via-blue-100 to-cyan-300',
      badgeBg: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
    },
    members: [
      {
        name: 'RITAM BERA',
        role: 'CODING COORDINATOR',
        phone: '+91 7718219011',
        photoUrl: 'https://ibb.co/wrhssYSJ',
        imgId: 'wrhssYSJ'
      },
      {
        name: 'JEET BHATTACHARJEE',
        role: 'CODING COORDINATOR',
        phone: '+91 8170909952',
        photoUrl: 'https://ibb.co/G4QPb3pj',
        imgId: 'G4QPb3pj'
      }
    ]
  }
];

// High-Style Chamfered Cyberpunk Card Component (matching reference layout with vivid theme support)
const MemberCard: React.FC<{ member: MemberItem; theme: SectionTheme }> = ({ member, theme }) => {
  const [imgSrc, setImgSrc] = useState<string>(`https://i.ibb.co/${member.imgId}/image.jpg`);
  const [hasError, setHasError] = useState<boolean>(false);

  const getInitials = (str: string) => {
    const parts = str.replace(/DR\.|SRI/g, '').trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return parts[0] ? parts[0].substring(0, 2).toUpperCase() : 'EV';
  };

  return (
    <div
      style={{
        clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
      }}
      className={`relative p-6 sm:p-7 bg-slate-950/90 backdrop-blur-2xl border ${theme.border} ${theme.hoverBorder} ${theme.shadowGlow} flex flex-col items-center text-center justify-between transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] w-full box-sizing-border group`}
    >
      {/* High-Tech Top Corner Bracket Accents */}
      <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-cyan-400/60"></div>
      <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-cyan-400/60"></div>

      {/* 1. TOP: Name & Role */}
      <div className="space-y-1.5 w-full mb-3">
        <h3 className="text-base sm:text-lg font-black text-white font-mono tracking-wider uppercase leading-tight group-hover:text-cyan-200 transition-colors">
          {member.name}
        </h3>
        <p className={`text-xs font-mono font-bold uppercase tracking-widest ${theme.roleText}`}>
          {member.role}
        </p>
      </div>

      {/* 2. CENTER: Portrait Photo Frame with Neon Glow */}
      <a
        href={member.photoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`relative my-3 w-32 h-36 sm:w-36 sm:h-40 rounded-xl overflow-hidden border ${theme.border} shadow-lg group-hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] flex items-center justify-center bg-black/70 shrink-0 transition-all duration-300`}
        title={`View photo of ${member.name}`}
      >
        {!hasError ? (
          <img
            src={imgSrc}
            alt={member.name}
            onError={() => {
              if (!hasError) {
                setImgSrc(`https://i.ibb.co/${member.imgId}/photo.jpg`);
                setHasError(true);
              }
            }}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950 flex flex-col items-center justify-center p-2 text-center">
            <span className={`text-2xl font-extrabold font-mono ${theme.textGlow} tracking-wider`}>
              {getInitials(member.name)}
            </span>
          </div>
        )}
      </a>

      {/* 3. BOTTOM: Mobile Number Container (NO ICONS strictly maintained) */}
      {member.phone ? (
        <div
          style={{
            clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
          }}
          className={`w-full mt-4 py-2 px-3 ${theme.pillBg} ${theme.pillText} text-xs sm:text-sm font-mono font-extrabold tracking-widest text-center shadow-inner transition-all duration-300 group-hover:scale-[1.02]`}
        >
          {member.phone}
        </div>
      ) : (
        <div className="w-full mt-4 py-2 px-3 text-transparent text-xs font-mono select-none">
          -
        </div>
      )}
    </div>
  );
};

export default function Coordinators({ onBack }: Props) {
  return (
    <PageLayout title="ABOUT US" onBack={onBack}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-16 text-center">

        {/* Sleek Top Header Label */}
        <div className="relative pt-2 pb-4 flex flex-col items-center justify-center text-center space-y-2">
          <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-purple-300 font-mono tracking-widest uppercase drop-shadow-[0_0_25px_rgba(0,243,255,0.4)]">
            ABOUT US
          </h1>
          <p className="text-xs sm:text-sm font-mono font-bold text-cyan-300/90 tracking-wider uppercase max-w-2xl px-2">
            RAMAKRISHNA MISSION RESIDENTIAL COLLEGE (AUTONOMOUS), NARENDRAPUR
          </p>
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full shadow-[0_0_15px_rgba(0,243,255,0.6)] mt-2"></div>
        </div>

        {/* SECTION 1: FACULTY MEMBERS */}
        <div className="space-y-8">
          <div className="relative flex flex-col items-center">
            <h2 className={`text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${FACULTY_SECTION.theme.headerGlow} font-mono tracking-widest uppercase text-center pb-3`}>
              {FACULTY_SECTION.title}
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full shadow-[0_0_15px_rgba(245,158,11,0.6)]"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-items-center">
            {FACULTY_SECTION.members.map((mem, idx) => (
              <MemberCard key={idx} member={mem} theme={FACULTY_SECTION.theme} />
            ))}
          </div>
        </div>

        {/* SECTIONS 2-7: ORGANISERS AND EVENT COORDINATORS (STRICT ORDER MAINTAINED) */}
        {OTHER_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-8 pt-4">
            {/* Category Header with Glow Underline */}
            <div className="relative flex flex-col items-center">
              <h2 className={`text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${section.theme.headerGlow} font-mono tracking-widest uppercase text-center pb-3`}>
                {section.title}
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full shadow-[0_0_15px_rgba(0,243,255,0.6)]"></div>
            </div>

            {/* Grid of Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-items-center">
              {section.members.map((mem, idx) => (
                <MemberCard key={idx} member={mem} theme={section.theme} />
              ))}
            </div>
          </div>
        ))}

      </div>
    </PageLayout>
  );
}
