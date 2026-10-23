import { notFound } from 'next/navigation'
import { destinations } from '@/lib/netizen-data'
import { SectionPage } from '@/components/netizen/section-page'
export function generateStaticParams() { return destinations.filter((item) => item.id !== 'feed').map((item) => ({ section: item.id })) }
export default async function SectionRoute({ params }: { params: Promise<{ section: string }> }) { const { section } = await params; if (!destinations.some((item) => item.id === section && item.id !== 'feed')) notFound(); return <SectionPage section={section} /> }
