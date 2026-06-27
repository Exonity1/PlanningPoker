import { Coffee, HelpCircle, Check } from 'lucide-react'

interface PokerCardProps {
  value: string
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
  revealed?: boolean
  voted?: boolean
  size?: 'sm' | 'md' | 'lg' | 'table'
  className?: string
}

export default function PokerCard({
  value,
  selected = false,
  onClick,
  disabled = false,
  revealed = false,
  voted = false,
  size = 'md',
  className = ''
}: PokerCardProps) {
  
  // Define sizing classes
  const sizeClasses = {
    sm: 'w-12 h-18 text-base rounded-lg',
    md: 'w-16 h-24 text-xl rounded-xl',
    lg: 'w-20 h-30 text-2xl rounded-2xl md:w-24 md:h-36 md:text-3xl',
    table: 'w-14 h-20 text-lg rounded-xl md:w-16 md:h-24 md:text-xl'
  }[size]

  // Render content helpers
  const renderCardContent = (val: string) => {
    if (val === '☕') {
      return <Coffee className="w-1/2 h-1/2 text-current" />
    }
    if (val === '?') {
      return <HelpCircle className="w-1/2 h-1/2 text-current" />
    }
    return <span className="font-extrabold tracking-tight">{val}</span>
  }

  // Active interaction styles for selectable cards in the deck
  const isSelectable = !!onClick && !disabled

  if (!revealed && !voted && onClick === undefined) {
    // Empty state slot (user hasn't voted yet, displayed on the table)
    return (
      <div 
        className={`
          ${sizeClasses} ${className}
          border-2 border-dashed border-slate-200 dark:border-slate-800
          bg-slate-50/50 dark:bg-slate-900/20
          flex items-center justify-center text-slate-300 dark:text-slate-700
          transition-all duration-300
        `}
      >
        <span className="text-xs font-medium">Voting</span>
      </div>
    )
  }

  // Cards that support 3D flip (either on table or in a result view)
  const isTableCard = onClick === undefined

  if (isTableCard) {
    return (
      <div className={`perspective-1000 ${sizeClasses} ${className} shrink-0 shadow-md`}>
        <div 
          className={`
            relative w-full h-full transition-transform duration-700 preserve-3d
            ${revealed ? 'rotate-y-180' : ''}
          `}
        >
          {/* Card Back (Facedown) - Visible when NOT revealed but user HAS voted */}
          <div 
            className={`
              absolute inset-0 backface-hidden rounded-xl border border-violet-500/30
              shimmer-bg dark:shimmer-bg-dark
              flex items-center justify-center text-white shadow-inner
            `}
          >
            {/* Elegant geometric pattern overlay */}
            <div className="absolute inset-1.5 border border-white/20 rounded-lg flex items-center justify-center overflow-hidden bg-slate-950/10">
              <Check className="w-6 h-6 text-white drop-shadow-md animate-bounce" />
            </div>
          </div>

          {/* Card Front (Faceup) - Visible when REVEALED */}
          <div 
            className={`
              absolute inset-0 backface-hidden rotate-y-180 rounded-xl border-2
              bg-white dark:bg-slate-950
              ${value === '☕' || value === '?'
                ? 'border-slate-300 dark:border-slate-750 text-slate-600 dark:text-slate-300'
                : 'border-violet-500 dark:border-violet-450 text-violet-600 dark:text-violet-400'
              }
              flex items-center justify-center shadow-lg
            `}
          >
            {/* Card corner indicators */}
            <div className="absolute top-1 left-1.5 text-[10px] font-bold opacity-60">
              {value}
            </div>
            <div className="absolute bottom-1 right-1.5 text-[10px] font-bold opacity-60 rotate-180">
              {value}
            </div>

            {/* Central value */}
            {renderCardContent(value)}
          </div>
        </div>
      </div>
    )
  }

  // Selectable cards (Deck View)
  return (
    <button
      onClick={() => isSelectable && onClick()}
      disabled={disabled}
      className={`
        ${sizeClasses} ${className}
        relative shrink-0 flex items-center justify-center select-none cursor-pointer
        border-2 transition-all duration-300 transform-gpu
        ${selected 
          ? 'border-violet-600 bg-violet-50 text-violet-700 dark:border-violet-400 dark:bg-violet-950/40 dark:text-violet-300 -translate-y-4 shadow-violet-200/50 dark:shadow-none shadow-xl scale-105 z-10' 
          : 'border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800/80 hover:-translate-y-2 hover:shadow-lg hover:border-violet-400 dark:hover:border-violet-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed transform-none' : ''}
      `}
      id={`poker-card-${value}`}
    >
      {/* Corner indicators for large selectable cards */}
      {size === 'lg' && (
        <>
          <div className="absolute top-2 left-3 text-xs font-bold opacity-50">
            {value}
          </div>
          <div className="absolute bottom-2 right-3 text-xs font-bold opacity-50 rotate-180">
            {value}
          </div>
        </>
      )}

      {/* Central icon or value */}
      {renderCardContent(value)}
    </button>
  )
}
