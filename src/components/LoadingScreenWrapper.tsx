'use client';

import { useState, useEffect } from 'react';
import LoadingScreen from './LoadingScreen';

const MIN_LOAD_TIME_MS = 200;
const FADE_OUT_MS = 200;
const SPLASH_SESSION_KEY = 'mymatch_splash_shown';

export default function LoadingScreenWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Repeat visits: skip splash so LCP is not blocked by an opaque overlay.
    try {
      if (sessionStorage.getItem(SPLASH_SESSION_KEY) === '1') {
        setIsLoading(false);
        setShowOverlay(false);
        return () => {
          mounted = false;
        };
      }
      sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    } catch {
      /* private mode */
    }

    // Do NOT wait for window "load" — that delays until every video/image finishes.
    const id = window.setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, MIN_LOAD_TIME_MS);

    return () => {
      mounted = false;
      window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const id = window.setTimeout(() => setShowOverlay(false), FADE_OUT_MS);
      return () => window.clearTimeout(id);
    }
  }, [isLoading]);

  return (
    <>
      <div className="min-h-full transition-opacity duration-700 ease-out opacity-100">
        {children}
      </div>
      {showOverlay && (
        <div
          className={`fixed inset-0 z-[9999] transition-opacity duration-300 ease-out ${
            !isLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-hidden={!isLoading}
        >
          <LoadingScreen />
        </div>
      )}
    </>
  );
}
