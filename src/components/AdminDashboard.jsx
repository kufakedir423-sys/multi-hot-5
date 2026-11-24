import { useEffect, useState } from 'react'
import { collection, doc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../firebase'
import { Card, Header, btnCls, fmt, inputCls } from './ui'

export default function AdminDashboard({ me }) {
  const [agents, setAgents] = useState([])
  const [txs, setTxs] = useState([])
  const [issued, setIssued] = useState(0)
  const [agentUid, setAgentUid] = useState('')
  const [amount, setAmount] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => onSnapshot(query(collection(db, 'users'), where('role', 'in', ['Agent 1', 'Agent 2'])), (s) => {
    const list = s.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => a.role.localeCompare(b.role))
    setAgents(list)
    setAgentUid((cur) => cur || list[0]?.uid || '')
  }), [])

  useEffect(() => onSnapshot(query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(40)), (s) =>
    setTxs(s.docs.map((d) => ({ id: d.id, ...d.data() })))), [])

  useEffect(() => onSnapshot(query(collection(db, 'transactions'), where('type', '==', 'ADMIN_ISSUE')), (s) =>
    setIssued(s.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0))), [])

  const release = async (e) => {
    e.preventDefault()
    const amt = Math.floor(Number(amount))
    if (!agentUid || !(amt > 0)) { setMsg('Pick an agent and enter an amount above 0.'); return }
    setBusy(true); setMsg('')
    try {
      const target = agents.find((a) => a.uid === agentUid)
      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'users', agentUid)
        const snap = await tx.get(ref)
        if (!snap.exists()) throw new Error('Agent not found')
        tx.update(ref, { balance: (snap.data().balance || 0) + amt })
        tx.set(doc(collection(db, 'transactions')), {
          type: 'ADMIN_ISSUE', fromUid: me.uid, fromName: me.name, toRole: target.role, toUid: agentUid, toName: target.name, amount: amt, timestamp: serverTimestamp(),
        })
      })
      setAmount(''); setMsg(`Released ${fmt(amt)} coins to ${target.name}.`)
    } catch (err) { setMsg(err.message) }
    setBusy(false)
  }

  return (
    <div className="min-h-screen">
      <Header title="Admin Dashboard" name={me.name}>
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-sm text-amber-300">Total issued: <b>{fmt(issued)}</b></div>
      </Header>
      <main className="mx-auto max-w-5xl space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {['Agent 1', 'Agent 2'].map((r) => {
            const list = agents.filter((a) => a.role === r)
            return (
              <Card key={r}>
                <p className="text-sm text-zinc-400">{r}</p>
                {list.length === 0 && <p className="text-zinc-500">No agent registered yet</p>}
                {list.map((a) => (
                  <div key={a.uid} className="flex items-baseline justify-between">
                    <span>{a.name}</span><b className="text-2xl text-amber-300">🪙 {fmt(a.balance)}</b>
                  </div>
                ))}
              </Card>
            )
          })}
        </div>

        <Card>
          <h2 className="mb-3 font-bold text-amber-300">Release coins / bono to agent</h2>
          <form onSubmit={release} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <select className={inputCls} value={agentUid} onChange={(e) => setAgentUid(e.target.value)}>
              {agents.map((a) => <option key={a.uid} value={a.uid}>{a.role} — {a.name}</option>)}
            </select>
            <input className={inputCls} type="number" min="1" placeholder="Coin amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button className={btnCls} disabled={busy || agents.length === 0}>Release Coins</button>
          </form>
          {msg && <p className="mt-2 text-sm text-zinc-300">{msg}</p>}
        </Card>

        <Card className="overflow-x-auto">
          <h2 className="mb-3 font-bold text-amber-300">Recent transactions</h2>
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-zinc-400"><tr><th className="py-1">Time</th><th>Type</th><th>From</th><th>To</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id} className="border-t border-zinc-800">
                  <td className="py-1.5">{t.timestamp?.toDate().toLocaleString() || '…'}</td>
                  <td>{t.type}</td>
                  <td>{t.fromName || 'Admin'}</td>
                  <td>{t.toName || t.toRole}</td>
                  <td className="text-right font-bold text-amber-300">{fmt(t.amount)}</td>
                </tr>
              ))}
              {txs.length === 0 && <tr><td colSpan="5" className="py-4 text-center text-zinc-500">No transactions yet</td></tr>}
            </tbody>
          </table>
        </Card>
      </main>
    </div>
  )
}
