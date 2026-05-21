import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy | MyMatch.lk',
    description:
        'How MyMatch.lk collects, uses, stores, and protects your personal data when you use our matrimonial Services.',
};

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
