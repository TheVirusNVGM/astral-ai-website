import type { Metadata } from "next"
import { Space_Grotesk, Syne, Archivo_Black } from "next/font/google"
import "./globals.css"
import { AuthProvider } from '@/lib/AuthContext'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-heavy',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "ASTRAL-AI Launcher - The Future of Minecraft Modding",
  description: "Visual mod management like never before. Organize, discover, and optimize your Minecraft experience with AI-powered recommendations and conflict detection.",
  keywords: ["minecraft", "mods", "launcher", "fabric", "forge", "AI", "visual", "modding"],
  authors: [{ name: "ASTRAL-AI Team" }],
  creator: "ASTRAL-AI",
  publisher: "ASTRAL-AI",
  robots: "index, follow",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.png',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/favicon.png',
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "ASTRAL-AI Launcher - The Future of Minecraft Modding",
    description: "Visual mod management like never before. Organize, discover, and optimize your Minecraft experience with AI-powered recommendations.",
    siteName: "ASTRAL-AI Launcher",
  },
  twitter: {
    card: "summary_large_image",
    title: "ASTRAL-AI Launcher - The Future of Minecraft Modding",
    description: "Visual mod management like never before. Organize, discover, and optimize your Minecraft experience with AI-powered recommendations.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html 
      lang="en" 
      className={`${spaceGrotesk.variable} ${syne.variable} ${archivoBlack.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
