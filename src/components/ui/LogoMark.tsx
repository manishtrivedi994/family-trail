interface LogoMarkProps {
  size?: number | string
  className?: string
}

export function LogoMark({ size = 24, className = '' }: LogoMarkProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      <circle cx="12" cy="4" r="2.5" fill="#9B7AFF" />
      <circle cx="5" cy="18" r="2.5" fill="#7C5CFF" />
      <circle cx="19" cy="18" r="2.5" fill="#7C5CFF" />
      <line x1="12" y1="6.5" x2="12" y2="12" stroke="#9B7AFF" strokeWidth="1.5" />
      <line x1="12" y1="12" x2="5" y2="15.5" stroke="#7C5CFF" strokeWidth="1.5" />
      <line x1="12" y1="12" x2="19" y2="15.5" stroke="#7C5CFF" strokeWidth="1.5" />
    </svg>
  )
}
