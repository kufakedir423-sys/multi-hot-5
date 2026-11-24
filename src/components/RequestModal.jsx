import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { X } from 'lucide-react'
import { db } from '../firebase'
import { btnCls, inputCls } from './ui'

const PRESETS = [100, 500, 1000, 5000]

export default function RequestModal({ me, onClose }) {
  const [agentRole, setAgentRole] = useState('Agent 1')
  const [amount, setAmount] = useState(500)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    const amt = Math.floor(Number(amount))
    if (!(amt > 0)) { setError('Enter an amount above 0.'); return }
    setBusy(true)
    try {
      await addDoc(collection(db, 'requests'), {
        customerUid: me.uid, customerName: me.name, customerEmail: me.email, agentRole, amount: amt, status: 'pending', createdAt: serverTimestamp(),
      })
      onClose()
    } catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-end bg-black/70 p-4 sm:place-items-center" onClick={onClose}>
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-amber-500/30 bg-[#150d24] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-amber-300">Request coins</h2>
          <button onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {['Agent 1', 'Agent 2'].map((r) => (
            <button key={r} onClick={() => setAgentRole(r)} className={`rounded-lg border px-3 py-2 font-bold ${agentRole === r ? 'border-amber-400 bg-amber-400 text-black' : 'border-zinc-700'}`}>{r}</button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setAmount(p)} className={`rounded-lg border py-2 text-sm font-bold ${Number(amount) === p ? 'border-amber-400 bg-amber-400 text-black' : 'border-zinc-700'}`}>{p}</button>
          ))}
        </div>
        <input className={inputCls} type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className={`${btnCls} w-full`} disabled={busy} onClick={submit}>Send request</button>
      </div>
    </div>
  )
}
