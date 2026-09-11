'use client';

import SplitFlapText from './react-bits/SplitFlapText';

type HeroSplitFlapVariant = 'home' | 'page' | 'legal';

type HeroSplitFlapTitleProps = {
  words: string[];
  language?: string;
  variant?: HeroSplitFlapVariant;
  loop?: boolean;
  className?: string;
};

const VARIANT_STYLES: Record<
  HeroSplitFlapVariant,
  {
    tileColor: string;
    textColor: string;
    fontSize: string;
    gap: number;
    cycleDelay: number;
  }
> = {
  home: {
    tileColor: '#2a2118',
    textColor: '#ffa20d',
    fontSize: 'clamp(20px, 4.6vw, 42px)',
    gap: 5,
    cycleDelay: 2400,
  },
  page: {
    tileColor: '#111827',
    textColor: '#fff7ed',
    fontSize: 'clamp(22px, 5.4vw, 48px)',
    gap: 6,
    cycleDelay: 500,
  },
  legal: {
    tileColor: '#111827',
    textColor: '#ffa20d',
    fontSize: 'clamp(20px, 4.2vw, 36px)',
    gap: 4,
    cycleDelay: 500,
  },
};

const prepareWords = (words: string[], language: string) => {
  const cleaned = words.map((word) => String(word ?? '').trim()).filter(Boolean);
  if (language === 'en') {
    return cleaned.map((word) => word.toUpperCase());
  }
  return cleaned;
};

const resolveCharset = (words: string[]) => {
  const joined = words.join('');
  if (/[\u0D80-\u0DFF]/.test(joined)) {
    const unique = Array.from(new Set(joined.replace(/\s/g, '').split(''))).join('');
    return unique || joined;
  }
  return 'alphanumeric' as const;
};

export default function HeroSplitFlapTitle({
  words,
  language = 'en',
  variant = 'page',
  loop,
  className = '',
}: HeroSplitFlapTitleProps) {
  const prepared = prepareWords(words, language);
  const phrases = prepared.length === 1 ? ['', prepared[0]] : prepared;
  const shouldLoop = loop ?? prepared.length > 1;
  const longest = Math.max(1, ...prepared.map((word) => word.length));
  const styles = VARIANT_STYLES[variant];
  const sinhala = language === 'si';

  return (
    <div className="hero-split-flap-wrap">
      <SplitFlapText
        words={phrases}
        loop={shouldLoop}
        padTo={longest}
        charset={resolveCharset(prepared)}
        flipDuration={0.12}
        stagger={0.05}
        cycleDelay={styles.cycleDelay}
        flipsPerChar={sinhala ? 4 : 8}
        tileColor={styles.tileColor}
        textColor={styles.textColor}
        tileRadius={8}
        gap={styles.gap}
        fontSize={styles.fontSize}
        className={`hero-split-flap hero-split-flap--${variant}${sinhala ? ' hero-split-flap--sinhala' : ''}${className ? ` ${className}` : ''}`}
      />
    </div>
  );
}
