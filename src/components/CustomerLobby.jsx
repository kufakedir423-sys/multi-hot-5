import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { HandCoins } from 'lucide-react'
import { db } from '../firebase'
import { Balance, Card, Header, btnCls, fmt } from './ui'
import RequestModal from './RequestModal'
import SlotMachine from './SlotMachine'

export default function CustomerLobby({ me }) {
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [frozen, setFrozen] = useState(null)

  useEffect(() => onSnapshot(query(collection(db, 'requests'), where('customerUid', '==', me.uid)), (s) =>
    setHistory(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 10))), [me.uid])

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#3b0764,#0a0612_55%)] pb-10">
      <Header title="Multi Hot 5" name={me.name}><Balance value={frozen ?? me.balance} /></Header>
      <main className="mx-auto max-w-md space-y-4 p-4">
        <button className={`${btnCls} flex w-full items-center justify-center gap-2 py-3 text-lg`} onClick={() => setOpen(true)}>
          <HandCoins /> Request Coins from Agent
        </button>
        <SlotMachine me={me} onFreeze={setFrozen} />
        <Card>
          <h2 className="mb-2 font-bold text-amber-300">Your requests</h2>
          {history.length === 0 && <p className="text-sm text-zinc-500">No requests yet.</p>}
          {history.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-t border-zinc-800 py-1.5 text-sm">
              <span>{fmt(r.amount)} coins · {r.agentRole}</span>
              <span className={r.status === 'approved' ? 'font-bold text-green-400' : 'text-amber-300'}>{r.status}</span>
            </div>
          ))}
        </Card>
      </main>
      {open && <RequestModal me={me} onClose={() => setOpen(false)} />}
    </div>
  )
}
