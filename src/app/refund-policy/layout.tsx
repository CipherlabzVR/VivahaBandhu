import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Refund Policy | MyMatch.lk',
    description:
        'MyMatch.lk refund policy for memberships, subscriptions, cancellations, and how to request a refund.',
};

export default function RefundPolicyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
