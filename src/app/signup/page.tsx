'use client';

import { useEffect } from 'react';

/** Shareable sign-up link. Lands on the home page with the register popup open. */
export default function SignupLinkPage() {
  useEffect(() => {
    window.location.replace('/?signup=1');
  }, []);

  return null;
}
