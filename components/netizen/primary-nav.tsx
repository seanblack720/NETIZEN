"use client";

import type { NavId } from "@/lib/netizen-data";

/**
 * The tab row now lives inside <Header /> (header.tsx) so the logo row and the
 * tabs are one fixed bar. This stub is kept only so existing imports keep working
 * and the tabs do not render twice. You can delete this file once AppShell no
 * longer imports PrimaryNav.
 */
export function PrimaryNav(_props: { active: NavId; onNavigate: (id: NavId) => void }) {
  return null;
}