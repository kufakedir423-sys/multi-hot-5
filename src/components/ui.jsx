import { LogOut } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'

export const fmt = (n) => Number(n || 0).toLocaleString()

export function Header({ title, name, children }) {
  return (
    <header className="sticky top-0 z-20 border-b border-amber-500/20 bg-[#0a0612]/95 backdrop-blur px-4 py-3">
      <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-amber-300">{title}</h1>
          <p className="text-xs text-zinc-400">{name}</p>
        </div>
        <div className="flex items-center gap-3">
          {children}
          <button onClick={() => signOut(auth)} className="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </header>
  )
}

export const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-amber-500/20 bg-[#150d24] p-4 ${className}`}>{children}</div>
)

export const inputCls = 'w-full rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 outline-none focus:border-amber-400'
export const btnCls = 'rounded-lg bg-amber-400 px-4 py-2 font-bold text-black hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed'

export function Balance({ value }) {
  return <div className="rounded-xl bg-amber-400/10 border border-amber-400/40 px-3 py-1.5 text-amber-300 font-bold">🪙 {fmt(value)}</div>
}
