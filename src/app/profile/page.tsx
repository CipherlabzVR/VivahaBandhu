'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import Modals from '../../components/Modals';

import ProfileCompletionForm from './ProfileCompletionForm';

export default function ProfilePage() {
    const { user, loading, updateUser } = useAuth();
    const router = useRouter();
    const [activeModal, setActiveModal] = useState<'login' | 'register' | 'subscription' | 'profile' | 'blog' | null>(null);
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [profileCompleted, setProfileCompleted] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        } else if (user) {
            checkProfileCompletion();
        }
    }, [user, loading, router]);

    const checkProfileCompletion = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!user?.id || !token) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:44352/api'}/Matrimonial/GetProfile?userId=${user.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.result && data.result.gender && data.result.religion) {
                    setProfileCompleted(true);
                } else {
                    setProfileCompleted(false);
                    setIsCompletionModalOpen(true); // Auto open if incomplete
                }
            } else {
                setProfileCompleted(false);
                setIsCompletionModalOpen(true);
            }
        } catch (error) {
            console.error("Failed to check profile", error);
        }
    };

    const openModal = (modal: 'login' | 'register' | 'subscription' | 'profile' | 'blog') => {
        setActiveModal(modal);
    };

    const closeModal = () => {
        setActiveModal(null);
    };

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Form state for editing (Basic Details)
    const [editForm, setEditForm] = useState({
        firstName: '',
        lastName: '',
        nic: '',
        dob: '',
        gender: '',
        phone: '',
        whatsapp: '',
        email: '',
        accountType: ''
    });

    useEffect(() => {
        if (user) {
            setEditForm({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                nic: user.nic || '',
                dob: user.dob || '',
                gender: user.gender || '',
                phone: user.phone || '',
                whatsapp: user.whatsapp || '',
                email: user.email || '',
                accountType: user.accountType || ''
            });
        }
    }, [user]);

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // In a real app, you would have a save function here that calls an API and updates the User Context

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', color: 'var(--primary)' }}>Loading...</div>;
    }

    if (!user) return null;

    return (
        <main>
            <Header
                onOpenLogin={() => openModal('login')}
                onOpenRegister={() => openModal('register')}
            />

            <div className="profile-page-container" style={{ paddingTop: '100px', minHeight: '80vh', maxWidth: '1200px', margin: '0 auto', padding: '120px 20px 40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h1>My Profile</h1>
                    {!profileCompleted && (
                        <div style={{ background: '#fff3cd', color: '#856404', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #ffeeba' }}>
                            ⚠️ Your profile is incomplete. Please complete it to view matches.
                            <button onClick={() => setIsCompletionModalOpen(true)} style={{ marginLeft: '1rem', background: 'none', border: 'none', color: '#856404', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>Complete Now</button>
                        </div>
                    )}
                </div>

                {/* Detailed Profile Completion Modal */}
                {isCompletionModalOpen && (
                    <div className="modal-overlay active" style={{ zIndex: 1000 }}>
                        <div className="modal" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                            <button className="modal-close" onClick={() => setIsCompletionModalOpen(false)}>✕</button>
                            <div className="modal-header">
                                <h2>{profileCompleted ? 'Edit Detailed Profile' : 'Complete Your Profile'}</h2>
                                <p style={{ color: '#666', fontSize: '0.9rem' }}>Please provide accurate information to find the best match.</p>
                            </div>
                            <div className="modal-body">
                                <ProfileCompletionForm
                                    onClose={() => setIsCompletionModalOpen(false)}
                                    onComplete={() => {
                                        setProfileCompleted(true);
                                        checkProfileCompletion(); // Refresh
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Basic Profile Modal */}
                {isEditModalOpen && (
                    <div className="modal-overlay active" onClick={() => setIsEditModalOpen(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <button className="modal-close" onClick={() => setIsEditModalOpen(false)}>✕</button>
                            <div className="modal-header">
                                <h2>Edit Basic Details</h2>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    updateUser({
                                        firstName: editForm.firstName,
                                        lastName: editForm.lastName,
                                        nic: editForm.nic,
                                        dob: editForm.dob,
                                        gender: editForm.gender,
                                        phone: editForm.phone,
                                        whatsapp: editForm.whatsapp,
                                    });
                                    setIsEditModalOpen(false);
                                }}>
                                    <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>First Name</label>
                                            <input type="text" name="firstName" value={editForm.firstName} onChange={handleEditChange} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Last Name</label>
                                            <input type="text" name="lastName" value={editForm.lastName} onChange={handleEditChange} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>NIC / Passport</label>
                                        <input type="text" name="nic" value={editForm.nic} onChange={handleEditChange} />
                                    </div>
                                    <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Date of Birth</label>
                                            <input type="date" name="dob" value={editForm.dob} onChange={handleEditChange} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Gender</label>
                                            <select name="gender" value={editForm.gender} onChange={handleEditChange}>
                                                <option value="">Select Gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Phone Number</label>
                                        <input type="tel" name="phone" value={editForm.phone} onChange={handleEditChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>WhatsApp Number</label>
                                        <input type="tel" name="whatsapp" value={editForm.whatsapp} onChange={handleEditChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <input type="email" name="email" value={editForm.email} onChange={handleEditChange} disabled style={{ backgroundColor: '#f0f0f0' }} />
                                    </div>
                                    <div className="form-group">
                                        <label>Account Type</label>
                                        <input type="text" name="accountType" value={editForm.accountType} onChange={handleEditChange} disabled style={{ backgroundColor: '#f0f0f0' }} />
                                    </div>
                                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Save Changes</button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                <div className="profile-card" style={{ background: 'white', padding: '2rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginTop: '2rem' }}>
                    <div className="profile-header" style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #eee' }}>
                        <div className="profile-avatar" style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold' }}>
                            {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.8rem' }}>{user.firstName} {user.lastName}</h2>
                            <p style={{ color: '#666', marginBottom: '0.5rem' }}>{user.email}</p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <span className="badge" style={{ background: '#eef2ff', color: 'var(--primary)', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 500 }}>
                                    {user.accountType || 'Free Member'}
                                </span>
                                {profileCompleted ? (
                                    <span className="badge" style={{ background: '#e6fffa', color: '#047857', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Profile Verified
                                    </span>
                                ) : (
                                    <span className="badge" style={{ background: '#fff3cd', color: '#856404', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Incomplete Profile
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="profile-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Full Name</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.firstName} {user.lastName}</div>
                        </div>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Account ID</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.id}</div>
                        </div>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Phone</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.phone || '-'}</div>
                        </div>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>WhatsApp</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.whatsapp || '-'}</div>
                        </div>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>NIC / Passport</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.nic || '-'}</div>
                        </div>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Date of Birth</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.dob ? new Date(user.dob).toLocaleDateString() : '-'}</div>
                        </div>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Gender</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.gender || '-'}</div>
                        </div>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Account Status</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem', color: 'green' }}>Active</div>
                        </div>
                    </div>

                    <div className="profile-actions" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #eee', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={() => openModal('subscription')}>Upgrade Membership</button>
                        <button className="btn btn-outline" onClick={() => setIsCompletionModalOpen(true)}>Edit Detailed Profile</button>
                        <button className="btn btn-outline" onClick={() => setIsEditModalOpen(true)}>Edit Basic Details</button>
                    </div>
                </div>

                {user?.accountType === 'Matchmaker' && (
                    <div className="profile-card" style={{ background: 'white', padding: '2rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginTop: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Your Client Profiles</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#FDF8F3', borderRadius: '12px' }}>
                                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} alt="Client" />
                                <div>
                                    <h5 style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: '1rem' }}>Amaya Fernando</h5>
                                    <p style={{ color: '#6B6560', fontSize: '0.875rem' }}>26 years • Bride • Colombo</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#FDF8F3', borderRadius: '12px' }}>
                                <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} alt="Client" />
                                <div>
                                    <h5 style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: '1rem' }}>Ravindu Silva</h5>
                                    <p style={{ color: '#6B6560', fontSize: '0.875rem' }}>29 years • Groom • Kandy</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#FDF8F3', borderRadius: '12px' }}>
                                <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} alt="Client" />
                                <div>
                                    <h5 style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: '1rem' }}>Ishara Perera</h5>
                                    <p style={{ color: '#6B6560', fontSize: '0.875rem' }}>24 years • Bride • Galle</p>
                                </div>
                            </div>
                        </div>
                        <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>+</span> Add New Profile
                        </button>
                    </div>
                )}

                <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
                    <div className="dashboard-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        <h3>Recent Activity</h3>
                        <p style={{ color: '#666', marginTop: '1rem' }}>No recent activity to show.</p>
                    </div>
                    <div className="dashboard-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        <h3>Saved Profiles</h3>
                        <p style={{ color: '#666', marginTop: '1rem' }}>You haven't saved any profiles yet.</p>
                        <button className="btn btn-outline" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }} onClick={() => router.push('/#profiles')}>Browse Profiles</button>
                    </div>
                </div>
            </div>

            <Footer />

            <Modals
                activeModal={activeModal}
                onClose={closeModal}
                onSwitch={openModal}
            />
        </main>
    );
}
