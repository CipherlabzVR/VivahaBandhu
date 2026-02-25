export interface Profile {
    id: string;
    name: string;
    age: number;
    gender: 'Male' | 'Female'; // Male = Groom, Female = Bride
    religion: string;
    district: string;
    profession: string;
    image: string;
}

export const mockProfiles: Profile[] = [];
