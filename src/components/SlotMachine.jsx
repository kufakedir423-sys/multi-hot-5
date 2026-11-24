import { useEffect, useRef, useState } from 'react'
import { doc, runTransaction } from 'firebase/firestore'
import { db } from '../firebase'
import { btnCls, fmt } from './ui'

const SYMBOLS = {
  seven: { mult: 50, weight: 2, node: <span className="text-2xl font-black text-red-500 drop-shadow">777</span> },
  bell: { mult: 20, weight: 4, node: <span className="text-3xl">🔔</span> },
  bar: { mult: 15, weight: 5, node: <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm font-black text-black">BAR</span> },
  melon: { mult: 10, weight: 8, node: <span className="text-3xl">🍉</span> },
  grapes: { mult: 8, weight: 11, node: <span className="text-3xl">🍇</span> },
  plum: { mult: 6, weight: 14, node: <span className="text-3xl">🫐</span> },
  orange: { mult: 5, weight: 16, node: <span className="text-3xl">🍊</span> },
  lemon: { mult: 4, weight: 18, node: <span className="text-3xl">🍋</span> },
  cherry: { mult: 3, weight: 22, node: <span className="text-3xl">🍒</span> },
}
const KEYS = Object.keys(SYMBOLS)
const TOTAL_W = KEYS.reduce((s, k) => s + SYMBOLS[k].weight, 0)
const LINES = [
  [[0, 0], [0, 1], [0, 2]], [[1, 0], [1, 1], [1, 2]], [[2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 1], [2, 2]], [[2, 0], [1, 1], [0, 2]],
]
const BETS = [10, 25, 50, 100]

const randSym = () => { let r = Math.random() * TOTAL_W; for (const k of KEYS) { r -= SYMBOLS[k].weight; if (r < 0) return k } return 'cherry' }
const randGrid = () => Array.from({ length: 3 }, () => Array.from({ length: 3 }, randSym))

function evaluate(grid, bet) {
  const wins = LINES.filter((l) => l.every(([r, c]) => grid[r][c] === grid[l[0][0]][l[0][1]]))
  const base = wins.reduce((s, l) => s + bet * SYMBOLS[grid[l[0][0]][l[0][1]]].mult, 0)
  const fullScreen = grid.flat().every((s) => s === grid[0][0])
  const bonus = wins.length >= 2 || fullScreen ? 2 + Math.floor(Math.random() * 4) : 1
  const cells = new Set(wins.flatMap((l) => l.map(([r, c]) => `${r}-${c}`)))
  return { wins: wins.length, base, bonus, total: base * bonus, cells }
}

export default function SlotMachine({ me, onFreeze }) {
  const [grid, setGrid] = useState(randGrid)
  const [bet, setBet] = useState(10)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const audio = useRef(null)
  const timers = useRef([])

  useEffect(() => () => { timers.current.forEach((t) => { clearTimeout(t); clearInterval(t) }); audio.current?.close?.() }, [])

  const tone = (freq, dur, type = 'square', vol = 0.05, when = 0) => {
    const ctx = audio.current
    if (!ctx) return
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = type; o.frequency.value = freq
    const t0 = ctx.currentTime + when
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + dur)
  }

  const spin = async () => {
    if (spinning || me.balance < bet) return
    setError(''); setResult(null)
    try {
      audio.current = audio.current || new (window.AudioContext || window.webkitAudioContext)()
      audio.current.resume?.()
    } catch { /* audio is optional */ }
    setSpinning(true)
    const final = randGrid()
    const res = evaluate(final, bet)
    onFreeze(me.balance - bet)
    try {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'users', me.uid)
        const snap = await tx.get(ref)
        const bal = snap.data().balance || 0
        if (bal < bet) throw new Error('Not enough coins')
        tx.update(ref, { balance: bal - bet + res.total })
      })
    } catch (err) { setError(err.message); setSpinning(false); onFreeze(null); return }

    const stopped = [false, false, false]
    const iv = setInterval(() => {
      tone(500 + Math.random() * 300, 0.04, 'square', 0.025)
      setGrid((g) => g.map((row, r) => row.map((s, c) => (stopped[c] ? final[r][c] : randSym()))))
    }, 80)
    timers.current.push(iv)
    ;[0, 1, 2].forEach((c) => {
      timers.current.push(setTimeout(() => {
        stopped[c] = true
        tone(220, 0.12, 'triangle', 0.08)
        if (c === 2) {
          clearInterval(iv)
          setGrid(final); setResult(res); setSpinning(false); onFreeze(null)
          if (res.total > 0) [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sine', 0.1, i * 0.12))
        }
      }, 800 + c * 500))
    })
  }

  return (
    <div className="rounded-3xl border-2 border-amber-400/60 bg-gradient-to-b from-[#2a1245] to-[#120824] p-4 glow-gold">
      <div className="flex items-stretch gap-3">
        <div className="grid flex-1 grid-cols-3 gap-2 rounded-2xl bg-black/60 p-2">
          {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
            <div key={`${r}-${c}`} className={`grid aspect-square place-items-center rounded-xl border-2 border-zinc-700 bg-gradient-to-b from-zinc-100/10 to-zinc-900 ${!spinning && result?.cells.has(`${r}-${c}`) ? 'win-cell' : ''}`}>
              {SYMBOLS[grid[r][c]].node}
            </div>
          )))}
        </div>
        <div className="grid w-14 place-items-center rounded-2xl border border-amber-400 bg-amber-400/10 text-center glow-gold">
          <div><div className="text-2xl font-black text-amber-300">5x</div><div className="text-[10px] text-amber-200">MULTI<br />HOT</div></div>
        </div>
      </div>

      <div className="mt-3 min-h-12 text-center">
        {error && <p className="text-red-400">{error}</p>}
        {result && result.total > 0 && (
          <p className="text-lg font-black text-amber-300">
            WIN +{fmt(result.total)} {result.bonus > 1 && <span className="text-sm text-fuchsia-300">({result.wins} lines · {result.bonus}x bonus!)</span>}
          </p>
        )}
        {result && result.total === 0 && <p className="text-zinc-400">No win. Spin again!</p>}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {BETS.map((b) => (
          <button key={b} disabled={spinning} onClick={() => setBet(b)} className={`rounded-lg border py-2 font-bold ${bet === b ? 'border-amber-400 bg-amber-400 text-black' : 'border-zinc-700'}`}>{b}</button>
        ))}
      </div>
      <button className={`${btnCls} mt-3 w-full py-4 text-2xl tracking-widest`} disabled={spinning || me.balance < bet} onClick={spin}>
        {spinning ? 'SPINNING…' : 'SPIN'}
      </button>
      {me.balance < bet && !spinning && <p className="mt-2 text-center text-sm text-zinc-400">Balance too low for this bet. Request coins from an agent.</p>}
    </div>
  )
}
