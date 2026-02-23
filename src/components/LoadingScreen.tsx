'use client';

import { useRef, useEffect, useState } from 'react';

/**
 * Matches the reference image exactly:
 *
 * ONE continuous stroke (Figure-8 knot topology):
 * - Left tail sweeps in and down
 * - Crosses bottom-center heading UP-RIGHT
 * - Loops up and over to form the RIGHT lobe
 * - Dips down into the top-center cleft
 * - Loops up and left to form the LEFT lobe
 * - Crosses bottom-center heading DOWN-RIGHT
 * - Sweeps out and up to form the right tail
 */
const HEART_PATH =
  'M 5 25 ' +                  // Start far-left tip
  'C 15 45, 45 50, 60 35 ' +   // Sweep down and up to bottom-center cross
  'C 75 20, 80 5, 60 15 ' +    // Form RIGHT lobe, ending at top-center dip
  'C 40 5, 45 20, 60 35 ' +    // Form LEFT lobe, ending back at bottom-center cross
  'C 75 50, 105 45, 115 25';   // Sweep down and out to far-right tip

const HIDDEN_LENGTH = 500;

export default function LoadingScreen() {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState<number | null>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (path) setPathLength(path.getTotalLength());
  }, []);

  const length = pathLength ?? HIDDEN_LENGTH;
  const ready = pathLength !== null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      aria-hidden="true"
    >
      {/* Transparent blur background */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-xl" />

      {/* Glowing orange line-drawn heart */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <svg
          className="w-64 h-40 md:w-80 md:h-52"
          viewBox="0 0 120 60"
          fill="none"
          aria-hidden="true"
          style={{ overflow: 'visible' }}
        >
          {/* Outer soft glow */}
          <path
            d={HEART_PATH}
            stroke="#F97316"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.08"
            style={{ filter: 'blur(5px)' }}
          />
          {/* Mid glow */}
          <path
            d={HEART_PATH}
            stroke="#FB923C"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.18"
            style={{ filter: 'blur(2px)' }}
          />
          {/* Main stroke — ultra thin, crisp with orange glow */}
          <path
            ref={pathRef}
            d={HEART_PATH}
            stroke="#F97316"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className={ready ? 'animate-heart-draw' : ''}
            style={
              {
                strokeDasharray: length,
                strokeDashoffset: length,
                '--heart-length': length,
                filter:
                  'drop-shadow(0 0 1.5px #F97316) drop-shadow(0 0 4px #FB923C) drop-shadow(0 0 8px #FED7AA)',
              } as React.CSSProperties
            }
          />
        </svg>

        <div className="h-1 w-24 overflow-hidden rounded-full bg-white/30">
          <div className="h-full w-[40%] rounded-full bg-primary animate-loading-bar" />
        </div>
      </div>
    </div>
  );
}