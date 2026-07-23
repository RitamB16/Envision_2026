import PageLayout from './PageLayout';

interface Props { onBack: () => void; }

export default function Gallery({ onBack }: Props) {
  return (
    <PageLayout title="GALLERY" onBack={onBack}>
      <h2 className="text-2xl text-gray-500 font-light tracking-widest uppercase">Coming Soon</h2>
      <a href="https://ibb.co/x82K8HdS"><img src="https://i.ibb.co/M5gy56QD/building-Front-00ea1c1d3dc2f2bf1c5f.png" alt="building-Front-00ea1c1d3dc2f2bf1c5f" /></a>
    </PageLayout>
  );
}
