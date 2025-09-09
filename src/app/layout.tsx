import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from '@/lib/AuthContext'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "ASTRAL-AI Launcher - The Future of Minecraft Modding",
  description: "Visual mod management like never before. Organize, discover, and optimize your Minecraft experience with AI-powered recommendations and conflict detection.",
  keywords: ["minecraft", "mods", "launcher", "fabric", "forge", "AI", "visual", "modding"],
  authors: [{ name: "ASTRAL-AI Team" }],
  creator: "ASTRAL-AI",
  publisher: "ASTRAL-AI",
  robots: "index, follow",
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
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
