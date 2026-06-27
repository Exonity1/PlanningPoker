import { useState, useEffect } from 'react'
import LandingView from './views/LandingView'
import RoomView from './views/RoomView'
import Header from './components/Header'
import { getOrInitializeUser } from './utils'
import type { ViewType } from './types'

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('landing')
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  
  // Theme state managed globally at root level
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('poker_theme')
    if (saved) {
      return saved === 'dark'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Apply theme class to document element
  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      localStorage.setItem('poker_theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('poker_theme', 'light')
    }
  }, [isDark])

  const toggleTheme = () => setIsDark(prev => !prev)

  // User profile loaded from localStorage/initialized on boot
  const [userSession, setUserSession] = useState<{ userId: string; userName: string }>(() => 
    getOrInitializeUser()
  )

  // SPA Custom Router logic
  useEffect(() => {
    const parseUrlRoute = () => {
      const path = window.location.pathname
      const roomMatch = path.match(/^\/room\/([A-Z0-9]{4,6})$/i)

      if (roomMatch) {
        const roomId = roomMatch[1].toUpperCase()
        setActiveRoomId(roomId)
        setCurrentView('room')
      } else {
        setActiveRoomId(null)
        setCurrentView('landing')
      }
    }

    parseUrlRoute()

    window.addEventListener('popstate', parseUrlRoute)
    return () => window.removeEventListener('popstate', parseUrlRoute)
  }, [])

  const navigateTo = (view: ViewType, roomId: string | null = null) => {
    if (view === 'room' && roomId) {
      const cleanId = roomId.toUpperCase()
      window.history.pushState({}, '', `/room/${cleanId}`)
      setActiveRoomId(cleanId)
      setCurrentView('room')
    } else {
      window.history.pushState({}, '', '/')
      setActiveRoomId(null)
      setCurrentView('landing')
    }
  }

  const handleUpdateName = (newName: string) => {
    setUserSession(prev => ({ ...prev, userName: newName }))
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {currentView === 'landing' ? (
        <>
          <Header
            isDark={isDark}
            onToggleTheme={toggleTheme}
          />
          <LandingView
            initialName={userSession.userName}
            onJoinRoom={(roomId, name) => {
              handleUpdateName(name)
              navigateTo('room', roomId)
            }}
          />
        </>
      ) : (
        activeRoomId && (
          <RoomView
            roomId={activeRoomId}
            userId={userSession.userId}
            userName={userSession.userName}
            onLeave={() => navigateTo('landing')}
            onChangeName={handleUpdateName}
            isDark={isDark}
            onToggleTheme={toggleTheme}
          />
        )
      )}
    </div>
  )
}
