'use client';

import LegalPageShell from '../../components/legal/LegalPageShell';
import TermsOfServiceBody from '../../components/legal/TermsOfServiceBody';
import { useLanguage } from '../../context/LanguageContext';

export default function TermsOfServicePage() {
    const { t } = useLanguage();

    return (
        <LegalPageShell
            title={t('termsOfService')}
            effectiveDateLabel="Effective date: April 7, 2026. Prior versions are superseded and may be obtained from legal@mymatch.lk."
            siblingHref="/cookie-policy"
            siblingTitleKey="cookiePolicy"
        >
            <TermsOfServiceBody />
        </LegalPageShell>
    );
}
