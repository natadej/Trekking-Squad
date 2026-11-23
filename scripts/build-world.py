import json, math
# osm.json: curl --data-urlencode data@scripts/world-overpass.ql https://overpass-api.de/api/interpreter -o osm.json
d = json.load(open('osm.json'))
E = d['elements']
FP = {  # place id -> OSM way ids for its building footprints
 'mandalay': [116660358, 116660354, 27858550], 'luxor': [27858544], 'nyny': [115661793],
 'mgm': [116770006, 27897924, 27897908], 'aria': [52175576], 'cosmo': [134795273, 27897905, 472669744],
 'bellagio': [25723909, 25723910], 'paris': [33974140], 'caesars': [115672893, 134949102, 126267789],
 'forum': [762169780], 'venetian': [30618090, 111322067, 111367819], 'palazzo': [180584269, 30424125],
 'wynn': [205501268], 'encore': [27910891, 135291730], 'resortsworld': [972129019],
 'fontainebleau': [134068317], 'allegiant': [691478555], 'sphere': [976405284], 'strat': [135457469, 135456188],
}
byid = {x['id']: x for x in E if x['type'] == 'way'}
r5 = lambda v: round(v, 5)
def ring(w): return [[r5(p['lat']), r5(p['lon'])] for p in w.get('geometry', [])]
def inside(lat, lng, poly):
    c = False; j = len(poly) - 1
    for i in range(len(poly)):
        yi, xi = poly[i]; yj, xj = poly[j]
        if (yi > lat) != (yj > lat) and lng < (xj - xi) * (lat - yi) / (yj - yi) + xi: c = not c
        j = i
    return c
fps = {pid: [ring(byid[w]) for w in ws if w in byid] for pid, ws in FP.items()}
used = {w for ws in FP.values() for w in ws}
# other named big buildings for scenery
other = []
for x in E:
    t = x['tags']
    if x['type'] == 'way' and x['id'] not in used and t.get('building') and (t.get('tourism') == 'hotel' or t.get('amenity') in ('casino', 'conference_centre', 'theatre') or t.get('shop') == 'mall' or t.get('building') == 'hotel'):
        g = ring(x)
        if len(g) > 3: other.append({'n': t.get('name', ''), 'g': g})
FOOD = {'restaurant', 'cafe', 'fast_food', 'food_court', 'ice_cream'}
BAD_SHOP = {'alcohol', 'tobacco', 'cannabis', 'erotic', 'e-cigarette', 'wine', 'pawn', 'vacant', 'weapons', 'money_lender', 'lottery', 'hookah'}
# places.json: [{id, lat, lng}] exported from src/data/places.ts (airport excluded)
places = json.load(open('places.json'))
def dist(a, b, c, e):
    k = math.cos(math.radians(36.11)); return math.hypot((a - c) * 111320, (b - e) * 111320 * k)
pois = []
for x in E:
    t = x['tags']; n = t.get('name')
    if not n: continue
    a = t.get('amenity'); s = t.get('shop')
    if a in FOOD: k = 'food'
    elif s and s not in BAD_SHOP and a not in ('bar', 'nightclub', 'stripclub'): k = 'shop'
    else: continue
    lat = x.get('lat') or x.get('center', {}).get('lat'); lng = x.get('lon') or x.get('center', {}).get('lon')
    if lat is None: continue
    p = next((pid for pid, rs in fps.items() if any(len(r) > 3 and inside(lat, lng, r) for r in rs)), None)
    if not p:
        best = min(places, key=lambda q: dist(lat, lng, q['lat'], q['lng']))
        if dist(lat, lng, best['lat'], best['lng']) < 220: p = best['id']
    if not p: continue
    o = {'n': n, 'k': k, 'lat': r5(lat), 'lng': r5(lng), 'p': p}
    sub = t.get('cuisine') or s or a
    if sub: o['c'] = sub.replace('_', ' ').split(';')[0]
    if t.get('brand'): o['b'] = 1
    pois.append(o)
# de-duplicate same name at same place
seen = set(); out = []
for o in pois:
    key = (o['n'].lower(), o['p'])
    if key in seen: continue
    seen.add(key); out.append(o)
json.dump({'fp': fps, 'other': other, 'pois': out}, open('world.json', 'w'), separators=(',', ':'))
from collections import Counter
print(len(out), Counter(o['p'] for o in out), len(other))
print([o['n'] for o in out if o['p'] == 'venetian'])
