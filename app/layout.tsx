import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Netizen — Your community, connected',
  description: 'A social space for local communities, conversations, groups, and everyday life.',
  generator: 'Netizen',
  icons: {
    icon: [
      {
        url: '/netgreen.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/netwhite.png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/* Prevent FOUC: set .dark before paint from localStorage / system */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='netizen-ui-mode';var v=localStorage.getItem(k);var d=v==='dark'||(!v&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(v==='system') d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(d){document.documentElement.classList.add('dark');document.documentElement.dataset.theme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.dataset.theme='light';}document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen overflow-x-hidden bg-[#f3f7f5] font-sans text-[#162022] antialiased dark:bg-[#0a1210] dark:text-[#e6ece9]">
        <ThemeProvider>
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
