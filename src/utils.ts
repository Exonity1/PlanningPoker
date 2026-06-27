import type { Participant } from './types'

// Generate a random 5-character alphanumeric Room ID
export function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed easily confused characters (I, O, 0, 1)
  let result = ''
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Generate a random UUID/ID fallback
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Initialize user session in localStorage
export function getOrInitializeUser() {
  let userId = localStorage.getItem('poker_user_id')
  if (!userId) {
    userId = generateUUID()
    localStorage.setItem('poker_user_id', userId)
  }
  const userName = localStorage.getItem('poker_user_name') || ''
  return { userId, userName }
}

export function saveUserName(name: string) {
  localStorage.setItem('poker_user_name', name.trim())
}

// Calculate statistics from votes
export interface VoteStats {
  average: number | null;
  consensusPercent: number;
  consensusValue: string | null;
  distribution: { [vote: string]: number };
  totalVoted: number;
  totalParticipants: number;
  allAgreed: boolean;
}

export function calculateStats(participants: Participant[]): VoteStats {
  const activeParticipants = participants.filter(p => p.vote !== null)
  const totalParticipants = participants.length
  const totalVoted = activeParticipants.length

  const distribution: { [vote: string]: number } = {}
  let numericSum = 0
  let numericCount = 0

  activeParticipants.forEach(p => {
    const vote = p.vote!
    distribution[vote] = (distribution[vote] || 0) + 1

    const numValue = parseFloat(vote)
    if (!isNaN(numValue)) {
      numericSum += numValue
      numericCount++
    }
  })

  const average = numericCount > 0 ? parseFloat((numericSum / numericCount).toFixed(1)) : null

  // Find most common vote for consensus
  let maxCount = 0
  let consensusValue: string | null = null

  Object.entries(distribution).forEach(([vote, count]) => {
    if (count > maxCount) {
      maxCount = count
      consensusValue = vote
    }
  })

  const consensusPercent = totalVoted > 0 ? Math.round((maxCount / totalVoted) * 100) : 0
  const allAgreed = totalVoted > 0 && maxCount === totalVoted

  return {
    average,
    consensusPercent,
    consensusValue: allAgreed ? consensusValue : null,
    distribution,
    totalVoted,
    totalParticipants,
    allAgreed
  }
}
