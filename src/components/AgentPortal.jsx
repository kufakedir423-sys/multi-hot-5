import { useEffect, useState } from 'react'
import { collection, doc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../firebase'
import { Balance, Card, Header, btnCls, fmt, inputCls } from './ui'

async function fund(agent, customerRef, amount, type, requestId) {
  await runTransaction(db, async (tx) => {
    const agentRef = doc(db, 'users', agent.uid)
    const reqRef = requestId ? doc(db, 'requests', requestId) : null
    const [aSnap, cSnap, rSnap] = await Promise.all([tx.get(agentRef), tx.get(customerRef), reqRef ? tx.get(reqRef) : Promise.resolve(null)])
    if (!cSnap.exists()) throw new Error('Customer not found')
    if (rSnap && rSnap.data().status !== 'pending') throw new Error('Request is no longer pending')
    if ((aSnap.data().balance || 0) < amount) throw new Error('Not enough coins in your balance')
    tx.update(agentRef, { balance: aSnap.data().balance - amount })
    tx.update(customerRef, { balance: (cSnap.data().balance || 0) + amount })
    if (reqRef) tx.update(reqRef, { status: 'approved', approvedAt: serverTimestamp() })
    tx.set(doc(collection(db, 'transactions')), {
      type, fromUid: agent.uid, fromName: agent.name, fromRole: agent.role, toUid: customerRef.id, toName: cSnap.data().name, toRole: 'Customer', amount, timestamp: serverTimestamp(),
    })
  })
}

export default function AgentPortal({ me }) {
  const [requests, setRequests] = useState([])
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [msg, setMsg] = useState('')
  const [busyId, setBusyId] = useState('')

  useEffect(() => onSnapshot(query(collection(db, 'requests'), where('agentRole', '==', me.role), where('status', '==', 'pending')), (s) =>
    setRequests(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)))), [me.role])

  const approve = async (r) => {
    setBusyId(r.id); setMsg('')
    try { await fund(me, doc(db, 'users', r.customerUid), r.amount, 'AGENT_APPROVE', r.id); setMsg(`Funded ${fmt(r.amount)} coins to ${r.customerName}.`) }
    catch (err) { setMsg(err.message) }
    setBusyId('')
  }

  const direct = async (e) => {
    e.preventDefault()
    const amt = Math.floor(Number(amount))
    if (!(amt > 0)) { setMsg('Enter an amount above 0.'); return }
    setBusyId('direct'); setMsg('')
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()), where('role', '==', 'Customer')))
      if (snap.empty) throw new Error('No customer found with that email')
      await fund(me, snap.docs[0].ref, amt, 'AGENT_DIRECT')
      setMsg(`Sent ${fmt(amt)} coins to ${email.trim()}.`); setEmail(''); setAmount('')
    } catch (err) { setMsg(err.message) }
    setBusyId('')
  }

  return (
    <div className="min-h-screen">
      <Header title={`${me.role} Portal`} name={me.name}><Balance value={me.balance} /></Header>
      <main className="mx-auto max-w-5xl space-y-4 p-4">
        {msg && <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-2 text-sm">{msg}</p>}
        <Card>
          <h2 className="mb-3 font-bold text-amber-300">Pending customer coin requests ({requests.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {requests.map((r) => (
              <div key={r.id} className="rounded-xl border border-zinc-700 p-3">
                <p className="font-bold">{r.customerName}</p>
                <p className="text-sm text-zinc-400">{r.customerEmail}</p>
                <p className="my-2 text-2xl font-black text-amber-300">🪙 {fmt(r.amount)}</p>
                <button className={`${btnCls} w-full`} disabled={busyId === r.id} onClick={() => approve(r)}>Approve &amp; Fund Coins</button>
              </div>
            ))}
            {requests.length === 0 && <p className="text-zinc-500">No pending requests.</p>}
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-bold text-amber-300">Direct fund customer by email</h2>
          <form onSubmit={direct} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input className={inputCls} type="email" placeholder="Customer email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className={inputCls} type="number" min="1" placeholder="Coin amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <button className={btnCls} disabled={busyId === 'direct'}>Send Coins</button>
          </form>
        </Card>
      </main>
    </div>
  )
}
