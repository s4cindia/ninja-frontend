const s4cSizes = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-10',
} as const;

const ninjaSizes = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-14',
} as const;

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** @deprecated Use showNinjaLogo instead */
  showNinjaText?: boolean;
  showNinjaLogo?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showNinjaLogo, showNinjaText, className = '' }: LogoProps) {
  const showNinja = showNinjaLogo ?? showNinjaText ?? true;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <picture>
        <source srcSet="/s4carlisle-logo.avif" type="image/avif" />
        <img
          src="/s4carlisle-logo.jpg"
          alt="S4Carlisle Publishing Services"
          className={`${s4cSizes[size]} w-auto object-contain`}
          style={{ imageRendering: 'auto' }}
        />
      </picture>
      {showNinja && (
        <div className="border-l border-gray-300 pl-3">
          <picture>
            <source srcSet="/ninja-logo.avif" type="image/avif" />
            <img
              src="/ninja-logo.jpg"
              alt="Ninja - Symphony with AI"
              className={`${ninjaSizes[size]} w-auto object-contain`}
              style={{ imageRendering: 'auto' }}
            />
          </picture>
        </div>
      )}
    </div>
  );
}
