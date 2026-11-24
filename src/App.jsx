import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase'
import AuthScreen from './components/AuthScreen'
import AdminDashboard from './components/AdminDashboard'
import AgentPortal from './components/AgentPortal'
import CustomerLobby from './components/CustomerLobby'

export default function App() {
  const [authUser, setAuthUser] = useState(undefined)
  const [profile, setProfile] = useState(null)

  useEffect(() => onAuthStateChanged(auth, (u) => setAuthUser(u)), [])

  useEffect(() => {
    if (!authUser) { setProfile(null); return }
    return onSnapshot(doc(db, 'users', authUser.uid), (s) =>
      setProfile(s.exists() ? { uid: s.id, ...s.data() } : null)
    )
  }, [authUser])

  if (authUser === undefined || (authUser && !profile)) {
    return <div className="min-h-screen grid place-items-center text-amber-300">Loading…</div>
  }
  if (!authUser) return <AuthScreen />
  if (profile.role === 'Admin') return <AdminDashboard me={profile} />
  if (profile.role === 'Agent 1' || profile.role === 'Agent 2') return <AgentPortal me={profile} />
  return <CustomerLobby me={profile} />
}
