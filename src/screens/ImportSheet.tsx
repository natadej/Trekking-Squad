import { useEffect, useState } from 'react';
import type { Trip } from '../types';
import { hotelName, parseBooking, splitFlights } from '../trip';
import { dayLabel, hm } from '../time';
import { HOTELS } from '../data/places';

export default function ImportSheet({ initial, onDone, onClose }: { initial?: string; onDone: (t: Partial<Trip>) => void; onClose: () => void }) {
  const [text, setText] = useState(initial || '');
  const [found, setFound] = useState<Partial<Trip> | null>(null);
  const [miss, setMiss] = useState(false);
  const [pickHotel, setPickHotel] = useState(false);

  const read = (t = text) => {
    const r = parseBooking(t);
    const { arrive, depart } = splitFlights(r.flights);
    const f: Partial<Trip> = {};
    if (arrive) f.arrive = arrive;
    if (depart) f.depart = depart;
    if (r.hotelId) Object.assign(f, { hotelId: r.hotelId, hotelIn: r.hotelIn, hotelOut: r.hotelOut, hotelConfirmation: r.hotelConfirmation });
    setMiss(!Object.keys(f).length);
    setFound(Object.keys(f).length ? f : null);
  };
  useEffect(() => { if (initial) read(initial); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const paste = async () => {
    try { const t = await navigator.clipboard.readText(); setText(t); read(t); } catch { /* user can paste by hand */ }
  };

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head"><h2>📩 Add a booking</h2><button className="x" aria-label="Close" onClick={onClose}>✕</button></div>
        {!found && <>
          <p>Copy your flight or hotel confirmation email, then tap <b>Paste</b>. I'll read it!</p>
          <button className="btn primary big" onClick={paste}>📋 Paste my email</button>
          <textarea style={{ marginTop: 10 }} placeholder="…or paste it here" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn big" disabled={!text.trim()} onClick={() => read()}>🔎 Read it</button>
          {miss && <p className="tip">🤔 I couldn't find a flight or hotel. Try pasting the whole email.</p>}
          <button className="btn ghost big" onClick={() => setPickHotel(!pickHotel)}>🏨 Just pick my hotel</button>
          {pickHotel && <div className="tiles" style={{ marginTop: 8 }}>
            {HOTELS.map((h) => <button key={h.id} className="tile" onClick={() => onDone({ hotelId: h.id })}><span className="ti">{h.icon}</span>{h.short}</button>)}
          </div>}
        </>}
        {found && <>
          <p style={{ fontWeight: 800, fontSize: '1.15rem' }}>Is this your trip?</p>
          <ul className="trip-list card" style={{ marginTop: 8 }}>
            {found.arrive && <li>✈️ <b>{found.arrive.airline} {found.arrive.number}</b> {found.arrive.from} → {found.arrive.to}<br />Lands {dayLabel(found.arrive.arrDate, true)} at {hm(found.arrive.arrTime)}</li>}
            {found.depart && <li>🏠 <b>{found.depart.airline} {found.depart.number}</b> {found.depart.from} → {found.depart.to}<br />Leaves {dayLabel(found.depart.depDate, true)} at {hm(found.depart.depTime)}</li>}
            {found.hotelId && <li>🏨 <b>{hotelName(found.hotelId)}</b>{found.hotelIn && <><br />{dayLabel(found.hotelIn, true)} → {found.hotelOut ? dayLabel(found.hotelOut, true) : '?'}</>}</li>}
          </ul>
          <div className="yesno-btns">
            <button className="btn yes" onClick={() => onDone(found)}>👍 Yes!</button>
            <button className="btn no" onClick={() => { setFound(null); setText(''); }}>👎 No</button>
          </div>
        </>}
      </div>
    </div>
  );
}
