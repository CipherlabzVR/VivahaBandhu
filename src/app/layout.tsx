import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Sans_3, Pacifico, Dancing_Script, Noto_Sans_Sinhala } from "next/font/google";
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { MatrimonialNotificationsProvider } from '../context/MatrimonialNotificationsContext';
import { ChatUnreadProvider } from '../context/ChatUnreadContext';
import LoadingScreenWrapper from '../components/LoadingScreenWrapper';
import CorsBootstrap from '../components/CorsBootstrap';
import DeferredChrome from '../components/DeferredChrome';
import GlobalToast from '../components/GlobalToast';
import SmoothScroll from '../components/SmoothScroll';
import { HERO_LCP_IMG_DESKTOP, HERO_LCP_IMG_MOBILE } from '../constants/heroLcp';
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

// WelcomePopup only — do not preload on every page (cuts render-blocking).
const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pacifico",
  display: "swap",
  preload: false,
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-dancing-script",
  display: "swap",
});

// Loaded when language is Sinhala; avoid competing with LCP on default EN.
const notoSinhala = Noto_Sans_Sinhala({
  subsets: ["sinhala"],
  weight: ["400", "600", "700"],
  variable: "--font-sinhala",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "MyMatch.lk - Find your Perfect Match",
  description: "Join thousands of families who found meaningful connections through our trusted matrimonial platform.",
  icons: {
    icon: "/favicon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MyMatch.lk",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link
          rel="preload"
          as="image"
          href={HERO_LCP_IMG_MOBILE}
          media="(max-width: 767px)"
          fetchPriority="high"
        />
        <link
          rel="preload"
          as="image"
          href={HERO_LCP_IMG_DESKTOP}
          media="(min-width: 768px)"
          fetchPriority="high"
        />
      </head>
      <body
        className={`${playfair.variable} ${sourceSans.variable} ${pacifico.variable} ${dancingScript.variable} ${notoSinhala.variable}`}
        suppressHydrationWarning
      >
        <SmoothScroll>
          <CorsBootstrap />
          <AuthProvider>
            <MatrimonialNotificationsProvider>
              <LanguageProvider>
                <ChatUnreadProvider>
                  <LoadingScreenWrapper>
                    {children}
                    <DeferredChrome />
                    <GlobalToast />
                  </LoadingScreenWrapper>
                </ChatUnreadProvider>
              </LanguageProvider>
            </MatrimonialNotificationsProvider>
          </AuthProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
