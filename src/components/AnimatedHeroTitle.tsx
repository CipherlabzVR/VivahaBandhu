'use client';

interface AnimatedHeroTitleProps {
  line1: string;
  line2: string;
  className?: string;
  /** Delay in ms between each letter */
  letterDelay?: number;
  /** Delay in ms before second line starts */
  line2StartDelay?: number;
}

export default function AnimatedHeroTitle({
  line1,
  line2,
  className = '',
  letterDelay = 55,
  line2StartDelay = 80,
}: AnimatedHeroTitleProps) {
  const chars1 = line1.split('');
  const chars2 = line2.split('');
  const line2BaseDelay = chars1.length * letterDelay + line2StartDelay;

  return (
    <>
      {chars1.map((char, i) => (
        <span
          key={`1-${i}`}
          className="inline-block opacity-0 animate-letter-in"
          style={{ animationDelay: `${i * letterDelay}ms` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
      <br />
      {chars2.map((char, i) => (
        <span
          key={`2-${i}`}
          className="inline-block opacity-0 animate-letter-in"
          style={{ animationDelay: `${line2BaseDelay + i * letterDelay}ms` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </>
  );
}
