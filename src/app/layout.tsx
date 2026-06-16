import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { PWARegister } from "@/components/pwa-register";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://simon.example.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Simon — Pengelola Keuangan", template: "%s · Simon" },
  description:
    "Simon adalah aplikasi pencatat keuangan gratis untuk mencatat pemasukan-pengeluaran, menghitung laba UMKM otomatis, dan memantau portofolio investasi saham & kripto — lengkap dengan berita pasar.",
  keywords: [
    "aplikasi keuangan",
    "pencatat keuangan",
    "catat pengeluaran",
    "pencatat keuangan pribadi",
    "hitung laba UMKM",
    "laba usaha",
    "aplikasi keuangan bisnis",
    "portofolio investasi",
    "portofolio saham kripto",
    "aplikasi keuangan gratis",
  ],
  authors: [{ name: "Simon" }],
  creator: "Simon",
  publisher: "Simon",
  applicationName: "Simon",
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false, email: false, address: false },
  alternates: { canonical: "/" },
  appleWebApp: {
    capable: true,
    title: "Simon",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Simon",
    url: SITE_URL,
    title: "Simon — Pengelola Keuangan",
    description:
      "Catat keuangan pribadi, hitung laba usaha, dan pantau portofolio investasi dalam satu aplikasi. Gratis, tanpa langganan.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Simon — Pengelola Keuangan",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Simon — Pengelola Keuangan",
    description:
      "Catat keuangan pribadi, hitung laba usaha, dan pantau portofolio investasi dalam satu aplikasi. Gratis.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
        <PWARegister />
      </body>
    </html>
  );
}
