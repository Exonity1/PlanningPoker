import { useState } from 'react'
import ThemeToggle from './ThemeToggle'
import { Copy, Check, Users, ShieldAlert } from 'lucide-react'
import { isSupabaseConfigured } from '../supabaseClient'

interface HeaderProps {
  roomId?: string
  connectionStatus?: 'connected' | 'connecting' | 'disconnected'
  onLeave?: () => void
  isDark: boolean
  onToggleTheme: () => void
}

export default function Header({ 
  roomId, 
  connectionStatus = 'connected', 
  onLeave,
  isDark,
  onToggleTheme
}: HeaderProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    if (!roomId) return
    const inviteUrl = `${window.location.origin}/room/${roomId}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link: ', err)
    }
  }

  return (
    <header className="w-full max-w-6xl mx-auto px-4 py-4 md:py-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white/30 dark:bg-slate-950/30 backdrop-blur-md sticky top-0 z-50">
      {/* Brand logo / title */}
      <div 
        onClick={onLeave} 
        className="flex items-center gap-2.5 cursor-pointer group"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-md shadow-violet-200 dark:shadow-none transition-transform group-hover:scale-105">
          <Users className="w-5 h-5 text-white" />
        </div>
        <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent group-hover:opacity-85 transition-opacity">
          Planning Poker
        </span>
      </div>

      {/* Center status or active room actions */}
      <div className="flex items-center gap-2 md:gap-4">
        {roomId && (
          <button
            onClick={handleCopyLink}
            className={`
              px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm select-none
              ${copied 
                ? 'bg-emerald-600 text-white' 
                : 'bg-violet-600 hover:bg-violet-500 text-white hover:-translate-y-0.5'
              }
            `}
            id="copy-invite-link-btn"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Copy Invite Link</span>
                <span className="sm:hidden">Copy Link</span>
              </>
            )}
          </button>
        )}

        {/* Connection status dot */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/40">
          {!isSupabaseConfigured ? (
            <>
              <div className="w-2 h-2 rounded-full bg-amber-500 pulse-glow" />
              <span className="text-[10px] md:text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Demo Mode
              </span>
            </>
          ) : connectionStatus === 'connected' ? (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] md:text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Connected
              </span>
            </>
          ) : connectionStatus === 'connecting' ? (
            <>
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span className="text-[10px] md:text-xs font-medium text-amber-600 dark:text-amber-400">
                Connecting...
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-[10px] md:text-xs font-medium text-rose-600 dark:text-rose-400">
                Offline
              </span>
            </>
          )}
        </div>

        {/* Theme toggle & leave button */}
        <div className="flex items-center gap-2">
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          {onLeave && (
            <button
              onClick={onLeave}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-white dark:text-rose-400 hover:bg-rose-600 dark:hover:bg-rose-500/25 border border-rose-200/50 hover:border-transparent dark:border-rose-950 transition-all cursor-pointer"
              id="leave-room-btn"
            >
              Leave
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
