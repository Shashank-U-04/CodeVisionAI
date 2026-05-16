'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { Nav } from '@/components/landing/Nav';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { StatsBar } from '@/components/landing/StatsBar';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { CTASection } from '@/components/landing/CTASection';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function LandingPage() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div style={{ background: 'var(--cv-bg)', color: 'var(--cv-text)', fontFamily: 'var(--cv-font)', overflowX: 'hidden' }}>
      <Nav activePage="home" />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsBar />
      <TestimonialsSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
