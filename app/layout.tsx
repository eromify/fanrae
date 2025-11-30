import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fanrae - Creator Platform',
  description: 'Monetize your content with Fanrae',
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



