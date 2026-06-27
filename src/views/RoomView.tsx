import React, { useState, useEffect, useRef } from 'react'
import { isSupabaseConfigured, supabase } from '../supabaseClient'
import type { Participant, Room } from '../types'
import { calculateStats, saveUserName } from '../utils'
import PokerCard from '../components/PokerCard'
import Header from '../components/Header'
import { 
  Users, 
  Sparkles, 
  Share2, 
  Check, 
  RefreshCw, 
  Eye, 
  Crown,
  ChevronRight
} from 'lucide-react'
import confetti from 'canvas-confetti'

interface RoomViewProps {
  roomId: string
  userId: string
  userName: string
  onLeave: () => void
  onChangeName: (newName: string) => void
  isDark: boolean
  onToggleTheme: () => void
}

const DECK_CARDS = ['1', '2', '3', '5', '8', '13', '21', '?', '☕']

// Mock names for Demo Mode simulation
const MOCK_TEAM = [
  { user_id: 'sarah-ux', name: 'Sarah (UX)', vote: null as string | null },
  { user_id: 'alex-dev', name: 'Alex (Dev)', vote: null as string | null },
  { user_id: 'marcus-pm', name: 'Marcus (PM)', vote: null as string | null },
]

export default function RoomView({ 
  roomId, 
  userId, 
  userName, 
  onLeave,
  onChangeName,
  isDark,
  onToggleTheme
}: RoomViewProps) {
  const [roomState, setRoomState] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedVote, setSelectedVote] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting')
  
  // Name modal prompt (for users joining directly via URL)
  const [showNameModal, setShowNameModal] = useState(!userName)
  const [inputName, setInputName] = useState(userName)
  const [nameError, setNameError] = useState('')

  // Invite link copied state for the main view
  const [copiedLink, setCopiedLink] = useState(false)

  // References for Supabase Channels
  const presenceChannelRef = useRef<any>(null)
  const dbChannelRef = useRef<any>(null)

  // Simulation timers for Demo Mode
  const demoTimersRef = useRef<number[]>([])

  // Ensure initial room state is set up
  useEffect(() => {
    if (!roomId) return

    setRoomState({
      id: roomId,
      is_revealed: false,
      created_at: new Date().toISOString()
    })

    if (isSupabaseConfigured) {
      fetchRoomState()
    } else {
      // Demo mode initializes participants with mock data
      setConnectionStatus('connected')
      setParticipants([
        { user_id: userId, name: userName || 'You', vote: null },
        ...MOCK_TEAM.map(m => ({ ...m }))
      ])
    }

    return () => {
      // Clean up subscriptions
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current)
      if (dbChannelRef.current) supabase.removeChannel(dbChannelRef.current)
      demoTimersRef.current.forEach(timer => clearTimeout(timer))
    }
  }, [roomId])

  // Watch for username updates (from the prompt modal)
  useEffect(() => {
    if (userName && showNameModal) {
      setShowNameModal(false)
    }
  }, [userName])

  // Fetch Room from DB
  const fetchRoomState = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setRoomState(data)
        // If room is already revealed, let user know
        if (data.is_revealed) {
          // Keep current selection
        }
      } else {
        // Room doesn't exist in DB - auto create it to prevent lock-outs
        const { data: newRoom, error: createError } = await supabase
          .from('rooms')
          .insert([{ id: roomId, is_revealed: false }])
          .select()
          .single()

        if (createError) throw createError
        if (newRoom) setRoomState(newRoom)
      }
    } catch (err) {
      console.error('Error fetching room state:', err)
      setConnectionStatus('disconnected')
    }
  }

  // Subscribe to DB updates and Presence (ONLY after user name is provided)
  useEffect(() => {
    if (!userName || showNameModal || !roomId) return

    if (isSupabaseConfigured) {
      // 1. Subscribe to database changes on rooms
      dbChannelRef.current = supabase
        .channel(`room_db:${roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'rooms',
            filter: `id=eq.${roomId}`
          },
          (payload) => {
            const nextRoom = payload.new as Room
            setRoomState(nextRoom)
            
            // If transitioned back to voting phase, reset local vote
            if (!nextRoom.is_revealed) {
              setSelectedVote(null)
              updatePresenceVote(null)
            }
          }
        )
        .subscribe()

      // 2. Subscribe to Presence channel
      const presenceChannel = supabase.channel(`presence:${roomId}`, {
        config: {
          presence: {
            key: userId,
          },
        },
      })

      presenceChannelRef.current = presenceChannel

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState()
          const list: Participant[] = []
          
          Object.keys(state).forEach((key) => {
            const presences = state[key] as any[]
            if (presences && presences.length > 0) {
              list.push({
                user_id: presences[0].user_id || key,
                name: presences[0].name || 'Collaborator',
                vote: presences[0].vote !== undefined ? presences[0].vote : null,
                online_at: presences[0].online_at
              })
            }
          })

          // Sort participants: user first, then alphabetically
          list.sort((a, b) => {
            if (a.user_id === userId) return -1
            if (b.user_id === userId) return 1
            return a.name.localeCompare(b.name)
          })

          setParticipants(list)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected')
            await presenceChannel.track({
              user_id: userId,
              name: userName,
              vote: selectedVote,
              online_at: new Date().toISOString()
            })
          } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnectionStatus('disconnected')
          } else {
            setConnectionStatus('connecting')
          }
        })

    } else {
      // DEMO MODE - Setup local participant list
      setParticipants([
        { user_id: userId, name: userName, vote: selectedVote },
        ...MOCK_TEAM.map(m => ({ ...m }))
      ])
    }
  }, [userName, showNameModal, roomId])

  // Helper to update vote state in Supabase Presence
  const updatePresenceVote = async (vote: string | null) => {
    if (isSupabaseConfigured && presenceChannelRef.current) {
      await presenceChannelRef.current.track({
        user_id: userId,
        name: userName,
        vote: vote,
        online_at: new Date().toISOString()
      })
    }
  }

  // Handle vote selection
  const handleVote = async (value: string) => {
    if (roomState?.is_revealed) return // Can't vote after reveal

    const nextVote = selectedVote === value ? null : value
    setSelectedVote(nextVote)

    if (isSupabaseConfigured) {
      await updatePresenceVote(nextVote)
    } else {
      // Demo Mode updates
      setParticipants(prev => 
        prev.map(p => p.user_id === userId ? { ...p, vote: nextVote } : p)
      )

      // Simulate teammates voting in Demo Mode
      if (nextVote !== null) {
        simulateTeammateVotes()
      } else {
        // If user retracted vote, reset simulated votes
        resetTeammateVotes()
      }
    }
  }

  // Demo Mode Simulation: Simulate other team members voting
  const simulateTeammateVotes = () => {
    // Clear any existing timers
    demoTimersRef.current.forEach(timer => clearTimeout(timer))
    demoTimersRef.current = []

    // Sarah votes after 1s
    const t1 = window.setTimeout(() => {
      setParticipants(prev => 
        prev.map(p => p.user_id === 'sarah-ux' ? { ...p, vote: getRandomVote() } : p)
      )
    }, 1000)

    // Alex votes after 1.8s
    const t2 = window.setTimeout(() => {
      setParticipants(prev => 
        prev.map(p => p.user_id === 'alex-dev' ? { ...p, vote: getRandomVote() } : p)
      )
    }, 1800)

    // Marcus votes after 2.5s
    const t3 = window.setTimeout(() => {
      setParticipants(prev => 
        prev.map(p => p.user_id === 'marcus-pm' ? { ...p, vote: getRandomVote() } : p)
      )
    }, 2500)

    demoTimersRef.current = [t1, t2, t3]
  }

  const resetTeammateVotes = () => {
    demoTimersRef.current.forEach(timer => clearTimeout(timer))
    demoTimersRef.current = []
    setParticipants(prev => 
      prev.map(p => p.user_id !== userId ? { ...p, vote: null } : p)
    )
  }

  const getRandomVote = () => {
    // Bias towards user's vote or fibonacci sequence
    const rand = Math.random()
    if (selectedVote && rand > 0.4) return selectedVote // 60% chance to vote same as user for consensus!
    
    const options = ['3', '5', '8', '13', '?', '☕']
    return options[Math.floor(Math.random() * options.length)]
  }

  // Reveal all votes
  const handleReveal = async () => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('rooms')
          .update({ is_revealed: true })
          .eq('id', roomId)

        if (error) throw error
      } catch (err) {
        console.error('Error revealing room:', err)
      }
    } else {
      // Demo Mode Reveal
      setRoomState(prev => prev ? { ...prev, is_revealed: true } : null)
      // Force any teammates who haven't voted to vote quickly
      setParticipants(prev => 
        prev.map(p => p.vote === null ? { ...p, vote: getRandomVote() } : p)
      )
    }
  }

  // Reset for next round
  const handleNextRound = async () => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('rooms')
          .update({ is_revealed: false })
          .eq('id', roomId)

        if (error) throw error
      } catch (err) {
        console.error('Error resetting room:', err)
      }
    } else {
      // Demo Mode Reset
      setRoomState(prev => prev ? { ...prev, is_revealed: false } : null)
      setSelectedVote(null)
      resetTeammateVotes()
      setParticipants(prev => 
        prev.map(p => p.user_id === userId ? { ...p, vote: null } : p)
      )
    }
  }

  // Handle direct join username submission
  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputName.trim()) {
      setNameError('Name cannot be empty')
      return
    }
    setNameError('')
    saveUserName(inputName)
    onChangeName(inputName)
    setShowNameModal(false)
  }

  // Copy room link helper
  const handleCopyLink = async () => {
    const inviteUrl = `${window.location.origin}/room/${roomId}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (err) {
      console.error('Clipboard copy error: ', err)
    }
  }

  // Statistics calculation
  const stats = calculateStats(participants)

  // Trigger confetti on 100% consensus when revealed
  useEffect(() => {
    if (roomState?.is_revealed && stats.allAgreed && stats.totalVoted > 1 && stats.consensusValue !== '?' && stats.consensusValue !== '☕') {
      triggerConfetti()
    }
  }, [roomState?.is_revealed])

  const triggerConfetti = () => {
    // Multi-shot confetti for satisfying celebration
    const duration = 2 * 1000
    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ['#8b5cf6', '#d946ef', '#6366f1']
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ['#8b5cf6', '#d946ef', '#6366f1']
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    frame()
  }

  // Check if all active members have voted
  const allParticipantsVoted = participants.length > 0 && participants.every(p => p.vote !== null)

  return (
    <div className="w-full flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <Header 
        roomId={roomId} 
        connectionStatus={connectionStatus} 
        onLeave={onLeave} 
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />

      {/* Main room board layout */}
      <main className="flex-1 flex flex-col justify-between max-w-6xl w-full mx-auto p-4 md:p-6 pb-32">
        
        {/* Table & Stats Panel */}
        <div className="flex-1 flex flex-col items-center justify-center py-6 md:py-10">
          
          {/* Copy Invite Link Action Button */}
          <div className="mb-6 z-20">
            <button
              onClick={handleCopyLink}
              className={`
                px-5 py-3 rounded-2xl font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all select-none text-sm md:text-base hover:scale-102
                ${copiedLink 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-violet-600 hover:bg-violet-500 text-white hover:-translate-y-0.5'
                }
              `}
              id="main-copy-invite-btn"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 md:w-5 md:h-5" />
                  <span>Invite Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                  <span>Copy Invite Link</span>
                </>
              )}
            </button>
          </div>

          {/* Main Poker Table Container */}
          <div className="relative w-full max-w-3xl aspect-[2/1] rounded-[48px] border border-slate-200/60 dark:border-slate-800/80 bg-slate-100/30 dark:bg-slate-900/30 backdrop-blur-md flex flex-col items-center justify-center shadow-lg overflow-visible py-8">
            
            {/* Table center (revealed stats or waiting status) */}
            <div className="z-15 text-center px-4 max-w-xs transition-all duration-500">
              {roomState?.is_revealed ? (
                <div className="animate-in zoom-in-95 duration-500 flex flex-col items-center">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200/40 dark:bg-slate-800/80 backdrop-blur border border-slate-350/20 text-slate-850 dark:text-slate-250 text-xs font-semibold mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" /> Result Revealed
                  </div>
                  
                  {stats.average !== null ? (
                    <>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-450 dark:text-slate-500">
                        Average Vote
                      </span>
                      <span className="text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-2 select-none">
                        {stats.average}
                      </span>
                    </>
                  ) : (
                    <span className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-3 select-none">
                      Non-numeric Votes Only
                    </span>
                  )}

                  {stats.allAgreed && stats.totalVoted > 1 ? (
                    <div className="text-xs text-violet-750 dark:text-violet-300 font-bold bg-violet-50 dark:bg-violet-950/40 px-3 py-1.5 rounded-xl border border-violet-200 dark:border-violet-900/40 shadow-sm">
                      🎉 100% Consensus ({stats.consensusValue})
                    </div>
                  ) : stats.totalVoted > 0 ? (
                    <span className="text-xs text-slate-550 dark:text-slate-400 font-medium">
                      Consensus: <strong className="text-slate-800 dark:text-slate-250">{stats.consensusPercent}%</strong> ({stats.consensusValue})
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-slate-250/50 dark:bg-slate-900/50 flex items-center justify-center text-slate-500 dark:text-slate-450 mb-3 animate-pulse">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1 select-none">
                    Voting in Progress
                  </h3>
                  <p className="text-xs text-slate-450 dark:text-slate-500">
                    {stats.totalVoted} of {stats.totalParticipants} voted
                  </p>
                </div>
              )}
            </div>

            {/* Render participants positioned around the table */}
            {participants.map((p, index) => {
              // Calculate angular position around table
              // Formula distributes users evenly around an oval
              const total = participants.length
              const angle = (index / total) * 2 * Math.PI + Math.PI / 2 // offset by 90deg (top)
              
              // Map to coordinates (X radius 45%, Y radius 42% of table bounds)
              const x = 50 + 44 * Math.cos(angle)
              const y = 50 + 38 * Math.sin(angle)

              const isMe = p.user_id === userId
              const hasVoted = p.vote !== null

              return (
                <div 
                  key={p.user_id}
                  style={{
                    position: 'absolute',
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="z-10 flex flex-col items-center transition-all duration-500"
                >
                  {/* Participant card indicator */}
                  <div className="mb-2 relative">
                    <PokerCard
                      value={p.vote || ''}
                      revealed={roomState?.is_revealed}
                      voted={hasVoted}
                      size="table"
                    />
                    
                    {/* Crown on creator / user avatar indicator */}
                    {isMe && (
                      <div className="absolute -top-2.5 -left-2.5 bg-violet-600 text-white p-1 rounded-full shadow-md">
                        <Crown className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Participant details capsule */}
                  <div className="glass shadow-md px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/20 max-w-[120px]">
                    <div className={`w-2 h-2 rounded-full ${hasVoted ? 'bg-violet-500' : 'bg-slate-350 dark:bg-slate-700 animate-pulse'}`} />
                    <span className="text-xs font-semibold truncate dark:text-slate-200 select-none">
                      {isMe ? 'You' : p.name}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

        </div>

        {/* Global actions row (Reveal / Next Round) */}
        <div className="flex items-center justify-center gap-3 my-6">
          {!roomState?.is_revealed ? (
            <button
              onClick={handleReveal}
              disabled={stats.totalVoted === 0}
              className={`
                px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 cursor-pointer shadow-lg transition-all duration-300
                ${stats.totalVoted > 0
                  ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-200 dark:shadow-none scale-100 hover:scale-102'
                  : 'bg-slate-200 dark:bg-slate-900 text-slate-400 dark:text-slate-655 cursor-not-allowed'
                }
                ${allParticipantsVoted ? 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-slate-950 animate-pulse' : ''}
              `}
              id="reveal-cards-btn"
            >
              <Eye className="w-5 h-5" />
              Reveal Cards
            </button>
          ) : (
            <button
              onClick={handleNextRound}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-xl transition-all scale-100 hover:scale-102"
              id="next-round-btn"
            >
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
              Next Round
            </button>
          )}
          
          {selectedVote && !roomState?.is_revealed && (
            <button
              onClick={() => handleVote(selectedVote)}
              className="px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold transition-all cursor-pointer shadow"
              id="clear-vote-btn"
            >
              Clear Vote
            </button>
          )}
        </div>

        {/* Bottom Panel: Voting Deck */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-t border-slate-100 dark:border-slate-900/60 py-4 px-4 z-40">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 select-none">
              {roomState?.is_revealed ? 'Estimate locked for this round' : 'Select your estimate'}
            </div>

            {/* Sliding deck of cards */}
            <div className="flex gap-2.5 md:gap-3.5 max-w-full overflow-x-auto pb-2 px-4 no-scrollbar scroll-smooth">
              {DECK_CARDS.map(val => (
                <PokerCard
                  key={val}
                  value={val}
                  selected={selectedVote === val}
                  disabled={roomState?.is_revealed}
                  onClick={() => handleVote(val)}
                  size="lg"
                />
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* Name Input Intercept Modal (For users direct-joining via invite link) */}
      {showNameModal && (
        <div className="fixed inset-0 bg-slate-900/65 dark:bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-99 animate-in fade-in duration-300">
          <div className="glass max-w-md w-full rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white">
                <Users className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-bold dark:text-white select-none">Join Room {roomId}</h2>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Enter your name below so teammates can see you at the table.
            </p>

            {nameError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-xs font-semibold text-rose-600 dark:text-rose-450">
                {nameError}
              </div>
            )}

            <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. David Jones"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  maxLength={25}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm font-medium"
                  autoFocus
                  id="direct-join-name-input"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                id="direct-join-submit-btn"
              >
                Enter Poker Room <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
