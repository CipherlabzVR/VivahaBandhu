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

export const mockProfiles: Profile[] = [
    // Brides (Females)
    { id: '1', name: 'Amara Perera', age: 24, gender: 'Female', religion: 'Buddhist', district: 'Colombo', profession: 'Teacher', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400' },
    { id: '2', name: 'Kavindi Silva', age: 26, gender: 'Female', religion: 'Christian', district: 'Gampaha', profession: 'Nurse', image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400' },
    { id: '3', name: 'Nethmi Fernando', age: 23, gender: 'Female', religion: 'Catholic', district: 'Negombo', profession: 'Student', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400' },
    { id: '4', name: 'Sanduni Dias', age: 28, gender: 'Female', religion: 'Buddhist', district: 'Kandy', profession: 'Banker', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400' },
    { id: '5', name: 'Rishini Jayasinghe', age: 25, gender: 'Female', religion: 'Buddhist', district: 'Galle', profession: 'Teacher', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400' },
    { id: '6', name: 'Fathima Riffai', age: 22, gender: 'Female', religion: 'Muslim', district: 'Colombo', profession: 'Software Engineer', image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400' },
    { id: '7', name: 'Pooja Kumar', age: 27, gender: 'Female', religion: 'Hindu', district: 'Jaffna', profession: 'Doctor', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400' },
    { id: '8', name: 'Dilhani Herath', age: 29, gender: 'Female', religion: 'Buddhist', district: 'Kurunegala', profession: 'Accountant', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400' },
    { id: '9', name: 'Chamari Atapattu', age: 31, gender: 'Female', religion: 'Buddhist', district: 'Anuradhapura', profession: 'Business Owner', image: 'https://images.unsplash.com/photo-1554151228-14d9def656ec?w=400' },
    { id: '10', name: 'Malki De Silva', age: 24, gender: 'Female', religion: 'Christian', district: 'Moratuwa', profession: 'Designer', image: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=400' },

    // Grooms (Males)
    { id: '11', name: 'Ruwan Pradeep', age: 28, gender: 'Male', religion: 'Buddhist', district: 'Colombo', profession: 'Engineer', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400' },
    { id: '12', name: 'Kasun Rajitha', age: 30, gender: 'Male', religion: 'Buddhist', district: 'Gampaha', profession: 'Businessman', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400' },
    { id: '13', name: 'Danushka Gunathilaka', age: 32, gender: 'Male', religion: 'Catholic', district: 'Negombo', profession: 'Pilot', image: 'https://images.unsplash.com/photo-1492562080023-aff15a7219f6?w=400' },
    { id: '14', name: 'Asela Gunaratne', age: 29, gender: 'Male', religion: 'Buddhist', district: 'Kandy', profession: 'Army Officer', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400' },
    { id: '15', name: 'Lahiru Thirimanne', age: 35, gender: 'Male', religion: 'Buddhist', district: 'Galle', profession: 'Cricketer', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400' },
    { id: '16', name: 'Mohamed Amir', age: 27, gender: 'Male', religion: 'Muslim', district: 'Kandy', profession: 'Merchant', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400' },
    { id: '17', name: 'Siva Kumar', age: 31, gender: 'Male', religion: 'Hindu', district: 'Batticaloa', profession: 'Teacher', image: 'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?w=400' },
    { id: '18', name: 'Nuwan Kulasekara', age: 33, gender: 'Male', religion: 'Buddhist', district: 'Kurunegala', profession: 'Policeman', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400' },
    { id: '19', name: 'Suranga Lakmal', age: 26, gender: 'Male', religion: 'Buddhist', district: 'Matara', profession: 'Fisheryman', image: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400' },
    { id: '20', name: 'Dinesh Chandimal', age: 29, gender: 'Male', religion: 'Christian', district: 'Colombo', profession: 'Manager', image: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400' },
];
