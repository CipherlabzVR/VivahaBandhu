import { getDefaultAvatarDataUri } from '@/utils/defaultAvatar';

type ProfileAvatarProps = {
    photo?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    gender?: string | null;
    alt?: string;
    className?: string;
};

function hasProfilePhoto(photo?: string | null): photo is string {
    return typeof photo === 'string' && photo.trim() !== '';
}

export default function ProfileAvatar({
    photo,
    firstName,
    lastName,
    gender,
    alt = '',
    className = 'w-full h-full object-cover',
}: ProfileAvatarProps) {
    const src = hasProfilePhoto(photo)
        ? photo.trim()
        : getDefaultAvatarDataUri({ firstName, lastName, gender });

    return <img src={src} alt={alt} className={className} />;
}
