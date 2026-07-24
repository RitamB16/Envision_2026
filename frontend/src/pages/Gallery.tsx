import React, { useState } from 'react';
import PageLayout from './PageLayout';

interface Props {
  onBack: () => void;
}

interface GalleryItem {
  id: string;
  title: string;
  category: 'AUCTION' | 'CODING' | 'NORMAL' | 'ENDING PIC' | 'QUIZ' | 'SPEECH';
  src: string;
  fallbackUrl: string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  // AUCTION
  {
    id: 'auction-1',
    title: 'BIDQUEST AUCTION STAGE',
    category: 'AUCTION',
    src: 'https://i.ibb.co/8gfDwQnp/AUTION2.jpg',
    fallbackUrl: 'https://ibb.co/m52CKPrw'
  },
  {
    id: 'auction-2',
    title: 'BIDQUEST AUCTION BIDDING',
    category: 'AUCTION',
    src: 'https://i.ibb.co/Jw6m69HN/AUTION1.jpg',
    fallbackUrl: 'https://ibb.co/S4Y5YzB2'
  },
  {
    id: 'auction-3',
    title: 'BIDQUEST AUCTION WINNERS',
    category: 'AUCTION',
    src: 'https://i.ibb.co/gZfJWcBB/AUTION.jpg',
    fallbackUrl: 'https://ibb.co/7tZKp066'
  },

  // CODING
  {
    id: 'coding-1',
    title: 'SYNTAXX CODING HACKATHON',
    category: 'CODING',
    src: 'https://i.ibb.co/gZMnKtZ4/CODING.jpg',
    fallbackUrl: 'https://ibb.co/whNvmphc'
  },

  // NORMAL
  {
    id: 'normal-1',
    title: 'FESTIVAL AMBIENCE & CAMPUS',
    category: 'NORMAL',
    src: 'https://i.ibb.co/m51Vw4YV/NORMAL.jpg',
    fallbackUrl: 'https://ibb.co/ZztpPxwp'
  },
  {
    id: 'normal-2',
    title: 'CAMPUS CORRIDORS & LIGHTS',
    category: 'NORMAL',
    src: 'https://i.ibb.co/ZR5VWvHg/NORMAL1.jpg',
    fallbackUrl: 'https://ibb.co/rKYm4qbp'
  },
  {
    id: 'normal-3',
    title: 'STUDENT CELEBRATIONS',
    category: 'NORMAL',
    src: 'https://i.ibb.co/fYzQjSnh/NORMAL2.jpg',
    fallbackUrl: 'https://ibb.co/jvPHn5Wc'
  },
  {
    id: 'normal-4',
    title: 'CAMPUS DECORATIONS',
    category: 'NORMAL',
    src: 'https://i.ibb.co/FdSYrNm/NORMAL3.jpg',
    fallbackUrl: 'https://ibb.co/CSk9cNm'
  },
  {
    id: 'normal-5',
    title: 'EVENING TECH VIBES',
    category: 'NORMAL',
    src: 'https://i.ibb.co/5XSwmCpH/NORMAL4.jpg',
    fallbackUrl: 'https://ibb.co/SDMGbHYC'
  },

  // ENDING PIC / HIGHLIGHTS
  {
    id: 'ending-1',
    title: 'VALEDICTORY GRAND FINALE',
    category: 'ENDING PIC',
    src: 'https://i.ibb.co/Tx4yTTV3/ending-group-pic.jpg',
    fallbackUrl: 'https://ibb.co/zTXd55yv'
  },
  {
    id: 'ending-2',
    title: 'ORGANIZING TEAM MEMORIES',
    category: 'ENDING PIC',
    src: 'https://i.ibb.co/YFNZGJGY/ENDING-PIC-1.jpg',
    fallbackUrl: 'https://ibb.co/tTHX5n5k'
  },

  // QUIZ
  {
    id: 'quiz-1',
    title: 'MINDSPARK TRIVIA ROUND',
    category: 'QUIZ',
    src: 'https://i.ibb.co/8LWKP7wZ/QUIZ.jpg',
    fallbackUrl: 'https://ibb.co/RkxvQDKw'
  },
  {
    id: 'quiz-2',
    title: 'MINDSPARK FINAL CHAMPIONS',
    category: 'QUIZ',
    src: 'https://i.ibb.co/20fCcQMS/QUIZ1.jpg',
    fallbackUrl: 'https://ibb.co/ZRkFcPgS'
  },

  // SPEECH
  {
    id: 'speech-1',
    title: 'INSPIRATIONAL KEYNOTE ADDRESS',
    category: 'SPEECH',
    src: 'https://i.ibb.co/xKXYvk10/SPEECH-BG-SIR.jpg',
    fallbackUrl: 'https://ibb.co/bjQFh0sZ'
  }
];

const CATEGORIES = ['ALL', 'AUCTION', 'CODING', 'QUIZ', 'SPEECH', 'NORMAL', 'ENDING PIC'] as const;

