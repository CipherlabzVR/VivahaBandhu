'use client';

interface PackageFeatureListProps {
    labels: string[];
    className?: string;
    itemClassName?: string;
    emptyMessage?: string;
}

/** Checkmark feature list used on homepage pricing cards and the subscription modal. */
export default function PackageFeatureList({
    labels,
    className = 'space-y-2.5 mb-0',
    itemClassName = 'flex items-start gap-2 text-sm text-text-dark',
    emptyMessage = 'No features listed for this package.',
}: PackageFeatureListProps) {
    if (labels.length === 0) {
        return <p className="text-text-light text-sm m-0">{emptyMessage}</p>;
    }

    return (
        <ul className={className}>
            {labels.map((label) => (
                <li key={label} className={itemClassName}>
                    <span className="text-primary shrink-0 mt-0.5">✓</span>
                    <span>{label}</span>
                </li>
            ))}
        </ul>
    );
}
