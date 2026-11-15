import StatusBadge from './StatusBadge'

const TICKER = ['THE MORE YOU BUY THE MORE YOU SAVE', 'LEATHER JACKET: EQUIPPED', 'BLACKWELL-GRADE SECURITY', 'CUDA CORES: INFINITE', 'RTX ON, TRUST OFF', 'THE AI FACTORY IS OPEN', 'TRILLION DOLLAR RIZZ', 'ONE MORE GPU BRO', 'TOKENS GO BRRR', 'GTC KEYNOTE IN PROGRESS']

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
          <p className="sub">ACCELERATED RELATIONSHIP COMPUTING · POWERED BY JENSEN 🧥</p>
        </div>
        <div className="header-right">
          <StatusBadge tone={online ? 'trusted' : 'idle'} big>{online ? 'CAMERA: ON 🟩' : 'CAMERA: OFF 😴'}</StatusBadge>
        </div>
      </header>
    </>
  )
}
