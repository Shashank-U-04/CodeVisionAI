'use client';

/**
 * Back-compat shim — the canonical nav now lives in components/site/SiteNav.
 * All public routes (landing + learn + docs + about + changelog) consume the
 * same component. This file re-exports it (and the brand logo) so existing
 * imports continue to work without refactor.
 */

export { SiteNav as Nav, CodeVisionLogo } from '@/components/site/SiteNav';
