import { useState } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { btnCls, inputCls } from './ui'

const ROLES = ['Admin', 'Agent 1', 'Agent 2', 'Customer']

export default function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Customer')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
        await updateProfile(cred.user, { displayName: name.trim() })
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          email: email.trim().toLowerCase(),
          name: name.trim() || email.split('@')[0],
          role,
          balance: 0,
          createdAt: serverTimestamp(),
        })
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-[radial-gradient(ellipse_at_top,#3b0764,#0a0612_60%)]">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-2xl border border-amber-500/30 bg-[#150d24] p-6">
        <div className="text-center">
          <div className="text-5xl">🎰</div>
          <h1 className="text-3xl font-black text-amber-300">Multi Hot 5</h1>
          <p className="text-sm text-zinc-400">{mode === 'login' ? 'Sign in to play' : 'Create your account'}</p>
        </div>
        {mode === 'register' && (
          <>
            <input className={inputCls} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </>
        )}
        <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={inputCls} type="password" placeholder="Password (6+ characters)" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className={`${btnCls} w-full`} disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="w-full text-sm text-amber-300 underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
          {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
