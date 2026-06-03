'use client';

import LegalPageShell from '../../components/legal/LegalPageShell';
import RefundPolicyBody from '../../components/legal/RefundPolicyBody';
import { useLanguage } from '../../context/LanguageContext';

export default function RefundPolicyPage() {
    const { t } = useLanguage();

    return (
        <LegalPageShell
            title={t('refundPolicy')}
            effectiveDateLabel="Effective date: April 7, 2026. Prior versions are superseded as of this date."
            siblingHref="/privacy-policy"
            siblingTitleKey="privacyPolicy"
        >
            <RefundPolicyBody />
        </LegalPageShell>
    );
}
