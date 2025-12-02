import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fanrae',
  description: 'Monetize your content with Fanrae',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'Fanrae',
    description: 'Monetize your content with Fanrae',
    images: ['/opengraph-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}



