import React, { useState, useEffect } from 'react'
import { Plus, ArrowRight, ArrowLeft, KeyRound } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../supabaseClient'
import { generateRoomId, saveUserName } from '../utils'

interface LandingViewProps {
  onJoinRoom: (roomId: string, name: string) => void
  initialName: string
  userId: string
}

type FlowState = 'menu' | 'create' | 'join'

export default function LandingView({ onJoinRoom, initialName, userId }: LandingViewProps) {
  const [flow, setFlow] = useState<FlowState>('menu')
  const [name, setName] = useState(initialName)
  const [roomIdInput, setRoomIdInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setName(initialName)
  }, [initialName])

  const switchFlow = (newFlow: FlowState) => {
    setFlow(newFlow)
    setErrorMsg(null)
    if (newFlow === 'join') {
      setRoomIdInput('')
    }
  }

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
          .insert([{ id: generatedId, is_revealed: false, admin_id: userId }])
        
        if (error) throw error
        onJoinRoom(generatedId, name)
      } catch (err: any) {
        console.error('Error creating room:', err)
        setErrorMsg(err.message || 'Failed to create room. Please try again.')
      } finally {
        setLoading(false)
      }
    } else {
      setTimeout(() => {
        setLoading(false)
        onJoinRoom(generatedId, name)
      }, 500)
    }
  }

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
        const { data, error } = await supabase
          .from('rooms')
          .select('id')
          .eq('id', cleanRoomId)
          .maybeSingle()

        if (error) throw error
        
        if (!data) {
          setErrorMsg(`Room "${cleanRoomId}" does not exist.`)
          setLoading(false)
          return
        }

        onJoinRoom(cleanRoomId, name)
      } catch (err: any) {
        console.error('Error joining room:', err)
        setErrorMsg('Failed to join room. Please check connection.')
      } finally {
        setLoading(false)
      }
    } else {
      setTimeout(() => {
        setLoading(false)
        onJoinRoom(cleanRoomId, name)
      }, 500)
    }
  }

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center px-4 py-8 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <div className="w-full max-w-sm">
        
        {/* Demo Mode Notice */}
        {!isSupabaseConfigured && (
          <div className="mb-4 p-3 rounded-xl border border-amber-200/40 bg-amber-50/20 dark:border-amber-950/20 text-slate-500 dark:text-slate-400 text-xs text-center shadow-sm">
            Supabase not configured. Running in <strong>local Demo Mode</strong>.
          </div>
        )}

        {/* Main Card */}
        <div className="glass rounded-3xl p-6 shadow-md border border-slate-200/50 dark:border-slate-800/80 transition-all duration-300">
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-200 mb-6 text-center select-none">
            Planning Poker
          </h2>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl border border-rose-200/30 bg-rose-50/40 dark:bg-rose-950/10 text-rose-650 dark:text-rose-400 text-xs font-semibold text-center">
              {errorMsg}
            </div>
          )}

          {/* View: Menu */}
          {flow === 'menu' && (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => switchFlow('create')}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all duration-200 cursor-pointer group"
                id="landing-create-btn"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Create Room</span>
                </div>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => switchFlow('join')}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold transition-all duration-200 cursor-pointer group"
                id="landing-join-btn"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  <span>Join Room</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}

          {/* View: Create Room Form */}
          {flow === 'create' && (
            <form onSubmit={handleCreateRoom} className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => switchFlow('menu')}
                className="inline-flex items-center gap-1 text-xs text-slate-450 hover:text-slate-750 dark:hover:text-slate-250 cursor-pointer transition-colors self-start"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={25}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm font-medium"
                  autoFocus
                  id="create-name-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 p-3 mt-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                id="create-room-submit-btn"
              >
                {loading ? 'Creating...' : 'Create & Join'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* View: Join Room Form */}
          {flow === 'join' && (
            <form onSubmit={handleJoinRoom} className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => switchFlow('menu')}
                className="inline-flex items-center gap-1 text-xs text-slate-455 hover:text-slate-750 dark:hover:text-slate-250 cursor-pointer transition-colors self-start"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>

              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={25}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm font-medium"
                  id="join-name-input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  placeholder="Room ID"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  maxLength={6}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm font-mono font-bold tracking-widest text-center"
                  id="join-room-id-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 p-3 mt-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                id="join-room-submit-btn"
              >
                {loading ? 'Joining...' : 'Join Room'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
