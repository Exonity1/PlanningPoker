import React, { useState, useEffect } from 'react'
import { Plus, ArrowRight, ArrowLeft, KeyRound, Sparkles } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../supabaseClient'
import { generateRoomId, saveUserName } from '../utils'

interface LandingViewProps {
  onJoinRoom: (roomId: string, name: string) => void
  initialName: string
}

type FlowState = 'menu' | 'create' | 'join'

export default function LandingView({ onJoinRoom, initialName }: LandingViewProps) {
  const [flow, setFlow] = useState<FlowState>('menu')
  const [name, setName] = useState(initialName)
  const [roomIdInput, setRoomIdInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setName(initialName)
  }, [initialName])

  // Reset inputs when switching flows
  const switchFlow = (newFlow: FlowState) => {
    setFlow(newFlow)
    setErrorMsg(null)
    if (newFlow === 'join') {
      setRoomIdInput('')
    }
  }

  // Handle Room Creation
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('Please enter your name.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    saveUserName(name)

    const generatedId = generateRoomId()

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('rooms')
          .insert([{ id: generatedId, is_revealed: false }])
        
        if (error) throw error
        onJoinRoom(generatedId, name)
      } catch (err: any) {
        console.error('Error creating room in Supabase:', err)
        setErrorMsg(err.message || 'Failed to create room. Please try again.')
      } finally {
        setLoading(false)
      }
    } else {
      // Demo Mode: Mock create room and join instantly
      setTimeout(() => {
        setLoading(false)
        onJoinRoom(generatedId, name)
      }, 800)
    }
  }

  // Handle Room Joining
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('Please enter your name.')
      return
    }
    if (!roomIdInput.trim()) {
      setErrorMsg('Please enter a Room ID.')
      return
    }

    const cleanRoomId = roomIdInput.trim().toUpperCase()
    setLoading(true)
    setErrorMsg(null)
    saveUserName(name)

    if (isSupabaseConfigured) {
      try {
        // Verify room exists in database
        const { data, error } = await supabase
          .from('rooms')
          .select('id')
          .eq('id', cleanRoomId)
          .maybeSingle()

        if (error) throw error
        
        if (!data) {
          setErrorMsg(`Room "${cleanRoomId}" does not exist. Please check the ID.`)
          setLoading(false)
          return
        }

        onJoinRoom(cleanRoomId, name)
      } catch (err: any) {
        console.error('Error joining room:', err)
        setErrorMsg('Failed to join room. Please check database connection.')
      } finally {
        setLoading(false)
      }
    } else {
      // Demo Mode: Join instantly
      setTimeout(() => {
        setLoading(false)
        onJoinRoom(cleanRoomId, name)
      }, 800)
    }
  }

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Decorative gradient glowing blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-violet-400/20 dark:bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-fuchsia-400/20 dark:bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* App Greeting / Intro */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 text-xs font-semibold mb-4 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> Zero friction estimation
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-violet-850 to-fuchsia-600 dark:from-white dark:via-violet-200 dark:to-fuchsia-400 bg-clip-text text-transparent mb-3 leading-tight select-none">
            Snappy Planning Poker
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Estimate instantly with your team. No logins, no passwords, pure real-time magic.
          </p>
        </div>

        {/* Demo Mode Notice */}
        {!isSupabaseConfigured && (
          <div className="mb-6 p-4 rounded-2xl border border-amber-200 bg-amber-50/50 dark:border-amber-950/40 dark:bg-amber-950/20 text-slate-700 dark:text-slate-350 text-xs leading-relaxed shadow-sm">
            <h4 className="font-semibold text-amber-800 dark:text-amber-400 mb-1 flex items-center gap-1">
              🔧 Supabase Configuration Required
            </h4>
            To enable real-time collaboration with teammates, set up your Supabase project credentials in a <code className="bg-amber-100 dark:bg-amber-950/60 p-0.5 px-1 rounded font-mono text-[11px] text-amber-900 dark:text-amber-300">.env</code> file. The app is currently running in <strong>local Demo Mode</strong>.
          </div>
        )}

        {/* Main interactive glassmorphism card */}
        <div className="glass rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200/50 dark:border-slate-800/80 transition-all duration-500 overflow-hidden">
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl border border-rose-200/50 dark:border-rose-950/40 bg-rose-50/50 dark:bg-rose-950/15 text-rose-600 dark:text-rose-400 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* View: Menu Selection */}
          {flow === 'menu' && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button
                onClick={() => switchFlow('create')}
                className="w-full flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
                id="landing-create-btn"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-base">Create Room</div>
                    <div className="text-xs font-normal text-violet-100">Start a new estimation session</div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => switchFlow('join')}
                className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-slate-200 hover:border-violet-400 bg-white dark:bg-slate-900 dark:border-slate-800 dark:hover:border-violet-600 font-bold hover:shadow-lg transition-all duration-300 cursor-pointer group"
                id="landing-join-btn"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div className="text-left text-slate-800 dark:text-slate-100">
                    <div className="font-bold text-base">Join Room</div>
                    <div className="text-xs font-normal text-slate-400 dark:text-slate-500">Connect to an active room</div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}

          {/* View: Create Room Form */}
          {flow === 'create' && (
            <form onSubmit={handleCreateRoom} className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <button
                type="button"
                onClick={() => switchFlow('menu')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-2 cursor-pointer transition-colors self-start"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Jane Cooper"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={25}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm font-medium"
                  autoFocus
                  id="create-name-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 p-3.5 mt-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                id="create-room-submit-btn"
              >
                {loading ? 'Creating Room...' : 'Create & Join'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* View: Join Room Form */}
          {flow === 'join' && (
            <form onSubmit={handleJoinRoom} className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <button
                type="button"
                onClick={() => switchFlow('menu')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-2 cursor-pointer transition-colors self-start"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={25}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm font-medium"
                  id="join-name-input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Room ID
                </label>
                <input
                  type="text"
                  placeholder="e.g., A3C9E"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  maxLength={6}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm font-mono font-bold tracking-widest text-center"
                  id="join-room-id-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 p-3.5 mt-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                id="join-room-submit-btn"
              >
                {loading ? 'Joining Room...' : 'Join Room'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
