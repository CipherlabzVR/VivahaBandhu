'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface CustomDropdownProps {
    name: string;
    value: string;
    onChange: (name: string, value: string) => void;
    options: { value: string; label: string }[];
    label: string;
    className?: string;
}

export default function CustomDropdown({ name, value, onChange, options, label, className = '' }: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 4, // Fixed positioning is relative to viewport
                left: rect.left,
                width: rect.width
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                dropdownRef.current && 
                !dropdownRef.current.contains(target) &&
                menuRef.current &&
                !menuRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(name, optionValue);
        setIsOpen(false);
        setHoveredIndex(-1);
    };

    const dropdownMenu = isOpen && typeof window !== 'undefined' ? createPortal(
        <div 
            ref={menuRef}
            className="fixed bg-white rounded-xl shadow-2xl border-2 border-primary overflow-hidden"
            style={{ 
                top: `${position.top}px`,
                left: `${position.left}px`,
                width: `${position.width}px`,
                zIndex: 99999,
                maxHeight: '240px'
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="max-h-60 overflow-y-auto">
                {options.map((option, index) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelect(option.value)}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(-1)}
                        className={`w-full px-4 py-3 text-left transition-colors ${
                            hoveredIndex === index || value === option.value
                                ? 'bg-text-dark text-primary font-medium'
                                : 'bg-white text-text-dark hover:bg-text-dark hover:text-primary'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <label className="block text-sm font-medium text-text-dark mb-2">{label}</label>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 border-2 border-primary bg-white rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 hover:border-primary-dark text-text-dark font-medium text-left flex items-center justify-between"
            >
                <span>{selectedOption.label}</span>
                <svg
                    className={`w-5 h-5 text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {dropdownMenu}
        </div>
    );
}

