import PageLayout from './PageLayout';

interface Props { onBack: () => void; }

export default function Alumni({ onBack }: Props) {
  return (
    <PageLayout title="ALUMNI" onBack={onBack}>
      <h2 className="text-2xl text-gray-500 font-light tracking-widest uppercase">Coming Soon</h2>
    </PageLayout>
  );
}
