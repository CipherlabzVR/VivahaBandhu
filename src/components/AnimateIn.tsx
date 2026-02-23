'use client';

import { useRef, useState, useEffect, ReactNode } from 'react';

interface AnimateInProps {
  children: ReactNode;
  /** Delay in ms before animation starts (for stagger) */
  delay?: number;
  /** Optional class for the wrapper */
  className?: string;
  /** Root margin for Intersection Observer (e.g. '0px 0px -80px 0px' to trigger earlier) */
  rootMargin?: string;
}

export default function AnimateIn({
  children,
  delay = 0,
  className = '',
  rootMargin = '0px 0px -40px 0px',
}: AnimateInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [delayedShow, setDelayedShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setInView(true);
        });
      },
      { threshold: 0.08, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  useEffect(() => {
    if (!inView) return;
    if (delay <= 0) {
      setDelayedShow(true);
      return;
    }
    const t = setTimeout(() => setDelayedShow(true), delay);
    return () => clearTimeout(t);
  }, [inView, delay]);

  return (
    <div
      ref={ref}
      className={`w-full transition-all duration-700 ease-out ${
        delayedShow
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  );
}
