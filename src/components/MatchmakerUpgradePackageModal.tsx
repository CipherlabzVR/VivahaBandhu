'use client';

import {
    type PublicMatrimonialPackage,
    packageFeatureLabels,
    packageId,
    packageMaxManagedAccounts,
    packageName,
    packagePrice,
    packageValidityLabel,
} from '../utils/matrimonialPackages';

type MatchmakerUpgradePackageModalProps = {
    open: boolean;
    onClose: () => void;
    packages: PublicMatrimonialPackage[];
    loading?: boolean;
    title?: string;
    introLine?: string;
    onSelectPackage: (pkg: PublicMatrimonialPackage) => void;
};

export default function MatchmakerUpgradePackageModal({
    open,
    onClose,
    packages,
    loading = false,
    title,
    introLine,
    onSelectPackage,
}: MatchmakerUpgradePackageModalProps) {
    if (!open) return null;

    return (
        <div
            className="modal-overlay active"
            role="dialog"
            aria-modal="true"
            aria-labelledby="matchmaker-upgrade-packages-title"
            style={{ zIndex: 1100 }}
        >
            <div className="modal" style={{ maxWidth: '640px', width: '95%' }}>
                <button className="modal-close" onClick={onClose} aria-label="Close">
                    ✕
                </button>
                <div className="modal-header">
                    <h2 id="matchmaker-upgrade-packages-title" style={{ color: '#7c2d12' }}>
                        {title || 'Upgrade to add more client profiles'}
                    </h2>
                </div>
                <div className="modal-body">
                    <p style={{ marginBottom: '1.25rem', color: '#374151', lineHeight: 1.55 }}>
                        {introLine ||
                            'Choose a plan below. After payment you can create more client profiles under your matchmaker account.'}
                    </p>
                    {loading ? (
                        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading plans…</p>
                    ) : packages.length === 0 ? (
                        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                            No upgrade plans are available right now. Please contact support.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {packages.map((pkg) => {
                                const id = packageId(pkg);
                                const name = packageName(pkg);
                                const price = packagePrice(pkg);
                                const validity = packageValidityLabel(pkg);
                                const desc = String(pkg.description ?? pkg.Description ?? '').trim();
                                const popular = !!(pkg.isPopular ?? pkg.IsPopular);
                                const clientSlots = packageMaxManagedAccounts(pkg);
                                const features = packageFeatureLabels(pkg).slice(0, 3);
                                return (
                                    <div
                                        key={id || name}
                                        style={{
                                            padding: '1rem 1.1rem',
                                            borderRadius: '12px',
                                            border: popular ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                                            background: popular ? '#fffbeb' : '#fafafa',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                gap: '1rem',
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        flexWrap: 'wrap',
                                                        marginBottom: '0.35rem',
                                                    }}
                                                >
                                                    <strong style={{ fontSize: '1.05rem', color: '#1f2937' }}>
                                                        {name}
                                                    </strong>
                                                    {popular ? (
                                                        <span
                                                            style={{
                                                                fontSize: '0.72rem',
                                                                fontWeight: 600,
                                                                background: '#f59e0b',
                                                                color: '#fff',
                                                                padding: '0.15rem 0.5rem',
                                                                borderRadius: '999px',
                                                            }}
                                                        >
                                                            Popular
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {desc ? (
                                                    <p
                                                        style={{
                                                            margin: '0 0 0.35rem',
                                                            color: '#6b7280',
                                                            fontSize: '0.88rem',
                                                            lineHeight: 1.45,
                                                        }}
                                                    >
                                                        {desc}
                                                    </p>
                                                ) : null}
                                                <p style={{ margin: '0 0 0.25rem', color: '#92400e', fontSize: '0.85rem', fontWeight: 600 }}>
                                                    {clientSlots > 0
                                                        ? `Up to ${clientSlots} client profile${clientSlots === 1 ? '' : 's'}`
                                                        : 'Client profiles included'}
                                                    {validity ? ` · Valid ${validity}` : ''}
                                                </p>
                                                {features.length > 0 ? (
                                                    <ul
                                                        style={{
                                                            margin: '0.35rem 0 0',
                                                            paddingLeft: '1.1rem',
                                                            color: '#64748b',
                                                            fontSize: '0.82rem',
                                                            lineHeight: 1.45,
                                                        }}
                                                    >
                                                        {features.map((f) => (
                                                            <li key={f}>{f}</li>
                                                        ))}
                                                    </ul>
                                                ) : null}
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div
                                                    style={{
                                                        fontSize: '1.25rem',
                                                        fontWeight: 700,
                                                        color: '#92400e',
                                                        marginBottom: '0.5rem',
                                                    }}
                                                >
                                                    LKR {price.toLocaleString()}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary"
                                                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
                                                    onClick={() => onSelectPackage(pkg)}
                                                >
                                                    Select plan
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '0.5rem',
                            flexWrap: 'wrap',
                            marginTop: '1.25rem',
                        }}
                    >
                        <button type="button" className="btn btn-outline" onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
