import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
