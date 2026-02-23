'use client';

import { useLanguage } from '../context/LanguageContext';

interface BlogProps {
    onOpenBlogDetail: (blogId: number) => void;
}

export default function Blog({ onOpenBlogDetail }: BlogProps) {
    const { t } = useLanguage();
    const blogs = [
        {
            id: 1,
            image: '/blog1.png',
            category: 'Relationships',
            title: 'How to Discuss Important Topics Before Marriage',
            excerpt: 'Financial planning, family expectations, and more...'
        },
        {
            id: 2,
            image: '/blog2.png',
            category: 'Wedding',
            title: 'Top 5 Buddhist Wedding Traditions in Sri Lanka',
            excerpt: 'Understanding the significance of Poruwa ceremony...'
        },
        {
            id: 3,
            image: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600',
            category: 'Safety',
            title: 'Online Matrimony Safety Tips',
            excerpt: 'How to protect yourself while searching for a partner...'
        },
        {
            id: 4,
            image: '/blog4.png',
            category: 'Dating',
            title: 'First Meeting Tips for Arranged Marriages',
            excerpt: 'Making a great first impression and asking the right questions...'
        }
    ];

    return (
        <section className="blog-section relative overflow-hidden !bg-transparent">
            <video
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover"
                aria-hidden
            >
                <source src="/blog.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-cream/65 z-[1]" aria-hidden />
            <div className="relative z-10">
            <div className="section-header">
                <h2>{t('blogAdvice')}</h2>
                <p>{t('blogAdviceDesc')}</p>
            </div>
            <div className="blog-grid">
                {blogs.map((blog) => (
                    <div key={blog.id} className="blog-card">
                        <div className="blog-image">
                            <img 
                                src={blog.image} 
                                alt={blog.title} 
                                className="blog-img"
                            />
                        </div>
                        <div className="blog-content">
                            <span className="blog-cat">{blog.category}</span>
                            <h4>{blog.title}</h4>
                            <p>{blog.excerpt}</p>
                            <button 
                                onClick={() => onOpenBlogDetail(blog.id)}
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: 'var(--primary)', 
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    padding: 0,
                                    textAlign: 'left'
                                }}
                            >
                                {t('readMore')}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            </div>
        </section>
    );
}
