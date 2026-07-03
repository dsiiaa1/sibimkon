import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SIBIMKON — Sistem Informasi Bimbingan Konsultansi Peningkatan Produktivitas",
  description: "Platform terpadu digitalisasi program BIMKON. Pendampingan produktivitas perusahaan berbasis metodologi DMAIC dengan AI Consultant.",
  keywords: "BIMKON, produktivitas, DMAIC, konsultansi, peningkatan produktivitas, SIBIMKON",
  authors: [{ name: "SIBIMKON" }],
  openGraph: {
    title: "SIBIMKON — Link Productive",
    description: "Platform digitalisasi program Bimbingan Konsultansi Peningkatan Produktivitas",
    type: "website",
    locale: "id_ID",
  },
  icons: {
    icon: "/sibimkonicon.png",
    apple: "/sibimkonicon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark">
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
