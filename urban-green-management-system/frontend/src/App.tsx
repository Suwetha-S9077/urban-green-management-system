import { AppLayout } from '@/components/layout/AppLayout';
import { SystemStatusCard } from '@/features/system-status/SystemStatusCard';

export default function App() {
  return (
    <AppLayout>
      <SystemStatusCard />
    </AppLayout>
  );
}
