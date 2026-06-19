import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/auth-context";
import { Navigation } from "@/components/ui/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  ),
  applicationName: "CarbonWise",
  title: {
    default: "CarbonWise - Track Less, Reduce More",
    template: "%s | CarbonWise",
  },
  description: "Calculate your carbon footprint, get AI sustainability coaching, track reduction goals, and complete weekly challenges.",
  keywords: [
    "sustainability",
    "carbon footprint",
    "carbon calculator",
    "gemini ai",
    "eco tracker",
    "environmental impact",
    "climate change action",
    "green goals",
    "eco challenges",
    "sustainability coach"
  ],
  authors: [{ name: "CarbonWise Team" }],
  creator: "CarbonWise Team",
  publisher: "CarbonWise",
  openGraph: {
    title: "CarbonWise - Personal Carbon Tracker & AI Coach",
    description: "Calculate your carbon footprint, set actionable eco-goals, and interact with your personal Gemini sustainability coach.",
    type: "website",
    siteName: "CarbonWise",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "CarbonWise Eco Tracker & AI Coach Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CarbonWise - Personal Carbon Tracker & AI Coach",
    description: "Gemini-powered carbon footprint calculator, action planner, and gamified weekly eco-challenges.",
    images: ["/icon-512.png"],
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon-192.png",
    apple: "/icon-512.png",
  },
  appleWebApp: {
    capable: true,
    title: "CarbonWise",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#090d10",
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
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#090d10] text-foreground antialiased selection:bg-brand/20 selection:text-brand-light">
        <AuthProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand focus:text-[#090d10] focus:rounded-xl focus:outline-none font-bold shadow-lg"
          >
            Skip to content
          </a>
          <Navigation />
          <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col focus:outline-none">
            {children}
          </main>
          
          {/* Footer */}
          <footer className="border-t border-white/5 bg-[#070b0e] py-6 text-center text-xs text-gray-500">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p>© {new Date().getFullYear()} CarbonWise. Built for visual excellence, accessibility, and high performance.</p>
              <div className="flex gap-4">
                <span className="text-gray-600">Privacy Policy</span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-600">Terms of Service</span>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
