'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface WelcomePopupProps {
    firstName: string;
    onClose: () => void;
}

export default function WelcomePopup({ firstName, onClose }: WelcomePopupProps) {
    const [displayText, setDisplayText] = useState('');
    const fullText = `Welcome ${firstName}`;
    const [showCursor, setShowCursor] = useState(true);

    useEffect(() => {
        let currentIndex = 0;
        const typingInterval = setInterval(() => {
            if (currentIndex < fullText.length) {
                setDisplayText(fullText.substring(0, currentIndex + 1));
                currentIndex++;
            } else {
                clearInterval(typingInterval);
                // Hide cursor after typing is complete
                setTimeout(() => setShowCursor(false), 500);
            }
        }, 100); // Typing speed - 100ms per character

        return () => clearInterval(typingInterval);
    }, [fullText]);

    // Cursor blink animation - only while typing
    useEffect(() => {
        if (displayText.length < fullText.length) {
            const cursorInterval = setInterval(() => {
                setShowCursor(prev => !prev);
            }, 530);
            return () => clearInterval(cursorInterval);
        }
    }, [displayText, fullText]);

    return (
        <div 
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000] animate-[fadeIn_0.3s_ease-in]" 
            onClick={onClose}
        >
            <div 
                className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-12 md:p-16 lg:p-20 max-w-[600px] w-[90%] shadow-2xl animate-[slideUp_0.5s_ease-out] relative" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col items-center gap-10">
                    {/* Logo at top center */}
                    <div className="flex justify-center items-center w-full mb-5">
                        <Image 
                            src="/logo2.png" 
                            alt="VivahaBandhu Logo" 
                            width={200} 
                            height={100}
                            className="max-w-[200px] md:max-w-[150px] h-auto object-contain"
                            priority
                        />
                    </div>
                    
                    {/* Welcome message with typewriter effect */}
                    <div className="flex justify-center items-center w-full min-h-[80px]">
                        <h1 className="font-pacifico text-3xl md:text-4xl lg:text-5xl text-text-dark m-0 text-center font-normal tracking-wide">
                            {displayText}
                            {showCursor && (
                                <span className="inline-block w-[3px] h-12 md:h-10 bg-text-dark ml-1.5 align-baseline animate-[blink_1s_infinite]">
                                    |
                                </span>
                            )}
                        </h1>
                    </div>
                </div>
            </div>
        </div>
    );
}

