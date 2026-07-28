'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const MessageFloatingButton = dynamic(() => import('./MessageFloatingButton'), {
  ssr: false,
});
const PremiumActivationListener = dynamic(() => import('./PremiumActivationListener'), {
  ssr: false,
});

/**
 * Mount chat / premium listeners after first paint so they do not compete with LCP.
 * Behaviour is unchanged once mounted (a few hundred ms later).
 */
export default function DeferredChrome() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setReady(true);
    };

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(enable, { timeout: 2000 });
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(id);
      };
    }

    const t = window.setTimeout(enable, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  if (!ready) return null;

  return (
    <>
      <MessageFloatingButton />
      <PremiumActivationListener />
    </>
  );
}
