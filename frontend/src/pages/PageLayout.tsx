import React from 'react';

interface Props {
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
  isWide?: boolean;
}

const PageLayout: React.FC<Props> = ({ title, children, isWide }) => {
  return (
    <div 
      className={`glass-panel p-4 sm:p-6 md:p-8 rounded-2xl w-[calc(100%-1.5rem)] max-w-[100vw] overflow-x-hidden flex flex-col items-center gap-5 relative border border-white/10 shadow-2xl hud-interactive ${isWide ? 'max-w-5xl' : 'max-w-lg'} mx-auto box-border my-2 sm:my-4`}
      data-page-title={title}
    >
      {/* Scrollable content container */}
      <div className="w-full text-gray-300 content-gap max-w-full overflow-x-hidden box-border">
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
