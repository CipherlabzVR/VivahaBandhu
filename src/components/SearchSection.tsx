'use client';

import { useState } from 'react';

interface SearchSectionProps {
    onOpenProfileDetail: () => void;
}

export default function SearchSection({ onOpenProfileDetail }: SearchSectionProps) {
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const toggleFilter = (group: string) => {
        setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    // Default is open, so if key is NOT in state (undefined), it's OPEN.
    // If key is present and true, it's collapsed (closed).
    // Wait, my logic below: `!collapsedGroups[group]` means if undefined -> true (open).
    // No, if undefined -> !undefined -> true.
    // If true -> !true -> false.
    // So:
    const isOpen = (group: string) => collapsedGroups[group] !== true;
    // Wait, I want default open. So set initial to empty.
    // Toggle: set to true to close?
    // Let's say: store "closed" state.
    const toggle = (group: string) => {
        setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const getOpenClass = (group: string) => !collapsedGroups[group] ? 'open' : '';

    return (
        <section className="search-section" id="search">
            <div className="search-container">
                {/* Filters Sidebar */}
                <aside className="filters-sidebar">
                    <div className="filters-header">
                        <h3>Filters</h3>
                        <button className="clear-filters-btn">Clear Filters</button>
                    </div>

                    <div className="filter-group">
                        <label>Sort By</label>
                        <select className="filter-select">
                            <option>Latest First</option>
                            <option>Oldest First</option>
                            <option>Age: Low to High</option>
                            <option>Age: High to Low</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>I&apos;m looking for</label>
                        <div className="gender-toggle">
                            <button className="gender-btn active">Bride</button>
                            <button className="gender-btn">Groom</button>
                        </div>
                    </div>

                    <div className={`filter-group collapsible ${getOpenClass('age')}`}>
                        <div className="filter-header" onClick={() => toggle('age')}>
                            <span>Age</span>
                            <span className="filter-arrow">▼</span>
                        </div>
                        <div className="filter-content">
                            <div className="range-inputs">
                                <input type="number" placeholder="Min" defaultValue="18" min="18" max="70" />
                                <span>to</span>
                                <input type="number" placeholder="Max" defaultValue="35" min="18" max="70" />
                            </div>
                        </div>
                    </div>

                    <div className={`filter-group collapsible ${getOpenClass('country')}`}>
                        <div className="filter-header" onClick={() => toggle('country')}>
                            <span>Country of Residence</span>
                            <span className="filter-arrow">▼</span>
                        </div>
                        <div className="filter-content">
                            <select className="filter-select">
                                <option>Any</option>
                                <option>Sri Lanka</option>
                                <option>United Kingdom</option>
                                <option>United States</option>
                                <option>Australia</option>
                                <option>Canada</option>
                                <option>Japan</option>
                                <option>Italy</option>
                            </select>
                        </div>
                    </div>

                    <div className={`filter-group collapsible ${getOpenClass('region')}`}>
                        <div className="filter-header" onClick={() => toggle('region')}>
                            <span>Region / District</span>
                            <span className="filter-arrow">▼</span>
                        </div>
                        <div className="filter-content">
                            <select className="filter-select">
                                <option>Any</option>
                                <option>Colombo</option>
                                <option>Gampaha</option>
                                <option>Kandy</option>
                                <option>Kalutara</option>
                                <option>Galle</option>
                                <option>Matara</option>
                                <option>Kurunegala</option>
                            </select>
                        </div>
                    </div>

                    <div className={`filter-group collapsible ${getOpenClass('ethnicity')}`}>
                        <div className="filter-header" onClick={() => toggle('ethnicity')}>
                            <span>Ethnicity</span>
                            <span className="filter-arrow">▼</span>
                        </div>
                        <div className="filter-content">
                            <div className="checkbox-filters">
                                <label><input type="checkbox" /> Sinhalese</label>
                                <label><input type="checkbox" /> Tamil</label>
                                <label><input type="checkbox" /> Muslim</label>
                                <label><input type="checkbox" /> Burgher</label>
                            </div>
                        </div>
                    </div>

                    <div className={`filter-group collapsible ${getOpenClass('religion')}`}>
                        <div className="filter-header" onClick={() => toggle('religion')}>
                            <span>Religion</span>
                            <span className="filter-arrow">▼</span>
                        </div>
                        <div className="filter-content">
                            <div className="checkbox-filters">
                                <label><input type="checkbox" /> Buddhist</label>
                                <label><input type="checkbox" /> Hindu</label>
                                <label><input type="checkbox" /> Christian</label>
                                <label><input type="checkbox" /> Catholic</label>
                                <label><input type="checkbox" /> Muslim</label>
                            </div>
                        </div>
                    </div>

                    <div className={`filter-group collapsible ${getOpenClass('status')}`}>
                        <div className="filter-header" onClick={() => toggle('status')}>
                            <span>Civil Status</span>
                            <span className="filter-arrow">▼</span>
                        </div>
                        <div className="filter-content">
                            <div className="checkbox-filters">
                                <label><input type="checkbox" /> Never Married</label>
                                <label><input type="checkbox" /> Divorced</label>
                                <label><input type="checkbox" /> Widowed</label>
                                <label><input type="checkbox" /> Separated</label>
                            </div>
                        </div>
                    </div>

                    <div className={`filter-group collapsible ${getOpenClass('profession')}`}>
                        <div className="filter-header" onClick={() => toggle('profession')}>
                            <span>Profession</span>
                            <span className="filter-arrow">▼</span>
                        </div>
                        <div className="filter-content">
                            <div className="checkbox-filters">
                                <label><input type="checkbox" /> Software Engineer</label>
                                <label><input type="checkbox" /> Doctor</label>
                                <label><input type="checkbox" /> Teacher</label>
                                <label><input type="checkbox" /> Engineer</label>
                                <label><input type="checkbox" /> Business Owner</label>
                                <label><input type="checkbox" /> Accountant</label>
                            </div>
                        </div>
                    </div>

                    <div className={`filter-group collapsible ${getOpenClass('education')}`}>
                        <div className="filter-header" onClick={() => toggle('education')}>
                            <span>Education Level</span>
                            <span className="filter-arrow">▼</span>
                        </div>
                        <div className="filter-content">
                            <div className="checkbox-filters">
                                <label><input type="checkbox" /> PhD</label>
                                <label><input type="checkbox" /> Masters</label>
                                <label><input type="checkbox" /> Bachelors</label>
                                <label><input type="checkbox" /> Diploma</label>
                                <label><input type="checkbox" /> A/L</label>
                            </div>
                        </div>
                    </div>

                    <div className={`filter-group collapsible ${getOpenClass('height')}`}>
                        <div className="filter-header" onClick={() => toggle('height')}>
                            <span>Height</span>
                            <span className="filter-arrow">▼</span>
                        </div>
                        <div className="filter-content">
                            <div className="range-inputs">
                                <select className="filter-select">
                                    <option>4&apos; 6&quot;</option>
                                    <option>5&apos; 0&quot;</option>
                                    <option defaultValue="selected">5&apos; 4&quot;</option>
                                    <option>5&apos; 8&quot;</option>
                                </select>
                                <span>to</span>
                                <select className="filter-select">
                                    <option>5&apos; 8&quot;</option>
                                    <option defaultValue="selected">6&apos; 0&quot;</option>
                                    <option>6&apos; 4&quot;</option>
                                    <option>6&apos; 8&quot;</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className={`filter-group collapsible ${getOpenClass('food')}`}>
                        <div className="filter-header" onClick={() => toggle('food')}>
                            <span>Food Preference</span>
                            <span className="filter-arrow">▼</span>
                        </div>
                        <div className="filter-content">
                            <div className="checkbox-filters">
                                <label><input type="checkbox" /> Vegetarian</label>
                                <label><input type="checkbox" /> Non-Vegetarian</label>
                                <label><input type="checkbox" /> Vegan</label>
                            </div>
                        </div>
                    </div>

                    {/* I'll skip some repetitive groups like drinking/smoking/creator/verified to save space, but add them if critical. */}
                    {/* Adding Created By and Verified */}

                    <div className={`filter-group collapsible ${getOpenClass('creator')}`}>
                        <div className="filter-header" onClick={() => toggle('creator')}>
                            <span>Account Created by</span>
                            <span className="filter-arrow">▼</span>
                        </div>
                        <div className="filter-content">
                            <div className="checkbox-filters">
                                <label><input type="checkbox" /> Self</label>
                                <label><input type="checkbox" /> Parents</label>
                                <label><input type="checkbox" /> Sibling</label>
                                <label><input type="checkbox" /> Matchmaker</label>
                            </div>
                        </div>
                    </div>

                    <div className={`filter-group collapsible ${getOpenClass('verified')}`}>
                        <div className="filter-header" onClick={() => toggle('verified')}>
                            <span>ID Verified</span>
                            <span className="filter-arrow">▼</span>
                        </div>
                        <div className="filter-content">
                            <div className="checkbox-filters">
                                <label><input type="checkbox" /> Verified Only</label>
                            </div>
                        </div>
                    </div>

                    <div className="save-search-box">
                        <p>Save this search as your preferred search criteria?</p>
                        <button className="btn btn-primary">Save</button>
                    </div>
                </aside>

                {/* Search Results */}
                <div className="search-results">
                    <div className="results-header">
                        <div className="results-toggle">
                            <span>Preferred Search</span>
                            <label className="toggle-switch">
                                <input type="checkbox" />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <p className="results-count">Showing 1 - 20 of 529 posts</p>
                    </div>

                    <div className="results-list">
                        {/* Profile Card 1 */}
                        <div className="search-profile-card boosted">
                            <span className="boost-badge">Boost Ad</span>
                            <div className="profile-photo-container">
                                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400" alt="Profile" className="profile-photo" />
                            </div>
                            <div className="profile-info-section">
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="profile-info-text">Ishani</span>
                                </div>
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span className="profile-info-text">28 yrs</span>
                                </div>
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="profile-info-text">4'10"</span>
                                </div>
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span className="profile-info-text">No Job</span>
                                </div>
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="profile-info-text">Matale</span>
                                </div>
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                    </svg>
                                    <span className="profile-info-text">Buddhism</span>
                                </div>
                                <div className="profile-activity-badge">
                                    <svg className="profile-activity-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>2 days ago</span>
                                </div>
                            </div>
                            <button className="view-profile-btn" onClick={onOpenProfileDetail}>View Profile</button>
                        </div>

                        {/* Profile Card 2 */}
                        <div className="search-profile-card boosted">
                            <span className="boost-badge">Boost Ad</span>
                            <div className="profile-photo-container">
                                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400" alt="Profile" className="profile-photo" />
                            </div>
                            <div className="profile-info-section">
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="profile-info-text">Shahan</span>
                                </div>
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span className="profile-info-text">31 yrs</span>
                                </div>
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="profile-info-text">5' 4"</span>
                                </div>
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span className="profile-info-text">Business Owner</span>
                                </div>
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="profile-info-text">Kamagaya-shi, Japan</span>
                                </div>
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                    </svg>
                                    <span className="profile-info-text">Buddhist</span>
                                </div>
                                <div className="profile-activity-badge">
                                    <svg className="profile-activity-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>6 days ago</span>
                                </div>
                            </div>
                            <button className="view-profile-btn" onClick={onOpenProfileDetail}>View Profile</button>
                        </div>

                        {/* Profile Card 3 */}
                        <div className="search-profile-card">
                            <div className="profile-photo-container">
                                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400" alt="Profile" className="profile-photo" />
                            </div>
                            <div className="profile-info-section">
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="profile-info-text">Supun</span>
                                </div>
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span className="profile-info-text">34 yrs</span>
                                </div>
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="profile-info-text">5' 6"</span>
                                </div>
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span className="profile-info-text">Software Engineer</span>
                                </div>
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="profile-info-text">Manchester, UK</span>
                                </div>
                                <div className="profile-info-item">
                                    <svg className="profile-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                    </svg>
                                    <span className="profile-info-text">Buddhist</span>
                                </div>
                                <div className="profile-activity-badge">
                                    <svg className="profile-activity-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>15 days ago</span>
                                </div>
                            </div>
                            <button className="view-profile-btn" onClick={onOpenProfileDetail}>View Profile</button>
                        </div>
                    </div>

                    <div className="pagination">
                        <button className="page-btn prev" disabled>&lt; Prev</button>
                        <button className="page-btn active">1</button>
                        <button className="page-btn">2</button>
                        <button className="page-btn">3</button>
                        <span className="page-dots">...</span>
                        <button className="page-btn">27</button>
                        <button className="page-btn next">Next &gt;</button>
                    </div>
                </div>
            </div>
        </section>
    );
}
