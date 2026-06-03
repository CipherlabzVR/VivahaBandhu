import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Cookie Policy | MyMatch.lk',
    description:
        'How MyMatch.lk uses cookies and similar technologies for login, preferences, security, and site performance.',
};

export default function CookiePolicyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
