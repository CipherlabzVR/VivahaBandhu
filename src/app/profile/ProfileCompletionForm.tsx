'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';

export default function ProfileCompletionForm({ onClose, onComplete }: { onClose?: () => void, onComplete?: () => void }) {
    const { user } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});

    const [formData, setFormData] = useState({
        // Personal
        gender: '',
        dob: '',
        height: '',
        complexion: '',
        religion: '',
        maritalStatus: '',

        // Education & Work
        qualificationLevel: '',
        occupation: '',

        // Location
        countryOfOrigin: '',
        countryOfResidence: '',
        cityOfResidence: '',
        residencyStatus: '',

        // Habits
        hobbies: '',
        drinkingHabits: '',
        eatingHabits: '',
        smokingHabits: '',
        horoscope: '',

        // Parents - Father
        fatherCountryOfResidence: '',
        fatherOccupation: '',
        fatherEthnicity: '',
        fatherReligion: '',
        fatherCaste: '',
        fatherRemarks: '',

        // Parents - Mother
        motherCountryOfResidence: '',
        motherOccupation: '',
        motherEthnicity: '',
        motherReligion: '',
        motherCaste: '',
        motherRemarks: '',

        // Partner Preference
        partnerMinAge: '',
        partnerMaxAge: '',
        partnerEatingHabits: '',
        partnerDrinkingHabits: '',
        partnerSmokingHabits: '',
        partnerQualificationLevel: '',
        partnerReligion: '',
        partnerEthnicity: '',
        partnerCountryOfOrigin: '',
        partnerCountryOfResidence: '',
        partnerAdditionalRequirements: '',

        // Uploads
        upload1: '',
        upload2: '',
        upload3: '',
        profilePhoto: '',
        remarks: ''
    });

    // Populate initial data from user if available (e.g. DOB if stored in user)
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : prev.dob,
                gender: user.gender || prev.gender
            }));

            // Fetch existing profile if possible
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!user?.id || !token) return;

            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetProfile?userId=${user.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.result) {
                    const profile = data.result;
                    // Map backend fields to form fields
                    setFormData(prev => ({
                        ...prev,
                        ...profile,
                        dob: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : prev.dob,
                        partnerMinAge: profile.partnerMinAge || '',
                        partnerMaxAge: profile.partnerMaxAge || ''
                    }));
                }
            }
        } catch (error) {
            console.error("Failed to fetch profile", error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            await uploadFile(file, fieldName);
        }
    };

    const uploadFile = async (file: File, fieldName: string) => {
        setUploading(prev => ({ ...prev, [fieldName]: true }));
        setSubmitError('');

        try {
            const token = localStorage.getItem('token');
            const data = new FormData();
            data.append('File', file);
            data.append('FileName', file.name);
            data.append('storePath', 'Matrimonial/Profiles');

            const response = await fetch(`${API_BASE_URL}/AWS/DocumentUploadCommon`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: data
            });

            if (response.ok) {
                const url = await response.text();
                // Clean up any surrounding quotes
                const cleanUrl = url.replace(/^"|"$/g, '');
                setFormData(prev => ({ ...prev, [fieldName]: cleanUrl }));
            } else {
                setSubmitError('Failed to upload image. Please try again.');
            }
        } catch (error) {
            console.error('Upload error:', error);
            setSubmitError('An error occurred during upload.');
        } finally {
            setUploading(prev => ({ ...prev, [fieldName]: false }));
        }
    };

    const validateStep = (currentStep: number) => {
        // Implement validation per step
        if (currentStep === 1) {
            if (!formData.gender || !formData.height || !formData.religion || !formData.maritalStatus) {
                setSubmitError('Please fill in all mandatory fields (*)');
                return false;
            }
        }
        if (currentStep === 2) {
            if (!formData.qualificationLevel || !formData.countryOfOrigin || !formData.countryOfResidence || !formData.cityOfResidence || !formData.residencyStatus) {
                setSubmitError('Please fill in all mandatory fields (*)');
                return false;
            }
        }
        if (currentStep === 3) {
            if (!formData.horoscope) {
                setSubmitError('Please select Horoscope option (*)');
                return false;
            }
        }
        if (currentStep === 4) {
            if (!formData.fatherCountryOfResidence || !formData.fatherEthnicity || !formData.fatherReligion ||
                !formData.motherCountryOfResidence || !formData.motherEthnicity || !formData.motherReligion) {
                setSubmitError('Please fill in all mandatory fields for parents (*)');
                return false;
            }
        }
        // Add more validation as needed
        setSubmitError('');
        return true;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(prev => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const handlePrev = () => {
        setStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if uploads are pending
        if (Object.values(uploading).some(Boolean)) {
            setSubmitError('Please wait for images to finish uploading.');
            return;
        }

        if (!user) {
            setSubmitError("User not authenticated");
            return;
        }

        setLoading(true);
        setSubmitError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/Matrimonial/UpdateProfile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user.id,
                    ...formData,
                    height: parseFloat(formData.height) || 0,
                    partnerMinAge: parseInt(formData.partnerMinAge) || 18,
                    partnerMaxAge: parseInt(formData.partnerMaxAge) || 60,
                    dateOfBirth: formData.dob || null
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            const result = await response.json();
            if (result.statusCode === 1) { // Success
                if (onComplete) onComplete();
                if (onClose) onClose();
            } else {
                setSubmitError(result.message || 'Failed to update profile');
            }
        } catch (error: any) {
            setSubmitError(error.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-completion-form">
            <div className="steps-indicator" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', padding: '0 1rem' }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} style={{
                        width: '30px', height: '30px',
                        borderRadius: '50%',
                        background: step >= i ? 'var(--primary)' : '#ddd',
                        color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold'
                    }}>
                        {i}
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit}>
                {submitError && <div style={{ color: 'red', marginBottom: '1rem', padding: '10px', background: '#ffebee', borderRadius: '4px' }}>{submitError}</div>}

                {step === 1 && (
                    <div className="step-content">
                        <h3>Personal Details</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Gender*</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} required>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            {/* DOB Removed */}
                            <div className="form-group">
                                <label>Height (cm)*</label>
                                <input type="number" name="height" value={formData.height} onChange={handleChange} required placeholder="e.g. 175" />
                            </div>
                            <div className="form-group">
                                <label>Complexion</label>
                                <select name="complexion" value={formData.complexion} onChange={handleChange}>
                                    <option value="">Select Complexion</option>
                                    <option value="Fair">Fair</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Dark">Dark</option>
                                    <option value="Very Fair">Very Fair</option>
                                    <option value="Wheatish">Wheatish</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Religion*</label>
                                <select name="religion" value={formData.religion} onChange={handleChange} required>
                                    <option value="">Select Religion</option>
                                    <option value="Buddhism">Buddhism</option>
                                    <option value="Christianity">Christianity</option>
                                    <option value="Hinduism">Hinduism</option>
                                    <option value="Islam">Islam</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Marital Status*</label>
                                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} required>
                                    <option value="">Select Status</option>
                                    <option value="Never Married">Never Married</option>
                                    <option value="Divorced">Divorced</option>
                                    <option value="Widowed">Widowed</option>
                                    <option value="Separated">Separated</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="step-content">
                        <h3>Education & Career</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Highest Qualification*</label>
                                <select name="qualificationLevel" value={formData.qualificationLevel} onChange={handleChange} required>
                                    <option value="">Select Qualification</option>
                                    <option value="GCE O/L">GCE O/L</option>
                                    <option value="GCE A/L">GCE A/L</option>
                                    <option value="Diploma">Diploma</option>
                                    <option value="Degree">Degree</option>
                                    <option value="Masters">Masters</option>
                                    <option value="PHD">PHD</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Occupation</label>
                                <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} placeholder="Current Job Title" />
                            </div>
                        </div>

                        <h3 style={{ marginTop: '2rem' }}>Location</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Country of Origin*</label>
                                <select name="countryOfOrigin" value={formData.countryOfOrigin} onChange={handleChange} required>
                                    <option value="">Select Country</option>
                                    <option value="Sri Lanka">Sri Lanka</option>
                                    <option value="India">India</option>
                                    <option value="UK">UK</option>
                                    <option value="USA">USA</option>
                                    <option value="Australia">Australia</option>
                                    <option value="Canada">Canada</option>
                                    {/* Add more countries */}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Country of Residence*</label>
                                <select name="countryOfResidence" value={formData.countryOfResidence} onChange={handleChange} required>
                                    <option value="">Select Country</option>
                                    <option value="Sri Lanka">Sri Lanka</option>
                                    <option value="India">India</option>
                                    <option value="UK">UK</option>
                                    <option value="USA">USA</option>
                                    <option value="Australia">Australia</option>
                                    <option value="Canada">Canada</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>City of Residence*</label>
                                <input type="text" name="cityOfResidence" value={formData.cityOfResidence} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Residency Status*</label>
                                <select name="residencyStatus" value={formData.residencyStatus} onChange={handleChange} required>
                                    <option value="">Select Status</option>
                                    <option value="Citizen">Citizen</option>
                                    <option value="Student">Student</option>
                                    <option value="Permanent Residency">Permanent Residency</option>
                                    <option value="Work Permit">Work Permit</option>
                                    <option value="Refugee">Refugee</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="step-content">
                        <h3>Additional Details</h3>
                        <div className="form-grid">
                            <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                <label>Hobbies</label>
                                <textarea name="hobbies" value={formData.hobbies} onChange={handleChange} rows={3}></textarea>
                            </div>
                            <div className="form-group">
                                <label>Drinking Habits</label>
                                <select name="drinkingHabits" value={formData.drinkingHabits} onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option value="Never">Never</option>
                                    <option value="Occasionally">Occasionally</option>
                                    <option value="Frequently">Frequently</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Eating Habits</label>
                                <select name="eatingHabits" value={formData.eatingHabits} onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option value="Vegetarian">Vegetarian</option>
                                    <option value="Non-Veg">Non-Veg</option>
                                    <option value="Vegan">Vegan</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Smoking Habits</label>
                                <select name="smokingHabits" value={formData.smokingHabits} onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option value="Never">Never</option>
                                    <option value="Occasionally">Occasionally</option>
                                    <option value="Frequently">Frequently</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Horoscope Matching*</label>
                                <select name="horoscope" value={formData.horoscope} onChange={handleChange} required>
                                    <option value="">Select</option>
                                    <option value="Required">Required</option>
                                    <option value="Not Required">Not Required</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="step-content">
                        <h3>Parents Details</h3>

                        <h4 style={{ marginTop: '1rem', color: 'var(--primary)' }}>Father</h4>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Country of Residence*</label>
                                <select name="fatherCountryOfResidence" value={formData.fatherCountryOfResidence} onChange={handleChange} required>
                                    <option value="">Select Country</option>
                                    <option value="Sri Lanka">Sri Lanka</option>
                                    <option value="India">India</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Occupation</label>
                                <input type="text" name="fatherOccupation" value={formData.fatherOccupation} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Ethnicity*</label>
                                <input type="text" name="fatherEthnicity" value={formData.fatherEthnicity} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Religion*</label>
                                <select name="fatherReligion" value={formData.fatherReligion} onChange={handleChange} required>
                                    <option value="">Select</option>
                                    <option value="Buddhism">Buddhism</option>
                                    <option value="Christianity">Christianity</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Caste</label>
                                <input type="text" name="fatherCaste" value={formData.fatherCaste} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Remarks</label>
                                <input type="text" name="fatherRemarks" value={formData.fatherRemarks} onChange={handleChange} />
                            </div>
                        </div>

                        <h4 style={{ marginTop: '2rem', color: 'var(--primary)' }}>Mother</h4>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Country of Residence*</label>
                                <select name="motherCountryOfResidence" value={formData.motherCountryOfResidence} onChange={handleChange} required>
                                    <option value="">Select Country</option>
                                    <option value="Sri Lanka">Sri Lanka</option>
                                    <option value="India">India</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Occupation</label>
                                <input type="text" name="motherOccupation" value={formData.motherOccupation} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Ethnicity*</label>
                                <input type="text" name="motherEthnicity" value={formData.motherEthnicity} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Religion*</label>
                                <select name="motherReligion" value={formData.motherReligion} onChange={handleChange} required>
                                    <option value="">Select</option>
                                    <option value="Buddhism">Buddhism</option>
                                    <option value="Christianity">Christianity</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Caste</label>
                                <input type="text" name="motherCaste" value={formData.motherCaste} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Remarks</label>
                                <input type="text" name="motherRemarks" value={formData.motherRemarks} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <div className="step-content">
                        <h3>Partner Preferences</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Age Range (Years)</label>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <input type="number" name="partnerMinAge" value={formData.partnerMinAge} onChange={handleChange} placeholder="Min" style={{ width: '50%' }} />
                                    <input type="number" name="partnerMaxAge" value={formData.partnerMaxAge} onChange={handleChange} placeholder="Max" style={{ width: '50%' }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Eating Habits</label>
                                <select name="partnerEatingHabits" value={formData.partnerEatingHabits} onChange={handleChange}>
                                    <option value="">Any</option>
                                    <option value="Vegetarian">Vegetarian</option>
                                    <option value="Non-Veg">Non-Veg</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Drinking Habits</label>
                                <select name="partnerDrinkingHabits" value={formData.partnerDrinkingHabits} onChange={handleChange}>
                                    <option value="">Any</option>
                                    <option value="Never">Never</option>
                                    <option value="Occasionally">Occasionally</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Smoking Habits</label>
                                <select name="partnerSmokingHabits" value={formData.partnerSmokingHabits} onChange={handleChange}>
                                    <option value="">Any</option>
                                    <option value="Never">Never</option>
                                    <option value="Occasionally">Occasionally</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Min Qualification</label>
                                <select name="partnerQualificationLevel" value={formData.partnerQualificationLevel} onChange={handleChange}>
                                    <option value="">Any</option>
                                    <option value="Degree">Degree</option>
                                    <option value="GCE A/L">GCE A/L</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Religion (Preferred)</label>
                                <input type="text" name="partnerReligion" value={formData.partnerReligion} onChange={handleChange} placeholder="e.g. Buddhism, Christianity" />
                            </div>

                            <div className="form-group">
                                <label>Ethnicity (Preferred)</label>
                                <input type="text" name="partnerEthnicity" value={formData.partnerEthnicity} onChange={handleChange} placeholder="e.g. Sinhalese" />
                            </div>

                            <div className="form-group">
                                <label>Country of Origin</label>
                                <select name="partnerCountryOfOrigin" value={formData.partnerCountryOfOrigin} onChange={handleChange}>
                                    <option value="">Anyway</option>
                                    <option value="Sri Lanka">Sri Lanka</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                <label>Additional Requirements</label>
                                <textarea name="partnerAdditionalRequirements" value={formData.partnerAdditionalRequirements} onChange={handleChange} rows={3}></textarea>
                            </div>
                        </div>
                    </div>
                )}

                {step === 6 && (
                    <div className="step-content">
                        <h3>Profile Verification & Uploads</h3>
                        <div className="form-grid">
                            <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                <label>General Remarks</label>
                                <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={3}></textarea>
                            </div>

                            <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #eee' }} />
                                <h4>Profile Photos</h4>
                            </div>

                            <div className="form-group">
                                <label>Main Profile Photo*</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'profilePhoto')}
                                    disabled={uploading['profilePhoto']}
                                />
                                {uploading['profilePhoto'] && <span style={{ fontSize: '0.8rem', color: 'blue' }}>Uploading...</span>}
                                {formData.profilePhoto && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <img src={formData.profilePhoto} alt="Profile" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Gallery Photo 1</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'upload1')}
                                    disabled={uploading['upload1']}
                                />
                                {uploading['upload1'] && <span style={{ fontSize: '0.8rem', color: 'blue' }}>Uploading...</span>}
                                {formData.upload1 && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <img src={formData.upload1} alt="Gallery 1" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Gallery Photo 2</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'upload2')}
                                    disabled={uploading['upload2']}
                                />
                                {uploading['upload2'] && <span style={{ fontSize: '0.8rem', color: 'blue' }}>Uploading...</span>}
                                {formData.upload2 && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <img src={formData.upload2} alt="Gallery 2" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Gallery Photo 3</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'upload3')}
                                    disabled={uploading['upload3']}
                                />
                                {uploading['upload3'] && <span style={{ fontSize: '0.8rem', color: 'blue' }}>Uploading...</span>}
                                {formData.upload3 && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <img src={formData.upload3} alt="Gallery 3" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="form-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                    {step > 1 ? (
                        <button type="button" className="btn btn-outline" onClick={handlePrev}>Previous</button>
                    ) : <div></div>}

                    {step < 6 ? (
                        <button type="button" className="btn btn-primary" onClick={handleNext}>Next</button>
                    ) : (
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Profile'}
                        </button>
                    )}
                </div>
            </form>

            <style jsx>{`
                .profile-completion-form {
                    padding: 1rem;
                }
                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.5rem;
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                }
                .form-group label {
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    color: #555;
                }
                .form-group input, .form-group select, .form-group textarea {
                    padding: 0.8rem;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 1rem;
                    transition: border-color 0.3s;
                }
                .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                }
                h3 {
                    border-bottom: 1px solid #eee;
                    padding-bottom: 0.5rem;
                    margin-bottom: 1.5rem;
                    color: var(--primary);
                }
            `}</style>
        </div>
    );
}
