'use client';

import type { CSSProperties } from 'react';
import { getDefaultAvatarDataUri } from '../utils/defaultAvatar';

type ProfileAvatarProps = {
    photo?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    /** Full display name — used for initials when first/last are missing. */
    name?: string | null;
    gender?: string | null;
    alt?: string;
    className?: string;
    style?: CSSProperties;
};

function hasProfilePhoto(photo?: string | null): photo is string {
    return typeof photo === 'string' && photo.trim() !== '';
}

function splitName(name?: string | null): { firstName?: string; lastName?: string } {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (parts.length === 0) return {};
    if (parts.length === 1) return { firstName: parts[0] };
    return { firstName: parts[0], lastName: parts[parts.length - 1] };
}

export default function ProfileAvatar({
    photo,
    firstName,
    lastName,
    name,
    gender,
    alt = '',
    className = 'w-full h-full object-cover',
    style,
}: ProfileAvatarProps) {
    const fromName = splitName(name);
    const first = firstName?.trim() || fromName.firstName || '';
    const last = lastName?.trim() || fromName.lastName || '';

    const src = hasProfilePhoto(photo)
        ? photo.trim()
        : getDefaultAvatarDataUri({ firstName: first, lastName: last, gender });

    return <img src={src} alt={alt} className={className} style={style} />;
}
