import { useEffect, useState } from 'react';
import type { Flight, Trip } from '../types';
import { findHotels, flightCode, hotelName, parseBooking, splitFlights } from '../trip';
import { EP } from '../episode';
import { CONTEST } from '../trophy';
import { dayLabel, hm } from '../time';
import { HOTELS } from '../data/places';

export default function ImportSheet({ initial, onDone, onClose }: { initial?: string; onDone: (t: Partial<Trip>) => void; onClose: () => void }) {
  const [text, setText] = useState(initial || '');
  const [found, setFound] = useState<Partial<Trip> | null>(null);
  const [miss, setMiss] = useState(false);
  const [pickHotel, setPickHotel] = useState(false);
  const [typing, setTyping] = useState(false);
  const [f, setF] = useState({ inNo: '', inDate: CONTEST.start, inTime: '', outNo: '', outDate: CONTEST.end, outTime: '', hotel: '', hotelId: '', hIn: CONTEST.start, hOut: CONTEST.end });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const hotels = f.hotelId ? [] : findHotels(f.hotel);
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
  const flight = (no: string, date: string, time: string, arriving: boolean): Flight | undefined => {
    const c = flightCode(no); if (!c) return;
    const t = time ? toMin(time) : arriving ? 15 * 60 : 12 * 60;
    return { airline: c.airline, number: c.number, from: arriving ? 'Home' : EP.airport, to: arriving ? EP.airport : 'Home', depDate: date, depTime: arriving ? Math.max(0, t - 120) : t, arrDate: date, arrTime: arriving ? t : t + 120 };
  };
  const badIn = !!f.inNo && !flightCode(f.inNo), badOut = !!f.outNo && !flightCode(f.outNo);
  const check = () => {
    const r: Partial<Trip> = {};
    const a = flight(f.inNo, f.inDate, f.inTime, true), d = flight(f.outNo, f.outDate, f.outTime, false);
    if (a) r.arrive = a;
    if (d) r.depart = d;
    const h = f.hotelId || hotels[0]?.id;
    if (h) Object.assign(r, { hotelId: h, hotelIn: f.hIn, hotelOut: f.hOut });
    setMiss(!Object.keys(r).length);
    setFound(Object.keys(r).length ? r : null);
  };

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
        {!found && !typing && <>
          <p>Copy your flight or hotel confirmation email, then tap <b>Paste</b>. I'll read it!</p>
          <button className="btn primary big" onClick={paste}>📋 Paste my email</button>
          <textarea style={{ marginTop: 10 }} placeholder="…or paste it here" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn big" disabled={!text.trim()} onClick={() => read()}>🔎 Read it</button>
          {miss && <p className="tip">🤔 I couldn't find a flight or hotel. Try pasting the whole email.</p>}
          <button className="btn big" onClick={() => { setTyping(true); setMiss(false); }}>✍️ No email? Type flight and hotel</button>
          <button className="btn ghost big" onClick={() => setPickHotel(!pickHotel)}>🏨 Just pick my hotel</button>
          {pickHotel && <div className="tiles" style={{ marginTop: 8 }}>
            {HOTELS.map((h) => <button key={h.id} className="tile" onClick={() => onDone({ hotelId: h.id })}><span className="ti">{h.icon}</span>{h.short}</button>)}
          </div>}
        </>}
        {!found && typing && <div className="type-form">
          <p className="muted">Type what you know. I'll fill in the rest and show it to you before saving.</p>
          <h3>✈️ Flight in</h3>
          <label>Flight number<input placeholder="e.g. UA 1234" value={f.inNo} onChange={set('inNo')} autoCapitalize="characters" /></label>
          {badIn && <p className="tip">Use the airline code and number, like UA 1234.</p>}
          {f.inNo && flightCode(f.inNo) && <p className="ok-line">✓ {flightCode(f.inNo)!.airline}</p>}
          <div className="two"><label>Date<input type="date" value={f.inDate} onChange={set('inDate')} /></label><label>Lands at<input type="time" value={f.inTime} onChange={set('inTime')} /></label></div>
          <h3>🏠 Flight home</h3>
          <label>Flight number<input placeholder="e.g. UA 1235" value={f.outNo} onChange={set('outNo')} autoCapitalize="characters" /></label>
          {badOut && <p className="tip">Use the airline code and number, like UA 1235.</p>}
          {f.outNo && flightCode(f.outNo) && <p className="ok-line">✓ {flightCode(f.outNo)!.airline}</p>}
          <div className="two"><label>Date<input type="date" value={f.outDate} onChange={set('outDate')} /></label><label>Takes off<input type="time" value={f.outTime} onChange={set('outTime')} /></label></div>
          <h3>🏨 Hotel</h3>
          <label>Hotel name<input placeholder="e.g. Venetian" value={f.hotelId ? hotelName(f.hotelId) : f.hotel} onChange={(e) => setF({ ...f, hotel: e.target.value, hotelId: '' })} /></label>
          {hotels.length > 0 && <div className="chips">{hotels.slice(0, 6).map((h) => <button key={h.id} className="chip" onClick={() => setF({ ...f, hotelId: h.id })}>{h.icon} {h.short}</button>)}</div>}
          {f.hotel && !f.hotelId && !hotels.length && <p className="tip">Not found. Try another word, or pick from the list.</p>}
          <div className="two"><label>Check in<input type="date" value={f.hIn} onChange={set('hIn')} /></label><label>Check out<input type="date" value={f.hOut} onChange={set('hOut')} /></label></div>
          {miss && <p className="tip">Add a flight number or a hotel first.</p>}
          <button className="btn primary big" disabled={badIn || badOut} onClick={check}>🔎 Check my trip</button>
          <button className="btn ghost big" onClick={() => setTyping(false)}>Back</button>
        </div>}
        {found && <>
          <p style={{ fontWeight: 800, fontSize: '1.15rem' }}>Is this your trip?</p>
          <ul className="trip-list card" style={{ marginTop: 8 }}>
            {found.arrive && <li>✈️ <b>{found.arrive.airline} {found.arrive.number}</b> {found.arrive.from} → {found.arrive.to}<br />Lands {dayLabel(found.arrive.arrDate, true)} at {hm(found.arrive.arrTime)}</li>}
            {found.depart && <li>🏠 <b>{found.depart.airline} {found.depart.number}</b> {found.depart.from} → {found.depart.to}<br />Leaves {dayLabel(found.depart.depDate, true)} at {hm(found.depart.depTime)}</li>}
            {found.hotelId && <li>🏨 <b>{hotelName(found.hotelId)}</b>{found.hotelIn && <><br />{dayLabel(found.hotelIn, true)} → {found.hotelOut ? dayLabel(found.hotelOut, true) : '?'}</>}</li>}
          </ul>
          <div className="yesno-btns">
            <button className="btn yes" onClick={() => onDone(found)}>👍 Yes!</button>
            <button className="btn no" onClick={() => setFound(null)}>✏️ Fix it</button>
          </div>
        </>}
      </div>
    </div>
  );
}
