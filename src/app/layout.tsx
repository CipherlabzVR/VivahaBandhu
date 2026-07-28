import type { Metadata } from "next";
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
import "./globals.css";

const HERO_LCP_IMG =
  "https://res.cloudinary.com/df52tya8p/image/upload/f_auto,q_auto:good,w_960,c_limit/v1777957492/Picsart_26-05-05_10-30-47-506_gxogmo.webp";

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

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pacifico",
  display: "swap",
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-dancing-script",
  display: "swap",
});

const notoSinhala = Noto_Sans_Sinhala({
  subsets: ["sinhala"],
  weight: ["400", "600", "700"],
  variable: "--font-sinhala",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MyMatch.lk - Find your Perfect Match",
  description: "Join thousands of families who found meaningful connections through our trusted matrimonial platform.",
  themeColor: "#ffa20d",
  icons: {
    icon: "/favicon.png",
  },
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
          href={HERO_LCP_IMG}
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
