import { useEffect, useState } from 'react';
import { fetchNearby, type NearPlace } from '../nearby';

interface Props { here: { lat: number; lng: number }; visited: Set<string>; onPick: (x: NearPlace) => void; onClose: () => void }

const fmt = (m: number) => (m < 10 ? 'here' : `${Math.round(m)} m`);

export default function WhereSheet({ here, visited, onPick, onClose }: Props) {
  const [list, setList] = useState<NearPlace[]>();
  const [err, setErr] = useState(false);
  useEffect(() => { fetchNearby(here).then(setList).catch(() => setErr(true)); }, [here]);
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet where" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Where are you?">
        <div className="sheet-head"><h2>📍 Where are you?</h2><button className="x" aria-label="Close" onClick={onClose}>✕</button></div>
        <p className="muted">Pick the place you're at to check in.</p>
        {!list && !err && <p className="muted">Looking around you…</p>}
        {err && <p className="tip">Couldn't load nearby places. Check your internet and try again.</p>}
        {list && !list.length && <p className="tip">No named places found within about 100 m.</p>}
        {list && list.length > 0 && <ul className="where-list">
          {list.map((x) => (
            <li key={x.id}>
              <button className="where-row" onClick={() => onPick(x)}>
                <span className="where-ico" aria-hidden>{x.icon}</span>
                <span className="where-txt"><b>{x.name}</b><small>{x.kind} · {fmt(x.d)}</small></span>
                {visited.has(x.id) && <span className="where-done">✓ Visited</span>}
              </button>
            </li>
          ))}
        </ul>}
        <button className="btn no big" onClick={onClose}>None of these</button>
      </div>
    </div>
  );
}
