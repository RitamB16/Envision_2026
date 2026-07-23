import PageLayout from './PageLayout';

interface Props { onBack: () => void; }

export default function Sponsors({ onBack }: Props) {
  return (
    <PageLayout title="SPONSORS / PARTNERS" onBack={onBack}>
      <h2 className="text-2xl text-gray-500 font-light tracking-widest uppercase">Coming Soon</h2>
    </PageLayout>
  );
}
