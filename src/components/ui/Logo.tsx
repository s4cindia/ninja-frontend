interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showNinjaText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showNinjaText = true, className = '' }: LogoProps) {
  const sizes = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src="/s4carlisle-logo.avif" 
        alt="S4Carlisle Publishing Services" 
        className={`${sizes[size]} w-auto object-contain`}
      />
      {showNinjaText && (
        <div className="border-l pl-3">
          <span className="font-semibold text-gray-900">Ninja Platform</span>
        </div>
      )}
    </div>
  );
}
