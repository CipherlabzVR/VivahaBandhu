'use client';

export default function Categories() {
    const scrollToSearch = () => {
        const search = document.getElementById('search');
        if (search) search.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <section className="py-24 px-4 bg-white">
            <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-4xl md:text-5xl font-playfair font-bold text-text-dark">Browse by Category</h2>
            </div>
            <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="bg-cream rounded-3xl p-8 text-center cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1" onClick={scrollToSearch}>
                    <span className="text-5xl mb-4 block">🕉️</span>
                    <h4 className="text-xl font-playfair font-semibold text-text-dark mb-2">Religion</h4>
                    <p className="text-text-light">Buddhist, Hindu, Christian...</p>
                </div>
                <div className="bg-cream rounded-3xl p-8 text-center cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1" onClick={scrollToSearch}>
                    <span className="text-5xl mb-4 block">📍</span>
                    <h4 className="text-xl font-playfair font-semibold text-text-dark mb-2">Location</h4>
                    <p className="text-text-light">Colombo, Kandy, Galle...</p>
                </div>
                <div className="bg-cream rounded-3xl p-8 text-center cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1" onClick={scrollToSearch}>
                    <span className="text-5xl mb-4 block">💼</span>
                    <h4 className="text-xl font-playfair font-semibold text-text-dark mb-2">Profession</h4>
                    <p className="text-text-light">Engineer, Doctor, Teacher...</p>
                </div>
                <div className="bg-cream rounded-3xl p-8 text-center cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1" onClick={scrollToSearch}>
                    <span className="text-5xl mb-4 block">🎓</span>
                    <h4 className="text-xl font-playfair font-semibold text-text-dark mb-2">Education</h4>
                    <p className="text-text-light">Degree, Masters, PhD...</p>
                </div>
            </div>
        </section>
    );
}
