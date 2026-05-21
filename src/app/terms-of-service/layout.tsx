import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service | MyMatch.lk',
    description:
        'Terms governing your use of the MyMatch.lk matchmaking Services, subscriptions, acceptable use, and dispute resolution.',
};

export default function TermsOfServiceLayout({ children }: { children: React.ReactNode }) {
    return children;
}
