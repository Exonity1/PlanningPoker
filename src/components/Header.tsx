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
          <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-900/80 pl-3 pr-1 py-1 rounded-xl border border-slate-200/50 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Room: <span className="font-mono text-slate-800 dark:text-slate-200">{roomId}</span>
            </span>
            <button
              onClick={handleCopyLink}
              className={`
                px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer
                ${copied 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 dark:border-slate-700'
                }
              `}
              id="copy-invite-link-btn"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Invite</span>
                </>
              )}
            </button>
          </div>
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
