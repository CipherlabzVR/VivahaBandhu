export default function Testimonials() {
    return (
        <section className="py-24 px-4 bg-white">
            <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-4xl md:text-5xl font-playfair font-bold text-text-dark mb-4">Success Stories</h2>
                <p className="text-text-light text-lg md:text-xl">Real stories from couples who found love on VivahaBandhu.</p>
            </div>
            <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-cream rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                    <p className="text-text-dark mb-6 text-lg leading-relaxed">&quot;I found my soulmate within 2 months! The detailed profiles and verification process gave me confidence.&quot;</p>
                    <div className="flex items-center gap-4">
                        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" alt="User" className="w-16 h-16 rounded-full object-cover" />
                        <div>
                            <h5 className="font-playfair font-semibold text-text-dark">Nimali & Kasun</h5>
                            <span className="text-text-light text-sm">Married in 2024</span>
                        </div>
                    </div>
                </div>
                <div className="bg-cream rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                    <p className="text-text-dark mb-6 text-lg leading-relaxed">&quot;Highly recommended for serious marriage seekers. The match suggestions were very accurate.&quot;</p>
                    <div className="flex items-center gap-4">
                        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" alt="User" className="w-16 h-16 rounded-full object-cover" />
                        <div>
                            <h5 className="font-playfair font-semibold text-text-dark">Dilshan & Amaya</h5>
                            <span className="text-text-light text-sm">Married in 2025</span>
                        </div>
                    </div>
                </div>
                <div className="bg-cream rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                    <p className="text-text-dark mb-6 text-lg leading-relaxed">&quot;Great platform for parents looking for partners for their children. Secure and easy to use.&quot;</p>
                    <div className="flex items-center gap-4">
                        <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100" alt="User" className="w-16 h-16 rounded-full object-cover" />
                        <div>
                            <h5 className="font-playfair font-semibold text-text-dark">Mrs. Perera</h5>
                            <span className="text-text-light text-sm">Mother of Groom</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
