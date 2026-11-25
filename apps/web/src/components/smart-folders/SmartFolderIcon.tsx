/** A flat folder with a spark cut out of it. Takes its colour from the surrounding text colour. */
export default function SmartFolderIcon({ className = 'h-full w-full' }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 1200 1200" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M120,270 q0,-42 29,-71 t71,-29 h248 q31,0 54,23 l58,58 q23,23 54,23 h374 q42,0 71,29 t29,71 v646 q0,42 -29,71 t-71,29 H220 q-42,0 -71,-29 t-29,-71 Z
           M600,450 Q625,635 810,660 Q625,685 600,870 Q575,685 390,660 Q575,635 600,450 Z"
      />
    </svg>
  )
}
