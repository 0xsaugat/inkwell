import '@fontsource-variable/fraunces'
import '@fontsource-variable/instrument-sans'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Inkwell — Think in pages',
    template: '%s · Inkwell',
  },
  description:
    'A note-taking workspace that pairs a free-form canvas with structured, linked knowledge.',
  applicationName: 'Inkwell',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
