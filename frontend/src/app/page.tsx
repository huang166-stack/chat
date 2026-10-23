import { Advantages } from '@/components/marketing/advantages';
import { Capabilities } from '@/components/marketing/capabilities';
import { Hero } from '@/components/marketing/hero';
import { MarketingShell } from '@/components/marketing/marketing-shell';
import { Pricing } from '@/components/marketing/pricing';
import { ProductShowcase } from '@/components/marketing/product-showcase';
import { Scenarios } from '@/components/marketing/scenarios';

export default function HomePage() {
  return (
    <MarketingShell>
      <main>
        <Hero />
        <ProductShowcase />
        <Capabilities />
        <Advantages />
        <Scenarios />
        <Pricing />
      </main>
    </MarketingShell>
  );
}
