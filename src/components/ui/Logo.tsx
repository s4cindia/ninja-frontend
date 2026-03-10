interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** @deprecated Use showNinjaLogo instead */
  showNinjaText?: boolean;
  showNinjaLogo?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showNinjaLogo, showNinjaText, className = '' }: LogoProps) {
  const showNinja = showNinjaLogo ?? showNinjaText ?? true;

  const s4cSizes = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
  };

  const ninjaSizes = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/s4carlisle-logo.avif"
        alt="S4Carlisle Publishing Services"
        className={`${s4cSizes[size]} w-auto object-contain`}
        style={{ imageRendering: 'auto' }}
      />
      {showNinja && (
        <div className="border-l pl-3">
          <img
            src="/ninja-logo.jpg"
            alt="Ninja - Symphony with AI"
            className={`${ninjaSizes[size]} w-auto object-contain`}
            style={{ imageRendering: 'auto' }}
          />
        </div>
      )}
    </div>
  );
}
