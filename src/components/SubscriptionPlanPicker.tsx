'use client';

import {
    type PublicMatrimonialPackage,
    buildFeatureComparisonRows,
    isFreePackage,
    isUserCurrentPackage,
    packageFeatureLabels,
    packageId,
    packageName,
    packagePeriodLabel,
    packagePrice,
    packageValidityLabel,
    type UserPlanContext,
} from '../utils/matrimonialPackages';
import PackageFeatureList from './PackageFeatureList';

interface SubscriptionPlanPickerProps {
    packages: PublicMatrimonialPackage[];
    selectedPackageId: number | null;
    onSelectPackage: (id: number) => void;
    isMatchmaker?: boolean;
    user?: UserPlanContext;
    currentPackageLabel?: string;
}

export default function SubscriptionPlanPicker({
    packages,
    selectedPackageId,
    onSelectPackage,
    isMatchmaker = false,
    user = null,
    currentPackageLabel = 'Your current package',
}: SubscriptionPlanPickerProps) {
    const comparisonRows = buildFeatureComparisonRows(packages);

    return (
        <div className="subscription-plan-picker">
            <div
                className={`subscription-comparison subscription-comparison--with-features subscription-comparison--cols-${Math.min(packages.length, 3)}`}
            >
                {packages.map((pkg) => {
                    const id = packageId(pkg);
                    const selected = selectedPackageId === id;
                    const popular = !!(pkg.isPopular ?? pkg.IsPopular);
                    const isCurrent = isUserCurrentPackage(pkg, packages, user);
                    const free = isFreePackage(pkg);
                    const period = packagePeriodLabel(pkg);
                    const desc = pkg.description ?? pkg.Description;
                    const validityLabel = packageValidityLabel(pkg);
                    const featureLabels = packageFeatureLabels(pkg);

                    return (
                        <div
                            key={id || packageName(pkg)}
                            className={`sub-option sub-option--detailed ${selected ? 'selected' : ''} ${isCurrent ? 'current-plan' : ''} ${popular && !isCurrent ? 'recommended' : ''}`}
                            onClick={() => onSelectPackage(id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onSelectPackage(id);
                                }
                            }}
                        >
                            {isCurrent ? (
                                <span className="sub-option-current-badge">{currentPackageLabel}</span>
                            ) : null}
                            <h4>{packageName(pkg)}</h4>
                            <div className="price">
                                LKR {packagePrice(pkg).toLocaleString('en-LK')}
                                {period ? <span>{period}</span> : null}
                            </div>
                            {validityLabel && !free ? (
                                <p style={{ fontSize: '0.8rem', marginTop: '0.35rem', lineHeight: 1.4, color: 'var(--text-light)' }}>
                                    Valid for: <strong style={{ color: 'var(--text-dark)' }}>{validityLabel}</strong>
                                </p>
                            ) : null}
                            {desc ? (
                                <p style={{ fontSize: '0.8rem', marginTop: '0.35rem', lineHeight: 1.4 }}>
                                    {desc}
                                </p>
                            ) : null}
                            <div className="sub-option-features">
                                <PackageFeatureList
                                    labels={featureLabels}
                                    className="space-y-2 mt-3 mb-0 text-left"
                                    itemClassName="flex items-start gap-2 text-xs text-text-dark"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {comparisonRows.length > 0 && packages.length > 1 ? (
                <div className="features-unlocked subscription-feature-matrix">
                    <h4>
                        {isMatchmaker ? 'Compare matchmaker plans' : 'Compare Free vs Premium'}
                    </h4>
                    <div className="subscription-feature-matrix-scroll">
                        <table className="subscription-feature-matrix-table">
                            <thead>
                                <tr>
                                    <th scope="col">Feature</th>
                                    {packages.map((pkg) => (
                                        <th key={packageId(pkg) || packageName(pkg)} scope="col">
                                            {packageName(pkg)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonRows.map((row) => (
                                    <tr key={row.key}>
                                        <td>{row.label}</td>
                                        {row.includedIn.map((included, colIdx) => (
                                            <td key={`${row.key}-${colIdx}`} className="text-center">
                                                {included ? (
                                                    <span className="subscription-matrix-check" aria-label="Included">
                                                        ✓
                                                    </span>
                                                ) : (
                                                    <span className="subscription-matrix-dash" aria-label="Not included">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
