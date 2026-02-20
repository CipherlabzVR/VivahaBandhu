'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Language = 'en' | 'si';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations: Record<Language, Record<string, string>> = {
  en: {
    'browseProfiles': 'Browse Profiles',
    'aboutUs': 'About Us',
    'successStories': 'Success Stories',
    'contactUs': 'Contact Us',
    'login': 'Login',
    'registerFree': 'Register Free',
    'myProfile': 'My Profile',
    'settings': 'Settings',
    'logout': 'Logout',
    'heroTitle': 'Find Your Perfect Life Partner with Confidence',
    'heroTitlePerfect': 'Perfect Life',
    'heroTitlePartner': 'Partner',
    'heroDescription': 'Join thousands of families who found meaningful connections through our trusted matrimonial platform. Verified profiles, secure communication, and dedicated matchmaking support.',
    'createFreeProfile': 'Create Free Profile',
    'searchProfiles': 'Search Profiles',
    'verifiedProfiles': 'Verified Profiles',
    'successStoriesCount': 'Success Stories',
    'trustedMatchmakers': 'Trusted Matchmakers',
    'quickSearch': 'Quick Search',
    'imLookingFor': "I'm looking for",
    'ageFrom': 'Age From',
    'ageTo': 'Age To',
    'religion': 'Religion',
    'district': 'District',
    'searchNow': 'Search Now',
    // Features Section
    'findTheOne': 'Find the One',
    'findRealConnection': 'Find real connection',
    'featuresDescription': "If you're serious about finding your life partner, VivahaBandhu is for you. With one of the largest networks of verified profiles in Sri Lanka, connecting families and finding your perfect match has never been more trusted and secure.",
    'familyValues': 'Family Values & Cultural Understanding',
    'familyValuesDesc': 'We respect and understand your family traditions, cultural background, and values to find matches that align with your expectations and beliefs.',
    'verifiedTrusted': 'Verified & Trusted Profiles',
    'verifiedTrustedDesc': 'Every profile is thoroughly verified for authenticity. We ensure background checks, family verification, and genuine information for your peace of mind.',
    'personalMatchmaking': 'Personal Matchmaking Consultation',
    'personalMatchmakingDesc': 'Our experienced matchmakers conduct detailed consultations to understand your preferences, family expectations, and create a personalized matching strategy.',
    // How It Works
    'howItWorks': 'How It Works',
    'howItWorksDesc': 'Finding your life partner is easy with our simple 4-step process.',
    'createAccount': 'Create Account',
    'createAccountDesc': 'Register free and set up your account with basic details',
    'createProfile': 'Create Profile',
    'createProfileDesc': 'Add detailed profile information for yourself or family member',
    'browseMatch': 'Browse & Match',
    'browseMatchDesc': 'Search profiles and get smart suggestions based on preferences',
    'connect': 'Connect',
    'connectDesc': 'Express interest and connect when both parties accept',
    // Profiles Section
    'featuredProfiles': 'Featured Profiles',
    'featuredProfilesDesc': 'Browse through our verified profiles and find your perfect match today.',
    'verified': '✓ Verified',
    'match': 'Match',
    'viewAllProfiles': 'View All Profiles →',
    'subscribeToView': 'Subscribe to view full profile details',
    'upgradeNow': 'Upgrade Now',
    // Top Profiles
    'topLiveProfiles': 'Top Live Profiles',
    'topLiveProfilesDesc': 'Profiles that are currently active and looking for matches now.',
    'viewProfile': 'View Profile',
    'onlineNow': 'Online now',
    // Matchmaker Section
    'forProfessionals': 'For Professionals',
    'areYouMatchmaker': 'Are You a Matchmaker?',
    'matchmakerDesc': 'Join our platform as a professional matchmaker and help families find perfect matches. Create and manage multiple profiles under your account.',
    'unlimitedProfiles': 'Unlimited Profiles',
    'unlimitedProfilesDesc': 'Create unlimited profiles under your account',
    'clientDashboard': 'Client Dashboard',
    'clientDashboardDesc': 'Dashboard to manage all your clients',
    'verifiedBadge': 'Verified Badge',
    'verifiedBadgeDesc': 'Special matchmaker badge for credibility',
    'prioritySupport': 'Priority Support',
    'prioritySupportDesc': 'Priority support and featured listings',
    'bulkCommunication': 'Bulk Communication',
    'bulkCommunicationDesc': 'Bulk communication tools',
    'registerAsMatchmaker': 'Register as Matchmaker',
    'yourClientProfiles': 'Your Client Profiles',
    'addNewProfile': 'Add New Profile',
    // Blog Section
    'blogAdvice': 'Blog & Advice',
    'blogAdviceDesc': 'Expert tips for a successful marriage and wedding planning.',
    'readMore': 'Read More →',
    // FAQ Section
    'faq': 'Frequently Asked Questions',
    'faqDesc': "Have questions? We're here to help.",
    'account': 'Account',
    'subscription': 'Subscription',
    'privacy': 'Privacy',
    'accountProfile': 'Account & Profile',
    'howDoIRegister': 'How do I register?',
    'howDoIRegisterDesc': 'Simply click on the Register button, provide your basic details, and verify your email. It takes less than 2 minutes!',
    'isItFree': 'Is it free to create a profile?',
    'isItFreeDesc': 'Yes, registration and profile creation are completely free. You can also express interest in other members for free.',
    'premiumBenefits': 'What are the premium benefits?',
    'premiumBenefitsDesc': 'Premium members can view contact numbers, send unlimited messages, see who viewed their profile, and get priority support.',
    'canICancel': 'Can I cancel my subscription?',
    'canICancelDesc': 'Yes, you can cancel your subscription at any time. Your benefits will continue until the end of the billing period.',
    'whoCanSeeContact': 'Who can see my contact details?',
    'whoCanSeeContactDesc': 'Only Premium members can view your contact details, and only if you have chosen to make them visible to Premium members.',
    // Pricing Section
    'pricingPlans': 'Pricing Plans',
    'pricingPlansDesc': 'Choose the plan that fits your needs. No hidden fees.',
    'free': 'Free',
    'gold': 'Gold',
    'diamond': 'Diamond',
    'mostPopular': 'Most Popular',
    'createProfile': 'Create Profile',
    'addPhotos': 'Add Photos',
    'sendInterest': 'Send Interest',
    'viewContactInfo': 'View Contact Info',
    'directChat': 'Direct Chat',
    'allGoldFeatures': 'All Gold Features',
    'viewContactUnlimited': 'View Contact Info (Unlimited)',
    'profileBoost': 'Profile Boost',
    'featuredListing': 'Featured Listing',
    'personalAssistant': 'Personal Assistant',
    'getStarted': 'Get Started',
    'goPremium': 'Go Premium',
    // Footer
    'footerTagline': 'The most trusted matrimonial service for Sri Lankans worldwide.',
    'quickLinks': 'Quick Links',
    'forMatchmakers': 'For Matchmakers',
    'support': 'Support',
    'helpCenter': 'Help Center',
    'safetyTips': 'Safety Tips',
    'reportMisuse': 'Report Misuse',
    'legal': 'Legal',
    'privacyPolicy': 'Privacy Policy',
    'termsOfService': 'Terms of Service',
    'cookiePolicy': 'Cookie Policy',
    'refundPolicy': 'Refund Policy',
    'allRightsReserved': '© 2026 VivahaBandhu. All rights reserved.',
    'madeWithLove': 'Made with ❤️ in Sri Lanka',
  },
  si: {
    'browseProfiles': 'පැතිකඩ පිරික්සන්න',
    'aboutUs': 'අප ගැන',
    'successStories': 'සාර්ථක කතා',
    'contactUs': 'අප හා සම්බන්ධ වන්න',
    'login': 'ඇතුළු වන්න',
    'registerFree': 'නොමිලේ ලියාපදිංචි වන්න',
    'myProfile': 'මගේ පැතිකඩ',
    'settings': 'සැකසීම්',
    'logout': 'ඉවත් වන්න',
    'heroTitle': 'විශ්වාසයෙන් ඔබේ පරිපූර්ණ ජීවිත හවුල්කරු සොයන්න',
    'heroTitlePerfect': 'පරිපූර්ණ ජීවිත',
    'heroTitlePartner': 'හවුල්කරු',
    'heroDescription': 'අපගේ විශ්වාසදායක විවාහ මාර්ගගත වේදිකාව හරහා අර්ථවත් සම්බන්ධතා සොයාගත් දහස් ගණනක පවුල්වලට සම්බන්ධ වන්න. සත්‍යාපනය කළ පැතිකඩ, ආරක්ෂිත සන්නිවේදනය සහ කැපවූ ගැලපීමේ සහාය.',
    'createFreeProfile': 'නොමිලේ පැතිකඩක් සාදන්න',
    'searchProfiles': 'පැතිකඩ සොයන්න',
    'verifiedProfiles': 'සත්‍යාපනය කළ පැතිකඩ',
    'successStoriesCount': 'සාර්ථක කතා',
    'trustedMatchmakers': 'විශ්වාසදායක ගැලපීම් කරන්නන්',
    'quickSearch': 'ක්ෂණික සෙවීම',
    'imLookingFor': 'මම සොයන්නේ',
    'ageFrom': 'වයස සිට',
    'ageTo': 'වයස දක්වා',
    'religion': 'ආගම',
    'district': 'දිස්ත්‍රික්කය',
    'searchNow': 'දැන් සොයන්න',
    // Features Section
    'findTheOne': 'එක සොයන්න',
    'findRealConnection': 'සැබෑ සම්බන්ධතාවයක් සොයන්න',
    'featuresDescription': 'ඔබ ඔබේ ජීවිත හවුල්කරු සොයා ගැනීමට බැඳී සිටින්නේ නම්, VivahaBandhu ඔබටමයි. ශ්‍රී ලංකාවේ සත්‍යාපනය කළ පැතිකඩවල විශාලතම ජාලයක් සමඟ, පවුල් සම්බන්ධ කර ඔබේ පරිපූර්ණ ගැලපීම සොයා ගැනීම කිසිදා වඩා විශ්වාසදායක සහ ආරක්ෂිත නොවීය.',
    'familyValues': 'පවුල් අගයන් සහ සංස්කෘතික අවබෝධය',
    'familyValuesDesc': 'ඔබේ පවුල් සම්ප්‍රදායන්, සංස්කෘතික පසුබිම සහ අගයන් අපි ගරු කරන අතර අවබෝධ කරන අතර, ඔබේ අපේක්ෂාවන් සහ විශ්වාසයන් සමඟ ගැලපෙන ගැලපීම් සොයා ගනිමු.',
    'verifiedTrusted': 'සත්‍යාපනය කළ සහ විශ්වාසදායක පැතිකඩ',
    'verifiedTrustedDesc': 'සෑම පැතිකඩක්ම සත්‍යාපනය සඳහා සම්පූර්ණයෙන් සත්‍යාපනය කරනු ලැබේ. ඔබේ සිතේ සාමය සඳහා පසුබිම් පරීක්ෂා, පවුල් සත්‍යාපනය සහ සැබෑ තොරතුරු සහතික කරන්නෙමු.',
    'personalMatchmaking': 'පුද්ගලික ගැලපීමේ උපදේශනය',
    'personalMatchmakingDesc': 'අපගේ අත්දැකීම් සහිත ගැලපීම් කරන්නන් ඔබේ මනාප, පවුල් අපේක්ෂාවන් අවබෝධ කර ගැනීමට සහ පුද්ගලීකරණය කළ ගැලපීමේ උපායමාර්ගයක් නිර්මාණය කිරීමට සවිස්තරාත්මක උපදේශන පවත්වයි.',
    // How It Works
    'howItWorks': 'එය ක්‍රියා කරන ආකාරය',
    'howItWorksDesc': 'අපගේ සරල පියවර 4 ක් සහිත ක්‍රියාවලිය සමඟ ඔබේ ජීවිත හවුල්කරු සොයා ගැනීම පහසුය.',
    'createAccount': 'ගිණුමක් සාදන්න',
    'createAccountDesc': 'නොමිලේ ලියාපදිංචි වී මූලික තොරතුරු සමඟ ඔබේ ගිණුම සැකසීම',
    'createProfile': 'පැතිකඩක් සාදන්න',
    'createProfileDesc': 'ඔබට හෝ පවුල් සාමාජිකයෙකුට සවිස්තරාත්මක පැතිකඩ තොරතුරු එක් කරන්න',
    'browseMatch': 'පිරික්සන්න සහ ගැලපීම',
    'browseMatchDesc': 'පැතිකඩ සොයා ගැනීම සහ මනාප මත පදනම්ව බුද්ධිමත් යෝජනා ලබා ගැනීම',
    'connect': 'සම්බන්ධ වන්න',
    'connectDesc': 'උනන්දුව ප්‍රකාශ කරන්න සහ දෙපාර්ශ්වයම පිළිගත් විට සම්බන්ධ වන්න',
    // Profiles Section
    'featuredProfiles': 'විශේෂ පැතිකඩ',
    'featuredProfilesDesc': 'අපගේ සත්‍යාපනය කළ පැතිකඩ හරහා පිරික්සා අදම ඔබේ පරිපූර්ණ ගැලපීම සොයා ගන්න.',
    'verified': '✓ සත්‍යාපනය කළ',
    'match': 'ගැලපීම',
    'viewAllProfiles': 'සියලුම පැතිකඩ බලන්න →',
    'subscribeToView': 'සම්පූර්ණ පැතිකඩ තොරතුරු බැලීමට දායක වන්න',
    'upgradeNow': 'දැන් උත්ශ්‍රේණි කරන්න',
    // Top Profiles
    'topLiveProfiles': 'ඉහළම සජීවී පැතිකඩ',
    'topLiveProfilesDesc': 'දැනට ක්‍රියාකාරී වන සහ දැන් ගැලපීම් සොයන පැතිකඩ.',
    'viewProfile': 'පැතිකඩ බලන්න',
    'onlineNow': 'දැන් මාර්ගගත',
    // Matchmaker Section
    'forProfessionals': 'වෘත්තීයවේදීන් සඳහා',
    'areYouMatchmaker': 'ඔබ ගැලපීම් කරන්නෙක්ද?',
    'matchmakerDesc': 'වෘත්තීය ගැලපීම් කරන්නෙකු ලෙස අපගේ වේදිකාවට සම්බන්ධ වී පවුල්වලට පරිපූර්ණ ගැලපීම් සොයා ගැනීමට උදව් කරන්න. ඔබේ ගිණුම යටතේ බහු පැතිකඩ නිර්මාණය කර කළමනාකරණය කරන්න.',
    'unlimitedProfiles': 'අසීමිත පැතිකඩ',
    'unlimitedProfilesDesc': 'ඔබේ ගිණුම යටතේ අසීමිත පැතිකඩ නිර්මාණය කරන්න',
    'clientDashboard': 'සේවාදායක උපකරණ පුවරුව',
    'clientDashboardDesc': 'ඔබේ සියලුම සේවාදායකයන් කළමනාකරණය කිරීමට උපකරණ පුවරුව',
    'verifiedBadge': 'සත්‍යාපනය කළ ලාංඡනය',
    'verifiedBadgeDesc': 'විශ්වාසදායකත්වය සඳහා විශේෂ ගැලපීම් කරන්නාගේ ලාංඡනය',
    'prioritySupport': 'ප්‍රමුඛ සහාය',
    'prioritySupportDesc': 'ප්‍රමුඛ සහාය සහ විශේෂ ලැයිස්තු',
    'bulkCommunication': 'සමූහ සන්නිවේදනය',
    'bulkCommunicationDesc': 'සමූහ සන්නිවේදන මෙවලම්',
    'registerAsMatchmaker': 'ගැලපීම් කරන්නෙකු ලෙස ලියාපදිංචි වන්න',
    'yourClientProfiles': 'ඔබේ සේවාදායක පැතිකඩ',
    'addNewProfile': 'නව පැතිකඩක් එක් කරන්න',
    // Blog Section
    'blogAdvice': 'බ්ලොග් සහ උපදෙස්',
    'blogAdviceDesc': 'සාර්ථක විවාහයක් සහ විවාහ සැලසුම් සඳහා වෘත්තීය උපදෙස්.',
    'readMore': 'තවත් කියවන්න →',
    // FAQ Section
    'faq': 'නිතර අසන ප්‍රශ්න',
    'faqDesc': 'ප්‍රශ්න තිබේද? අපි උදව් කිරීමට සූදානම්.',
    'account': 'ගිණුම',
    'subscription': 'දායකත්වය',
    'privacy': 'රහස්‍යතාව',
    'accountProfile': 'ගිණුම සහ පැතිකඩ',
    'howDoIRegister': 'මම ලියාපදිංචි වන්නේ කෙසේද?',
    'howDoIRegisterDesc': 'ලියාපදිංචි වීමේ බොත්තම ක්ලික් කරන්න, ඔබේ මූලික තොරතුරු සපයන්න, සහ ඔබේ විද්‍යුත් තැපෑල සත්‍යාපනය කරන්න. මිනිත්තු 2 කට අඩු කාලයක් ගත වේ!',
    'isItFree': 'පැතිකඩක් නිර්මාණය කිරීම නොමිලේද?',
    'isItFreeDesc': 'ඔව්, ලියාපදිංචි වීම සහ පැතිකඩ නිර්මාණය කිරීම සම්පූර්ණයෙන්ම නොමිලේ. ඔබට වෙනත් සාමාජිකයින් කෙරෙහි උනන්දුව ප්‍රකාශ කිරීමටද නොමිලේ.',
    'premiumBenefits': 'වාරික වාසි මොනවාද?',
    'premiumBenefitsDesc': 'වාරික සාමාජිකයින්ට දුරකථන අංක බැලීමට, අසීමිත පණිවිඩ යැවීමට, ඔවුන්ගේ පැතිකඩ බැලූ අය දැකීමට සහ ප්‍රමුඛ සහාය ලබා ගැනීමට හැකිය.',
    'canICancel': 'මම මගේ දායකත්වය අවලංගු කළ හැකිද?',
    'canICancelDesc': 'ඔව්, ඔබට ඕනෑම වේලාවක ඔබේ දායකත්වය අවලංගු කළ හැකිය. ඔබේ වාසි බිල්පත් කාලය අවසන් වන තෙක් අඛණ්ඩව පවතී.',
    'whoCanSeeContact': 'මගේ සම්බන්ධතා තොරතුරු කවුරුන්ට දැකිය හැකිද?',
    'whoCanSeeContactDesc': 'වාරික සාමාජිකයින්ට පමණක් ඔබේ සම්බන්ධතා තොරතුරු බැලීමට හැකිය, සහ ඔබ වාරික සාමාජිකයින්ට දෘශ්‍යමාන කිරීමට තෝරා ගෙන තිබේ නම් පමණි.',
    // Pricing Section
    'pricingPlans': 'මිල නියමයන්',
    'pricingPlansDesc': 'ඔබේ අවශ්‍යතාවලට ගැලපෙන සැලැස්ම තෝරන්න. සැඟවුණු ගාස්තු නැත.',
    'free': 'නොමිලේ',
    'gold': 'රන්',
    'diamond': 'දියමන්ති',
    'mostPopular': 'වඩාත්ම ජනප්‍රිය',
    'createProfile': 'පැතිකඩක් සාදන්න',
    'addPhotos': 'ඡායාරූප එක් කරන්න',
    'sendInterest': 'උනන්දුව යවන්න',
    'viewContactInfo': 'සම්බන්ධතා තොරතුරු බලන්න',
    'directChat': 'සෘජු කතාබහ',
    'allGoldFeatures': 'සියලුම රන් විශේෂාංග',
    'viewContactUnlimited': 'සම්බන්ධතා තොරතුරු බලන්න (අසීමිත)',
    'profileBoost': 'පැතිකඩ උත්ශ්‍රේණිය',
    'featuredListing': 'විශේෂ ලැයිස්තුව',
    'personalAssistant': 'පුද්ගලික සහායක',
    'getStarted': 'ආරම්භ කරන්න',
    'goPremium': 'වාරික වෙත යන්න',
    // Footer
    'footerTagline': 'ලොව පුරා ශ්‍රී ලාංකිකයන් සඳහා වඩාත්ම විශ්වාසදායක විවාහ සේවාව.',
    'quickLinks': 'ක්ෂණික සබැඳි',
    'forMatchmakers': 'ගැලපීම් කරන්නන් සඳහා',
    'support': 'සහාය',
    'helpCenter': 'උදව් මධ්‍යස්ථානය',
    'safetyTips': 'ආරක්ෂිත උපදෙස්',
    'reportMisuse': 'අනිසි භාවිතය වාර්තා කරන්න',
    'legal': 'නීතිමය',
    'privacyPolicy': 'රහස්‍යතා ප්‍රතිපත්තිය',
    'termsOfService': 'සේවා කොන්දේසි',
    'cookiePolicy': 'කුකී ප්‍රතිපත්තිය',
    'refundPolicy': 'ආපසු ගෙවීමේ ප්‍රතිපත්තිය',
    'allRightsReserved': '© 2026 VivahaBandhu. සියලුම හිමිකම් ඇවිරිණි.',
    'madeWithLove': 'ශ්‍රී ලංකාවේ ❤️ සමඟ සාදන ලදී',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'si')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

