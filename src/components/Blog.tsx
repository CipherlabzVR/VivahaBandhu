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
            image: 'https://images.unsplash.com/photo-1511285560982-1356c11d4606?w=600',
            category: 'Relationships',
            title: 'How to Discuss Important Topics Before Marriage',
            excerpt: 'Financial planning, family expectations, and more...'
        },
        {
            id: 2,
            image: 'https://images.unsplash.com/photo-1519225421980-715cb0202128?w=600',
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
            image: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600',
            category: 'Dating',
            title: 'First Meeting Tips for Arranged Marriages',
            excerpt: 'Making a great first impression and asking the right questions...'
        }
    ];

    return (
        <section className="blog-section">
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
        </section>
    );
}
