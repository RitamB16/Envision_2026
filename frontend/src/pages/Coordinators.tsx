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

interface CategorySection {
  id: string;
  title: string;
  members: MemberItem[];
}

// 1. FACULTY MEMBERS (Strict Order)
const FACULTY_SECTION: CategorySection = {
  id: 'faculty',
  title: 'DEPARTMENT FACULTY',
  members: [
    {
      name: 'SRI BIBEK RANJAN GHOSH',
      role: 'ASSOCIATE PROFESSOR',
      photoUrl: 'https://ibb.co/0RzpWTRZ',
      imgId: '0RzpWTRZ'
    },
    {
      name: 'DR. SIDDHARTHA BANERJEE',
      role: 'ASSOCIATE PROFESSOR (HOD)',
      photoUrl: 'https://ibb.co/ycSN2FhM',
      imgId: 'ycSN2FhM'
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
        role: 'ADMIN / LEAD ORGANISER',
        phone: '+91 7718219011',
        photoUrl: 'https://ibb.co/NkyVPK9',
        imgId: 'NkyVPK9'
      },
      {
        name: 'JYOTIPRABA PAL',
        role: 'FEST ORGANISER',
        phone: '+91 9734772175',
        photoUrl: 'https://ibb.co/9m9Bdjyx',
        imgId: '9m9Bdjyx'
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
    members: [
      {
        name: 'RAJESH TIKADAR',
        role: 'PHOTOGRAPHY COORDINATOR',
        phone: '+91 9733811590',
        photoUrl: 'https://ibb.co/RTGQxj84',
        imgId: 'RTGQxj84'
      },
      {
        name: 'SOUVIK ROY',
        role: 'PHOTOGRAPHY COORDINATOR',
        phone: '+91 8942909735',
        photoUrl: 'https://ibb.co/b5nHSfKT',
        imgId: 'b5nHSfKT'
      },
      {
        name: 'SABUJSOM DAS',
        role: 'PHOTOGRAPHY COORDINATOR',
        phone: '+91 7679856455',
        photoUrl: 'https://ibb.co/spQ29RGp',
        imgId: 'spQ29RGp'
      }
    ]
  },
  {
    id: 'chess',
    title: 'CHESS COORDINATORS',
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
        photoUrl: 'https://ibb.co/HT3h4tfph',
        imgId: 'HT3h4tfph'
      },
      {
        name: 'JYOTIPRABA PAL',
        role: 'CHESS COORDINATOR',
        phone: '+91 9734772175',
        photoUrl: 'https://ibb.co/9m9Bdjyx',
        imgId: '9m9Bdjyx'
      }
    ]
  },
  {
    id: 'auction',
    title: 'AUCTION COORDINATORS',
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
    members: [
      {
        name: 'RITAM BERA',
        role: 'CODING COORDINATOR',
        phone: '+91 7718219011',
        photoUrl: 'https://ibb.co/NkyVPK9',
        imgId: 'NkyVPK9'
      },
      {
        name: 'JEET BHATTACHARJEE',
        role: 'CODING COORDINATOR',
        phone: '+91 8170909952',
        photoUrl: 'https://ibb.co/rRN3FWTz',
        imgId: 'rRN3FWTz'
      }
    ]
  }
];

// Chamfered Cyberpunk Card Component (matching provided reference layout)
const MemberCard: React.FC<{ member: MemberItem }> = ({ member }) => {
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
      className="relative p-6 sm:p-7 bg-slate-950/85 backdrop-blur-xl border border-cyan-500/50 shadow-[0_0_25px_rgba(0,243,255,0.2)] flex flex-col items-center text-center justify-between transition-all duration-300 hover:border-cyan-300 hover:shadow-[0_0_35px_rgba(0,243,255,0.35)] hover:-translate-y-1 w-full box-sizing-border"
    >
      {/* 1. TOP: Name & Role */}
      <div className="space-y-1.5 w-full mb-4">
        <h3 className="text-base sm:text-lg font-black text-white font-mono tracking-wider uppercase leading-tight">
          {member.name}
        </h3>
        <p className="text-xs font-mono font-semibold text-cyan-300/90 uppercase tracking-widest">
          {member.role}
        </p>
      </div>

      {/* 2. CENTER: Portrait Photo Frame */}
      <a
        href={member.photoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative my-3 w-32 h-36 sm:w-36 sm:h-40 rounded-xl overflow-hidden border border-cyan-400/40 shadow-md group flex items-center justify-center bg-black/60 shrink-0"
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
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950 flex flex-col items-center justify-center p-2 text-center">
            <span className="text-2xl font-extrabold font-mono text-cyan-300 tracking-wider">
              {getInitials(member.name)}
            </span>
          </div>
        )}
      </a>

      {/* 3. BOTTOM: Mobile Number Container (NO ICONS as explicitly requested) */}
      {member.phone ? (
        <div
          style={{
            clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
          }}
          className="w-full mt-4 py-2 px-3 bg-cyan-950/70 border border-cyan-400/50 text-cyan-200 text-xs sm:text-sm font-mono font-extrabold tracking-widest text-center shadow-inner"
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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-14 text-center">

        {/* SECTION 1: FACULTY MEMBERS */}
        <div className="space-y-8">
          <h2 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-widest uppercase text-center border-b border-cyan-500/30 pb-4">
            {FACULTY_SECTION.title}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-items-center">
            {FACULTY_SECTION.members.map((mem, idx) => (
              <MemberCard key={idx} member={mem} />
            ))}
          </div>
        </div>

        {/* SECTIONS 2-7: ORGANISERS AND EVENT COORDINATORS (STRICT ORDER) */}
        {OTHER_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-8 pt-4">
            {/* Category Header */}
            <h2 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-widest uppercase text-center border-b border-cyan-500/30 pb-4">
              {section.title}
            </h2>

            {/* Grid of Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-items-center">
              {section.members.map((mem, idx) => (
                <MemberCard key={idx} member={mem} />
              ))}
            </div>
          </div>
        ))}

      </div>
    </PageLayout>
  );
}
