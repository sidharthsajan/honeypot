import StatusBadge from './StatusBadge'

const TICKER = ['BUY HIGH SELL LOW', 'JENSEN COOKED MY PORTFOLIO', 'STUPIDEST HACK INSHALLAH', '3 AFFAIRS IS CRAZY', 'I APPLIED AS CEO OF NVIDIA', 'THE MORE YOU BUY THE MORE YOU SAVE', 'MY PORTFOLIO IS DOWN BAD AND SO IS MY RELATIONSHIP', 'TRUST ME BRO', 'THIS IS NOT FINANCIAL ADVICE OR RELATIONSHIP ADVICE', 'ALL IN ON ONE IDEA']

export default function Header({ online }) {
  const items = [...TICKER, ...TICKER]
  return (
    <>
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">{items.map((t, i) => <span key={i}>{t} 💀</span>)}</div>
      </div>
      <header className="header">
        <div>
          <h1 className="logo">HONEYPOT<span>.EXE</span></h1>
          <p className="sub">HONEYPOT DETECTOR — SO OUR STOCKS STAY HIGH 📈</p>
        </div>
        <div className="header-right">
          <StatusBadge tone={online ? 'trusted' : 'idle'} big>{online ? 'CAMERA: ON 🟩' : 'CAMERA: OFF 😴'}</StatusBadge>
        </div>
      </header>
    </>
  )
}
