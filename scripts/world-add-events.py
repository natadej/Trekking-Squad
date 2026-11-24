import json, re
w = json.load(open('world.json'))
S = json.load(open('/home/ubuntu/repos/Vegas-Quest-by-Luffy/public/data/sessions.json'))
NEAR = {'venetian': ['venetian', 'palazzo'], 'wynn': ['wynn', 'encore'], 'mgm': ['mgm'], 'caesars': ['caesars'], 'forum': ['forum']}
def centroid(r): return sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r)
def ev(x):
    o = {'c': x['c'], 'd': x['d'], 's': x['s'], 'e': x['e'], 't': x['t']}
    m = re.search(r'sponsored by (.+)$', x['t'])
    return o, (m.group(1).strip() if m else None)
added = []
for x in S:
    room = x['r']; m = re.match(r'(.+?) \(located in', room)
    name = m.group(1) if m else (room if room in ('Casa Playa',) else None)
    if not name: continue
    cand = [o for o in w['pois'] if o['p'] in NEAR.get(x['v'], []) and o['n'].lower().startswith(name.lower())]
    if not cand:
        lat, lng = centroid(w['fp'][x['v']][0])
        o = {'n': name, 'k': 'food', 'lat': round(lat, 5), 'lng': round(lng, 5), 'p': x['v'], 'approx': 1}
        w['pois'].append(o); cand = [o]; added.append(name)
    o = cand[0]; e, sp = ev(x)
    o.setdefault('ev', []).append(e)
    if sp: o['k'] = 'partner'; o.setdefault('sp', [])
    if sp and sp not in o['sp']: o['sp'].append(sp)
# AWS zones in the Expo hall (booth numbers from the catalog), placed inside the Venetian Expo footprint
expo = next(r for r in w['fp']['venetian'] if len(r) == 26)
la, ln = centroid(expo)
zones = {}
for x in S:
    if x['r'].startswith('Booth'):
        z = zones.setdefault(x['t'].strip(), {'n': x['t'].strip(), 'k': 'aws', 'p': 'venetian', 'approx': 1, 'c': x['r'], 'ev': []})
        z['ev'].append({'c': x['c'], 'd': x['d'], 's': x['s'], 'e': x['e'], 't': 'Open'})
for i, z in enumerate(zones.values()):
    z['lat'] = round(la + 0.00025 * ((i % 3) - 1), 5); z['lng'] = round(ln + 0.0003 * (i // 3 - 0.5), 5)
    if 'Partner' in z['n']: z['k'] = 'partner'
    w['pois'].append(z)
json.dump(w, open('/home/ubuntu/repos/Vegas-Quest-by-Luffy/public/data/world.json', 'w'), separators=(',', ':'))
print('added', added, len(zones))
for o in w['pois']:
    if 'ev' in o and o['k'] != 'aws': print(o['n'], o['p'], o['k'], o.get('sp'), [(e['d'], e['s']) for e in o['ev']])
