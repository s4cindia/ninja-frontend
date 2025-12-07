interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function S4CarlisleLogo({ size = 'md', className = '' }: LogoProps) {
  const sizes = {
    sm: { text: 'text-sm', subtext: 'text-xs' },
    md: { text: 'text-base', subtext: 'text-xs' },
    lg: { text: 'text-xl', subtext: 'text-sm' },
  };

  return (
    <div className={`flex flex-col leading-tight ${className}`}>
      <span className={`font-semibold ${sizes[size].text}`}>
        <span className="text-primary-600">S</span>
        <span className="text-red-600">4</span>
        <span className="text-primary-800">CARLISLE</span>
      </span>
      <span className={`text-gray-500 ${sizes[size].subtext}`}>
        Publishing Services
      </span>
    </div>
  );
}
