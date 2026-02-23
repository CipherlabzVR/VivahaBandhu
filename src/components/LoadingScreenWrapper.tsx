'use client';

import { useState, useEffect } from 'react';
import LoadingScreen from './LoadingScreen';

const MIN_LOAD_TIME_MS = 1200;
const FADE_OUT_MS = 500;

export default function LoadingScreenWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    let mounted = true;
    const start = Date.now();

    const finish = () => {
      if (!mounted) return;
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_LOAD_TIME_MS - elapsed);
      setTimeout(() => {
        if (mounted) setIsLoading(false);
      }, remaining);
    };

    if (document.readyState === 'complete') {
      finish();
    } else {
      window.addEventListener('load', finish);
    }
    const t = setTimeout(finish, MIN_LOAD_TIME_MS);

    return () => {
      mounted = false;
      window.removeEventListener('load', finish);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const id = setTimeout(() => setShowOverlay(false), FADE_OUT_MS);
      return () => clearTimeout(id);
    }
  }, [isLoading]);

  return (
    <>
      {/* Homepage: hidden until loading screen is gone, then fade in */}
      <div
        className={`min-h-full transition-opacity duration-700 ease-out ${
          showOverlay ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {children}
      </div>
      {showOverlay && (
        <div
          className={`fixed inset-0 z-[9999] transition-opacity duration-500 ease-out ${
            !isLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <LoadingScreen />
        </div>
      )}
    </>
  );
}
