import { notFound } from 'next/navigation';
import { getPublicConfig } from '@/lib/config';
import { WorkplaceShell } from '@/components/workplace-shell';
import { CashFoundation } from '@/components/cash-foundation';
import { amsterdamWorkDate } from '@/lib/dates';

export const dynamic = 'force-dynamic';
export default function PreviewPage() {
  // Static fiction only. Never use a demo flag to bypass the actual auth guard.
  if (getPublicConfig() || process.env.VERCEL_ENV === 'production' || process.env.NEXT_PUBLIC_APP_ENV === 'production') notFound();
  return <WorkplaceShell name="Voorbeeldmedewerker" role="employee" active="cash" preview><CashFoundation preview date={amsterdamWorkDate()} locations={[
    { id: 'demo-heiloo', name: 'Heiloo', slug: 'heiloo' },
    { id: 'demo-heerhugowaard', name: 'Heerhugowaard', slug: 'heerhugowaard' },
  ]} /></WorkplaceShell>;
}
