'use client';

import LegalPageShell from '../../components/legal/LegalPageShell';
import PrivacyPolicyBody from '../../components/legal/PrivacyPolicyBody';
import { useLanguage } from '../../context/LanguageContext';

export default function PrivacyPolicyPage() {
    const { t } = useLanguage();

    return (
        <LegalPageShell
            title={t('privacyPolicy')}
            effectiveDateLabel="Effective date: April 7, 2026. Prior versions are superseded as of this date."
            siblingHref="/terms-of-service"
            siblingTitleKey="termsOfService"
        >
            <PrivacyPolicyBody />
        </LegalPageShell>
    );
}
