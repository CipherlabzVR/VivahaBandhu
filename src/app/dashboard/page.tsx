'use client';

import './dashboard.css';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { matrimonialService } from '../../services/matrimonialService';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

interface DashboardStats {
    totalUserCount: number;
    activeUserCount: number;
    paidMemberCount: number;
    freeMemberCount: number;
    subscriptionAmountEarned: number;
}

function AnimatedCounter({ target, duration = 2000, prefix = '', suffix = '' }: { target: number; duration?: number; prefix?: string; suffix?: string }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (target === 0) { setCount(0); return; }
        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [target, duration]);

    return <>{prefix}{count.toLocaleString()}{suffix}</>;
}

// SVG Icon Components
function UsersIcon() {
    return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function ActiveIcon() {
    return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    );
}

function CrownIcon() {
    return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4l3 12h14l3-12-5 4-5-4-5 4-3-4z" />
            <path d="M5 16h14v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2z" />
        </svg>
    );
}

function FreeIcon() {
    return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function RevenueIcon() {
    return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    );
}

function RefreshIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
    );
}

function TrendUpIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
        </svg>
    );
}

function ChartIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const response = await matrimonialService.getDashboardStats();

            if (response?.result) {
                setStats({
                    totalUserCount: response.result.totalUserCount ?? response.result.TotalUserCount ?? 0,
                    activeUserCount: response.result.activeUserCount ?? response.result.ActiveUserCount ?? 0,
                    paidMemberCount: response.result.paidMemberCount ?? response.result.PaidMemberCount ?? 0,
                    freeMemberCount: response.result.freeMemberCount ?? response.result.FreeMemberCount ?? 0,
                    subscriptionAmountEarned: response.result.subscriptionAmountEarned ?? response.result.SubscriptionAmountEarned ?? 0,
                });
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const conversionRate = stats && stats.totalUserCount > 0
        ? ((stats.paidMemberCount / stats.totalUserCount) * 100).toFixed(1)
        : '0';

    const avgRevenuePerPaid = stats && stats.paidMemberCount > 0
        ? (stats.subscriptionAmountEarned / stats.paidMemberCount).toFixed(0)
        : '0';

    return (
        <>
            <Header onOpenLogin={() => { }} onOpenRegister={() => { }} />
            <main className="dashboard-page">
                {/* Background decorative elements */}
                <div className="dashboard-bg-gradient" />
                <div className="dashboard-bg-grid" />
                <div className="dashboard-bg-orb dashboard-bg-orb-1" />
                <div className="dashboard-bg-orb dashboard-bg-orb-2" />
                <div className="dashboard-bg-orb dashboard-bg-orb-3" />

                <div className="dashboard-container">
                    {/* Header Section */}
                    <div className="dashboard-header">
                        <div className="dashboard-header-left">
                            <div className="dashboard-header-badge">
                                <ChartIcon />
                                <span>Analytics Dashboard</span>
                            </div>
                            <h1 className="dashboard-title">
                                Platform <span className="dashboard-title-accent">Overview</span>
                            </h1>
                            <p className="dashboard-subtitle">
                                Real-time insights and metrics from your matrimonial platform
                            </p>
                        </div>
                        <div className="dashboard-header-right">
                            <button
                                className="dashboard-refresh-btn"
                                onClick={() => fetchStats(true)}
                                disabled={refreshing}
                                title="Refresh data"
                            >
                                <span className={`dashboard-refresh-icon ${refreshing ? 'spinning' : ''}`}>
                                    <RefreshIcon />
                                </span>
                                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                            </button>
                            <div className="dashboard-last-updated">
                                Last updated: {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    </div>

                    {/* Error State */}
                    {error && (
                        <div className="dashboard-error">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                            <span>{error}</span>
                            <button onClick={() => fetchStats()} className="dashboard-error-retry">
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="dashboard-loading-grid">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="dashboard-skeleton-card">
                                    <div className="skeleton-shimmer" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Stats Cards */}
                    {!loading && stats && (
                        <>
                            <div className="dashboard-stats-grid">
                                {/* Total Users Card */}
                                <div className="dashboard-stat-card stat-card-total" style={{ animationDelay: '0s' }}>
                                    <div className="stat-card-glow stat-glow-blue" />
                                    <div className="stat-card-inner">
                                        <div className="stat-card-header">
                                            <div className="stat-icon-wrapper stat-icon-blue">
                                                <UsersIcon />
                                            </div>
                                            <div className="stat-trend stat-trend-up">
                                                <TrendUpIcon />
                                                <span>All Time</span>
                                            </div>
                                        </div>
                                        <div className="stat-card-body">
                                            <h2 className="stat-value">
                                                <AnimatedCounter target={stats.totalUserCount} />
                                            </h2>
                                            <p className="stat-label">Total Users</p>
                                        </div>
                                        <div className="stat-card-footer">
                                            <div className="stat-bar-track">
                                                <div className="stat-bar-fill stat-bar-blue" style={{ width: '100%' }} />
                                            </div>
                                            <span className="stat-footer-text">All registered members</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Active Users Card */}
                                <div className="dashboard-stat-card stat-card-active" style={{ animationDelay: '0.1s' }}>
                                    <div className="stat-card-glow stat-glow-emerald" />
                                    <div className="stat-card-inner">
                                        <div className="stat-card-header">
                                            <div className="stat-icon-wrapper stat-icon-emerald">
                                                <ActiveIcon />
                                            </div>
                                            <div className="stat-trend stat-trend-up">
                                                <TrendUpIcon />
                                                <span>{stats.totalUserCount > 0 ? ((stats.activeUserCount / stats.totalUserCount) * 100).toFixed(0) : 0}%</span>
                                            </div>
                                        </div>
                                        <div className="stat-card-body">
                                            <h2 className="stat-value">
                                                <AnimatedCounter target={stats.activeUserCount} />
                                            </h2>
                                            <p className="stat-label">Active Users</p>
                                        </div>
                                        <div className="stat-card-footer">
                                            <div className="stat-bar-track">
                                                <div
                                                    className="stat-bar-fill stat-bar-emerald"
                                                    style={{ width: stats.totalUserCount > 0 ? `${(stats.activeUserCount / stats.totalUserCount) * 100}%` : '0%' }}
                                                />
                                            </div>
                                            <span className="stat-footer-text">Currently active on platform</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Paid Members Card */}
                                <div className="dashboard-stat-card stat-card-paid" style={{ animationDelay: '0.2s' }}>
                                    <div className="stat-card-glow stat-glow-amber" />
                                    <div className="stat-card-inner">
                                        <div className="stat-card-header">
                                            <div className="stat-icon-wrapper stat-icon-amber">
                                                <CrownIcon />
                                            </div>
                                            <div className="stat-trend stat-trend-up">
                                                <TrendUpIcon />
                                                <span>{conversionRate}%</span>
                                            </div>
                                        </div>
                                        <div className="stat-card-body">
                                            <h2 className="stat-value">
                                                <AnimatedCounter target={stats.paidMemberCount} />
                                            </h2>
                                            <p className="stat-label">Premium Members</p>
                                        </div>
                                        <div className="stat-card-footer">
                                            <div className="stat-bar-track">
                                                <div
                                                    className="stat-bar-fill stat-bar-amber"
                                                    style={{ width: stats.totalUserCount > 0 ? `${(stats.paidMemberCount / stats.totalUserCount) * 100}%` : '0%' }}
                                                />
                                            </div>
                                            <span className="stat-footer-text">Paid subscription holders</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Free Members Card */}
                                <div className="dashboard-stat-card stat-card-free" style={{ animationDelay: '0.3s' }}>
                                    <div className="stat-card-glow stat-glow-violet" />
                                    <div className="stat-card-inner">
                                        <div className="stat-card-header">
                                            <div className="stat-icon-wrapper stat-icon-violet">
                                                <FreeIcon />
                                            </div>
                                            <div className="stat-trend stat-trend-neutral">
                                                <span>{stats.totalUserCount > 0 ? ((stats.freeMemberCount / stats.totalUserCount) * 100).toFixed(0) : 0}%</span>
                                            </div>
                                        </div>
                                        <div className="stat-card-body">
                                            <h2 className="stat-value">
                                                <AnimatedCounter target={stats.freeMemberCount} />
                                            </h2>
                                            <p className="stat-label">Free Members</p>
                                        </div>
                                        <div className="stat-card-footer">
                                            <div className="stat-bar-track">
                                                <div
                                                    className="stat-bar-fill stat-bar-violet"
                                                    style={{ width: stats.totalUserCount > 0 ? `${(stats.freeMemberCount / stats.totalUserCount) * 100}%` : '0%' }}
                                                />
                                            </div>
                                            <span className="stat-footer-text">Free tier members</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Revenue Card - spans 2 columns on larger screens */}
                                <div className="dashboard-stat-card stat-card-revenue" style={{ animationDelay: '0.4s' }}>
                                    <div className="stat-card-glow stat-glow-primary" />
                                    <div className="stat-card-inner">
                                        <div className="stat-card-header">
                                            <div className="stat-icon-wrapper stat-icon-primary">
                                                <RevenueIcon />
                                            </div>
                                            <div className="stat-trend stat-trend-up">
                                                <TrendUpIcon />
                                                <span>Revenue</span>
                                            </div>
                                        </div>
                                        <div className="stat-card-body">
                                            <h2 className="stat-value stat-value-revenue">
                                                <AnimatedCounter target={stats.subscriptionAmountEarned} prefix="Rs. " />
                                            </h2>
                                            <p className="stat-label">Subscription Revenue</p>
                                        </div>
                                        <div className="stat-card-footer stat-revenue-footer">
                                            <div className="stat-revenue-meta">
                                                <div className="stat-revenue-meta-item">
                                                    <span className="stat-revenue-meta-label">Avg. per member</span>
                                                    <span className="stat-revenue-meta-value">Rs. {Number(avgRevenuePerPaid).toLocaleString()}</span>
                                                </div>
                                                <div className="stat-revenue-meta-divider" />
                                                <div className="stat-revenue-meta-item">
                                                    <span className="stat-revenue-meta-label">Conversion rate</span>
                                                    <span className="stat-revenue-meta-value">{conversionRate}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Distribution Section */}
                            <div className="dashboard-distribution-section">
                                <h3 className="distribution-title">
                                    <ChartIcon />
                                    <span>Membership Distribution</span>
                                </h3>
                                <div className="distribution-grid">
                                    {/* Donut Visual */}
                                    <div className="distribution-donut-card">
                                        <div className="distribution-donut-wrapper">
                                            <svg viewBox="0 0 200 200" className="distribution-donut-svg">
                                                {/* Background circle */}
                                                <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="24" />
                                                {/* Active users arc */}
                                                <circle
                                                    cx="100" cy="100" r="80"
                                                    fill="none"
                                                    stroke="#10B981"
                                                    strokeWidth="24"
                                                    strokeDasharray={`${stats.totalUserCount > 0 ? (stats.activeUserCount / stats.totalUserCount) * 502.65 : 0} 502.65`}
                                                    strokeLinecap="round"
                                                    transform="rotate(-90 100 100)"
                                                    className="donut-segment"
                                                    style={{ animationDelay: '0.5s' }}
                                                />
                                                {/* Paid arc */}
                                                <circle
                                                    cx="100" cy="100" r="56"
                                                    fill="none"
                                                    stroke="#F59E0B"
                                                    strokeWidth="20"
                                                    strokeDasharray={`${stats.totalUserCount > 0 ? (stats.paidMemberCount / stats.totalUserCount) * 351.86 : 0} 351.86`}
                                                    strokeLinecap="round"
                                                    transform="rotate(-90 100 100)"
                                                    className="donut-segment"
                                                    style={{ animationDelay: '0.7s' }}
                                                />
                                                {/* Center text */}
                                                <text x="100" y="95" textAnchor="middle" className="donut-center-value" fill="var(--text-dark)" fontSize="28" fontWeight="700">
                                                    {stats.totalUserCount}
                                                </text>
                                                <text x="100" y="115" textAnchor="middle" className="donut-center-label" fill="var(--text-light)" fontSize="12">
                                                    Total Users
                                                </text>
                                            </svg>
                                        </div>
                                        <div className="distribution-legend">
                                            <div className="legend-item">
                                                <span className="legend-dot" style={{ background: '#10B981' }} />
                                                <span className="legend-label">Active Users</span>
                                                <span className="legend-value">{stats.activeUserCount}</span>
                                            </div>
                                            <div className="legend-item">
                                                <span className="legend-dot" style={{ background: '#F59E0B' }} />
                                                <span className="legend-label">Premium Members</span>
                                                <span className="legend-value">{stats.paidMemberCount}</span>
                                            </div>
                                            <div className="legend-item">
                                                <span className="legend-dot" style={{ background: '#8B5CF6' }} />
                                                <span className="legend-label">Free Members</span>
                                                <span className="legend-value">{stats.freeMemberCount}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metric Bars */}
                                    <div className="distribution-bars-card">
                                        <div className="metric-bar-item">
                                            <div className="metric-bar-header">
                                                <span className="metric-bar-label">Active vs Total</span>
                                                <span className="metric-bar-percentage">
                                                    {stats.totalUserCount > 0 ? ((stats.activeUserCount / stats.totalUserCount) * 100).toFixed(1) : 0}%
                                                </span>
                                            </div>
                                            <div className="metric-bar-track">
                                                <div
                                                    className="metric-bar-fill metric-bar-emerald"
                                                    style={{ width: stats.totalUserCount > 0 ? `${(stats.activeUserCount / stats.totalUserCount) * 100}%` : '0%' }}
                                                />
                                            </div>
                                        </div>
                                        <div className="metric-bar-item">
                                            <div className="metric-bar-header">
                                                <span className="metric-bar-label">Premium Conversion</span>
                                                <span className="metric-bar-percentage">{conversionRate}%</span>
                                            </div>
                                            <div className="metric-bar-track">
                                                <div
                                                    className="metric-bar-fill metric-bar-amber"
                                                    style={{ width: `${conversionRate}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="metric-bar-item">
                                            <div className="metric-bar-header">
                                                <span className="metric-bar-label">Free Members</span>
                                                <span className="metric-bar-percentage">
                                                    {stats.totalUserCount > 0 ? ((stats.freeMemberCount / stats.totalUserCount) * 100).toFixed(1) : 0}%
                                                </span>
                                            </div>
                                            <div className="metric-bar-track">
                                                <div
                                                    className="metric-bar-fill metric-bar-violet"
                                                    style={{ width: stats.totalUserCount > 0 ? `${(stats.freeMemberCount / stats.totalUserCount) * 100}%` : '0%' }}
                                                />
                                            </div>
                                        </div>

                                        <div className="revenue-highlight-box">
                                            <div className="revenue-highlight-icon">
                                                <RevenueIcon />
                                            </div>
                                            <div className="revenue-highlight-content">
                                                <span className="revenue-highlight-label">Total Revenue</span>
                                                <span className="revenue-highlight-value">Rs. {stats.subscriptionAmountEarned.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}
