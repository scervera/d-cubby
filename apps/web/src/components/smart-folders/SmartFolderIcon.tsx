import { useId } from 'react'

/** Purple folder with a gear: the smart folder artwork. */
export default function SmartFolderIcon({ className = 'h-full w-full' }: { className?: string }) {
  const uid = useId().replace(/:/g, '')
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 1200 1200">
      <defs>
        <linearGradient id={`${uid}-gFolder`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CDBAF7"/>
          <stop offset="60%" stopColor="#B79EF0"/>
          <stop offset="100%" stopColor="#A88BEA"/>
        </linearGradient>
        <linearGradient id={`${uid}-gTab`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D8CAF9"/>
          <stop offset="100%" stopColor="#C2AEF3"/>
        </linearGradient>
        <linearGradient id={`${uid}-gSymbol`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B8A0F1"/>
          <stop offset="100%" stopColor="#A58BE9"/>
        </linearGradient>
        <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="16" result="b"/>
          <feOffset dy="14" result="o"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.35"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Folder */}
      <g filter={`url(#${uid}-shadow)`}>
        <path fill={`url(#${uid}-gFolder)`}
          d="M120,270
             q0,-42 29,-71t71,-29
             h248q31,0 54,23l58,58q23,23 54,23h374
             q42,0 71,29t29,71v646
             q0,42 -29,71t-71,29H220
             q-42,0 -71,-29t-29,-71Z"/>
        <path fill={`url(#${uid}-gTab)`}
          d="M120,270
             q0,-42 29,-71t71,-29
             h248q31,0 54,23l58,58q23,23 54,23h225v140H120Z"/>
        <path d="M140 480 H1060" stroke="#E9E0FD" strokeOpacity="0.65" strokeWidth="8"/>
        <g opacity="0.38" stroke="#8E77DE" strokeWidth="6">
          <line x1="120" y1="1000" x2="1080" y2="1000"/>
          <line x1="120" y1="1025" x2="1080" y2="1025"/>
          <line x1="120" y1="1050" x2="1080" y2="1050"/>
        </g>
      </g>

      {/* Gear symbol */}
      <g transform="translate(600,660)" fill={`url(#${uid}-gSymbol)`}>
        <circle r="205"/>
        <g>
          <g transform="rotate(0)"><rect x="-26" y="-305" width="52" height="96" rx="12"/></g>
          <g transform="rotate(30)"><rect x="-26" y="-305" width="52" height="96" rx="12"/></g>
          <g transform="rotate(60)"><rect x="-26" y="-305" width="52" height="96" rx="12"/></g>
          <g transform="rotate(90)"><rect x="-26" y="-305" width="52" height="96" rx="12"/></g>
          <g transform="rotate(120)"><rect x="-26" y="-305" width="52" height="96" rx="12"/></g>
          <g transform="rotate(150)"><rect x="-26" y="-305" width="52" height="96" rx="12"/></g>
          <g transform="rotate(180)"><rect x="-26" y="-305" width="52" height="96" rx="12"/></g>
          <g transform="rotate(210)"><rect x="-26" y="-305" width="52" height="96" rx="12"/></g>
          <g transform="rotate(240)"><rect x="-26" y="-305" width="52" height="96" rx="12"/></g>
          <g transform="rotate(270)"><rect x="-26" y="-305" width="52" height="96" rx="12"/></g>
          <g transform="rotate(300)"><rect x="-26" y="-305" width="52" height="96" rx="12"/></g>
          <g transform="rotate(330)"><rect x="-26" y="-305" width="52" height="96" rx="12"/></g>
        </g>
        <circle r="102" fill="#AD94EC"/>
      </g>
    </svg>
  )
}
