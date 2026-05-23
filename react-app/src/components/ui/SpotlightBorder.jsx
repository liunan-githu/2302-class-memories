import { cn } from '../../utils/cn'

export function SpotlightBorder({ children, className, borderWidth = 1.5 }) {
  return (
    <div className={cn('relative rounded-2xl', className)}>
      <style>{`
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes rotate-border {
          to { --angle: 360deg; }
        }
        .spotlight-rotate {
          animation: rotate-border 4s linear infinite;
        }
      `}</style>
      <div
        className="spotlight-rotate absolute inset-0 rounded-2xl -z-10"
        style={{
          padding: `${borderWidth}px`,
          background: 'conic-gradient(from var(--angle, 0deg), #F59E0B, #FB7185, #2DD4BF, #F59E0B)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      {children}
    </div>
  )
}