export default function Gallery({ onBack }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeModalIdx, setActiveModalIdx] = useState<number | null>(null);

  const filteredItems = selectedCategory === 'ALL'
    ? GALLERY_ITEMS
    : GALLERY_ITEMS.filter(item => item.category === selectedCategory);

  const activeItem = activeModalIdx !== null ? filteredItems[activeModalIdx] : null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeModalIdx !== null) {
      setActiveModalIdx((activeModalIdx - 1 + filteredItems.length) % filteredItems.length);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeModalIdx !== null) {
      setActiveModalIdx((activeModalIdx + 1) % filteredItems.length);
    }
  };

  return (
    <PageLayout title="FESTIVAL GALLERY" onBack={onBack}>
      <style>{`
        .gallery-container {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .category-tab-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          justify-content: center;
          margin-bottom: 2rem;
        }

        .category-tab-btn {
          background: rgba(10, 6, 22, 0.6);
          border: 1px solid rgba(0, 243, 255, 0.25);
          color: rgba(255, 255, 255, 0.7);
          padding: 0.5rem 1rem;
          font-family: 'Orbitron', sans-serif;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.25s ease;
          backdrop-filter: blur(8px);
        }

        .category-tab-btn:hover {
          color: #ffffff;
          border-color: #00f3ff;
          box-shadow: 0 0 15px rgba(0, 243, 255, 0.3);
          transform: translateY(-1px);
        }

        .category-tab-btn.active {
          background: linear-gradient(135deg, rgba(0, 243, 255, 0.25) 0%, rgba(168, 85, 247, 0.35) 100%);
          border-color: #00f3ff;
          color: #ffffff;
          box-shadow: 0 0 20px rgba(0, 243, 255, 0.4);
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
        }

        /* 4:3 Block Frame Styling */
        .frame-4by3-wrapper {
          position: relative;
          aspect-ratio: 4 / 3;
          width: 100%;
          border-radius: 14px;
          overflow: hidden;
          background: #080414;
          border: 1px solid rgba(0, 243, 255, 0.25);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .frame-4by3-wrapper:hover {
          transform: translateY(-4px) scale(1.02);
          border-color: #00f3ff;
          box-shadow: 0 0 25px rgba(0, 243, 255, 0.4);
        }

        .frame-4by3-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.5s ease;
        }

        .frame-4by3-wrapper:hover .frame-4by3-img {
          transform: scale(1.06);
        }

        .frame-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(3, 1, 12, 0.9) 0%, rgba(3, 1, 12, 0.1) 60%, transparent 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 0.85rem;
          opacity: 0.9;
          transition: opacity 0.3s ease;
        }

        .frame-4by3-wrapper:hover .frame-overlay {
          opacity: 1;
        }

        .badge-tag {
          align-self: flex-start;
          font-family: 'Orbitron', sans-serif;
          font-size: 0.62rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          color: #d8b4fe;
          background: rgba(0, 0, 0, 0.75);
          border: 1px solid rgba(168, 85, 247, 0.5);
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          backdrop-filter: blur(6px);
        }

        .frame-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 0.78rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
          margin: 0;
        }

        /* Lightbox Modal */
        .lightbox-backdrop {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: rgba(3, 1, 12, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1.5rem;
        }

        .lightbox-card {
          position: relative;
          max-width: 900px;
          width: 100%;
          background: rgba(10, 6, 22, 0.95);
          border: 1px solid rgba(0, 243, 255, 0.4);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 0 50px rgba(0, 243, 255, 0.25);
          display: flex;
          flex-direction: column;
        }

        .lightbox-img-wrapper {
          position: relative;
          aspect-ratio: 4 / 3;
          width: 100%;
          background: #000000;
        }

        .lightbox-img-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .lightbox-footer {
          padding: 1rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(5, 2, 12, 0.9);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.7);
          border: 1px solid rgba(0, 243, 255, 0.5);
          color: #00f3ff;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 10;
        }

        .nav-btn:hover {
          background: rgba(0, 243, 255, 0.2);
          box-shadow: 0 0 15px rgba(0, 243, 255, 0.5);
        }

        .nav-btn.prev { left: 1rem; }
        .nav-btn.next { right: 1rem; }

        .close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid rgba(239, 68, 68, 0.5);
          color: #ef4444;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 20;
          font-weight: bold;
        }

        .close-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
        }
      `}</style>

      <div className="gallery-container">
        {/* Category Filter Tabs */}
        <div className="category-tab-bar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`category-tab-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'ENDING PIC' ? 'HIGHLIGHTS' : cat}
            </button>
          ))}
        </div>

        {/* 4:3 Aspect Ratio Photo Grid */}
        <div className="gallery-grid">
          {filteredItems.map((item, idx) => (
            <div
              key={item.id}
              className="frame-4by3-wrapper"
              onClick={() => setActiveModalIdx(idx)}
            >
              <img
                src={item.src}
                alt={item.title}
                className="frame-4by3-img"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = item.fallbackUrl;
                }}
              />
              <div className="frame-overlay">
                <span className="badge-tag">{item.category}</span>
                <h4 className="frame-title">{item.title}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {activeItem && activeModalIdx !== null && (
        <div className="lightbox-backdrop" onClick={() => setActiveModalIdx(null)}>
          <div className="lightbox-card" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setActiveModalIdx(null)}>✕</button>

            <button className="nav-btn prev" onClick={handlePrev}>❮</button>
            <button className="nav-btn next" onClick={handleNext}>❯</button>

            <div className="lightbox-img-wrapper">
              <img
                src={activeItem.src}
                alt={activeItem.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = activeItem.fallbackUrl;
                }}
              />
            </div>

            <div className="lightbox-footer">
              <div>
                <span className="badge-tag mb-1 inline-block">{activeItem.category}</span>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  {activeItem.title}
                </h3>
              </div>
              <a
                href={activeItem.fallbackUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold hover:bg-cyan-900/80 transition-all"
              >
                OPEN HD ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
