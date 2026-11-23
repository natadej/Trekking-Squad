# Vegas Quest by Luffy

A bright cartoon game (made for ages 10–12) that plans a real AWS re:Invent 2026 trip to Las Vegas (Nov 28 – Dec 3, 2026).

- **Hero studio**: 10 categories (body, skin, hair style, hair color, shirt, dress, pants, shoes, hat, glasses), 10+ looks each.
- **Trip import**: paste or share a flight/hotel confirmation email; it reads flights (incl. schema.org JSON-LD), times and hotel. Everything else is yes/no.
- **Hour-by-hour plan**: built from the 2,830 public re:Invent 2026 sessions plus the official agenda (badge pickup, keynotes, receptions, re:Play), with 20–45 min travel between venues, meals, rest time and your own appointments.
- **Classes**: 10 interest tiles, level and style; search, star and reserve on the AWS catalog.
- **Map**: cartoon Strip from real coordinates: 15 hotels, 5 venues, airport, landmarks. GPS moves your hero; collect coins within 160 m of a place.
- **Calendar**: export the plan as `.ics` for Google, Outlook or Apple Calendar.
- **Cloud (optional)**: Firebase Google/guest sign-in syncs the profile across devices and powers a live global leaderboard.

## Develop

```sh
npm ci
npm run dev     # http://localhost:5173
npm test        # parser + planner tests
npm run build
```

Cloud save is off unless `VITE_FIREBASE_CONFIG` (Firebase web config JSON) is set at build time, e.g. as a repo Actions variable. Without it the game saves on the device only.

## Data

- `public/data/sessions.json`: public re:Invent 2026 event catalog (normalized).
- `src/data/agenda.ts`: official fixed events and badge hours (Pacific Time).
- `src/data/places.ts`: hotels, venues and landmarks with OpenStreetMap coordinates.
