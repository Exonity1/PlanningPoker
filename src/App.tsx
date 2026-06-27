import { useState, useEffect } from 'react'
import LandingView from './views/LandingView'
import RoomView from './views/RoomView'
import { getOrInitializeUser } from './utils'
import type { ViewType } from './types'

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('landing')
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  
  // User profile loaded from localStorage/initialized on boot
  const [userSession, setUserSession] = useState<{ userId: string; userName: string }>(() => 
    getOrInitializeUser()
  )

  // SPA Custom Router logic
  useEffect(() => {
    // Parse initial path
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

    // Parse route on mount
    parseUrlRoute()

    // Listen to browser back/forward buttons
    window.addEventListener('popstate', parseUrlRoute)
    return () => window.removeEventListener('popstate', parseUrlRoute)
  }, [])

  // Navigation Helper
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

  // Update userName dynamically
  const handleUpdateName = (newName: string) => {
    setUserSession(prev => ({ ...prev, userName: newName }))
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {currentView === 'landing' ? (
        <LandingView
          initialName={userSession.userName}
          onJoinRoom={(roomId, name) => {
            handleUpdateName(name)
            navigateTo('room', roomId)
          }}
        />
      ) : (
        activeRoomId && (
          <RoomView
            roomId={activeRoomId}
            userId={userSession.userId}
            userName={userSession.userName}
            onLeave={() => navigateTo('landing')}
            onChangeName={handleUpdateName}
          />
        )
      )}
    </div>
  )
}
