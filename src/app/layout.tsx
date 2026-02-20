import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3, Pacifico } from "next/font/google";
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
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

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pacifico",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VivahaBandhu - Find Your Perfect Match",
  description: "Join thousands of families who found meaningful connections through our trusted matrimonial platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&family=Great+Vibes&family=Pacifico&family=Playwrite+AT:ital,wght@0,100..400;1,100..400&family=Playwrite+CU:wght@100..400&family=Playwrite+Guides:wght@100..400&family=Saira:ital,wght@0,100..900;1,100..900&family=Syncopate:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${playfair.variable} ${sourceSans.variable} ${pacifico.variable}`} suppressHydrationWarning>
        <AuthProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
