'use client';

import LegalPageShell from '../../components/legal/LegalPageShell';
import CookiePolicyBody from '../../components/legal/CookiePolicyBody';
import { useLanguage } from '../../context/LanguageContext';

export default function CookiePolicyPage() {
    const { t } = useLanguage();

    return (
        <LegalPageShell
            title={t('cookiePolicy')}
            effectiveDateLabel="Effective date: April 7, 2026. Prior versions are superseded as of this date."
            siblingHref="/refund-policy"
            siblingTitleKey="refundPolicy"
        >
            <CookiePolicyBody />
        </LegalPageShell>
    );
}
