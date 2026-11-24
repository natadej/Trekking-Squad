"""Build public/data/shops.json for the Shopping & Fun map.

Sources (fetched live): Grand Canal Shoppes directory (Venetian + Palazzo store list, hours, promo flags)
and OpenStreetMap (stores inside Las Vegas North/South Premium Outlets). Big-box stores, shows and
day trips are listed below with OSM coordinates.
Run: python3 scripts/build-shops.py
"""
import datetime, html, json, re, urllib.request, xml.etree.ElementTree as ET

UA = {'User-Agent': 'TrekkingSquad/1.0 (natadej@gmail.com)'}
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={**UA, 'Accept-Language': 'en'}), timeout=60).read().decode('utf-8', 'replace')

AREAS = [
    dict(id='venetian', name='Grand Canal Shoppes (Venetian + Palazzo)', short='Venetian Shops', icon='🛶', kind='mall', lat=36.1222, lng=-115.1703,
         addr='3377 S Las Vegas Blvd', url='https://www.grandcanalshoppes.com/directory/',
         about='Indoor canal with gondolas, painted sky ceiling, ~160 shops and restaurants. Right next to the re:Invent halls.'),
    dict(id='north', name='Las Vegas North Premium Outlets', short='North Outlets', icon='🏬', kind='mall', lat=36.16369, lng=-115.15832,
         addr='875 S Grand Central Pkwy', url='https://www.premiumoutlets.com/outlet/las-vegas-north/stores',
         deals='https://www.premiumoutlets.com/outlet/las-vegas-north/deals',
         about='Big open-air outlet mall downtown, ~15 min by car from the Strip. Nike, Adidas, Coach, Disney and more.'),
    dict(id='south', name='Las Vegas South Premium Outlets', short='South Outlets', icon='🏬', kind='mall', lat=36.05394, lng=-115.16914,
         addr='7400 S Las Vegas Blvd', url='https://www.premiumoutlets.com/outlet/las-vegas-south/stores',
         deals='https://www.premiumoutlets.com/outlet/las-vegas-south/deals',
         about='Indoor outlet mall at the south end of the Strip, ~10 min by car from Mandalay Bay.'),
    dict(id='target', name='Target (Showcase Mall)', short='Target', icon='🎯', kind='store', lat=36.104782, lng=-115.172498,
         addr='3767 S Las Vegas Blvd', url='https://www.target.com/sl/las-vegas-strip/3290',
         about='On the Strip next to MGM Grand. Snacks, water, chargers, sunscreen and souvenirs.'),
    dict(id='walgreens-s', name='Walgreens (by MGM Grand)', short='Walgreens S', icon='💊', kind='store', lat=36.105001, lng=-115.17222,
         addr='3765 S Las Vegas Blvd', url='https://www.walgreens.com/storelocator/find.jsp?requestType=locator&state=NV&city=Las%20Vegas',
         about='Pharmacy and snacks next to Target, open late.'),
    dict(id='walgreens-n', name='Walgreens (by Fontainebleau)', short='Walgreens N', icon='💊', kind='store', lat=36.132728, lng=-115.163705,
         addr='3025 S Las Vegas Blvd', url='https://www.walgreens.com/storelocator/find.jsp?requestType=locator&state=NV&city=Las%20Vegas',
         about='Pharmacy on the north Strip. There is also a Walgreens inside the Venetian.'),
    dict(id='ross', name='Ross Dress for Less', short='Ross', icon='👗', kind='store', lat=36.118842, lng=-115.13563,
         addr='3880 S Maryland Pkwy', url='https://www.rossstores.com/store-locator/',
         about='Closest Ross to the Strip: cheap clothes, shoes, luggage and toys. ~10 min by car.'),
    dict(id='bestbuy', name='Best Buy', short='Best Buy', icon='💻', kind='store', lat=36.11971, lng=-115.135583,
         addr='3820 E Katie Ave', url='https://stores.bestbuy.com/nv/las-vegas.html',
         about='Closest Best Buy to the Strip. Chargers, headphones, games. Right next to Ross.'),
    dict(id='walmart', name='Walmart Supercenter', short='Walmart', icon='🛒', kind='store', lat=36.098071, lng=-115.108307,
         addr='3075 E Tropicana Ave', url='https://www.walmart.com/store-finder?location=89121',
         about='Closest Walmart Supercenter to the Strip, ~15 min by car. Groceries, water packs, kids stuff.'),
    dict(id='amazon', name='Amazon Locker (Meadows Village)', short='Amazon Locker', icon='📦', kind='store', lat=36.147679, lng=-115.158859,
         addr='Fairfield Ave', url='https://www.amazon.com/ulp',
         about='Pick up Amazon orders here. No walk-in Amazon store near the Strip.'),
    dict(id='wholefoods', name='Whole Foods Market (Amazon)', short='Whole Foods', icon='🥑', kind='store', lat=36.067617, lng=-115.174246,
         addr='6689 S Las Vegas Blvd', url='https://www.wholefoodsmarket.com/stores/lasvegasblvd',
         about='Amazon-owned grocery on the south Strip. Healthy food and snacks. Most Whole Foods take Amazon returns.'),
    dict(id='sphere', name='Sphere', short='Sphere', icon='🔮', kind='fun', lat=36.121207, lng=-115.162067,
         addr='255 Sands Ave', url='https://www.thespherevegas.com/shows',
         about='The giant LED ball behind the Venetian. Bridge from the Venetian walkway.',
         shows=[dict(n='The Wizard of Oz at Sphere', when='On sale', url='https://www.thespherevegas.com/shows'),
                dict(n='Eagles', when='Nov 13, 2026 – Jan 23, 2027', url='https://www.thespherevegas.com/shows')]),
    dict(id='o', name='"O" by Cirque du Soleil (Bellagio)', short='"O" show', icon='🌊', kind='fun', lat=36.113801, lng=-115.17722,
         addr='Bellagio, 3600 S Las Vegas Blvd', url='https://www.cirquedusoleil.com/o',
         about='Water acrobatics show on a giant pool stage. Evening shows; check times and tickets on the link.'),
    dict(id='antelope', name='Antelope Canyon (Page, Arizona)', short='Antelope Canyon', icon='🏜️', kind='trip', lat=36.862572, lng=-111.374686,
         addr='Navajo Nation, near Page, AZ', url='https://navajonationparks.org/',
         about='Glowing orange slot canyon. About 270 miles / 4.5 hours drive each way, so it needs a whole free day. '
               'You must book a Navajo guided tour. Arizona is 1 hour ahead of Vegas in December.', far=1),
]

CAT = {'Food': 'food', "Men's Clothing": 'clothes', "Women's Clothing": 'clothes', "Children's Clothing": 'clothes', "Teen's Clothing": 'clothes',
       'Jewelry & Watches': 'jewelry', 'Accessories': 'bags', 'Shoes': 'shoes', 'Health & Beauty': 'beauty', 'Electronics & Entertainment': 'fun',
       'Sports & Fitness': 'sports', 'Home & Housewares': 'home', 'Specialty': 'gifts', 'Services': 'services', 'Professional Services': 'services'}
SKIP = {'Mall Management', 'Security Office', 'Poker Room', 'UrVenue', 'Volition Events', 'Hilton Resorts Corporation', 'Snapvend', 'Beer & Wine Taps'}
FLAG = {'RewardCard': '💳 RewardCard store', 'Grand Canal Dining': '🍽️ Grand Canal Dining deal', 'Portfolio holiday tenants': '🎁 Holiday offers'}
DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower().replace('&', 'and'))[:10]


def short_t(t):
    return re.sub(r':00', '', re.sub(r'^0', '', t)).replace(' ', '') if t else ''


def venetian(world):
    s = get('https://www.grandcanalshoppes.com/directory/')
    m = re.search(r'Fusion\.contentCache=', s)
    cc, _ = json.JSONDecoder().raw_decode(s, m.end())
    rows = [x['content'] for x in list(cc['brookfield-store'].values())[0]['data']]
    pos = {norm(p['n']): p for p in world['pois'] if p['p'] in ('venetian', 'palazzo')}
    out, seen = [], set()
    for x in rows:
        n = (x.get('displayName') or '').strip()
        if not n or n in SKIP or x.get('temporarilyClosed') == 'Yes' or norm(n) in seen:
            continue
        seen.add(norm(n))
        cats = [c.get('parentDescription') or c.get('description') for c in x.get('categories') or []]
        c = next((CAT[k] for k in cats if k in CAT), 'food' if any(f['description'] == 'Grand Canal Dining' for f in x.get('campaignFlags') or []) else 'gifts')
        r = dict(n=html.unescape(n), a='venetian', c=c)
        sub = next((k for k in cats if k), None)
        if sub: r['t'] = sub
        where = ' · '.join(v for v in [x.get('level'), x.get('levelNear')] if v and v != x.get('level') or v == x.get('level') and v)
        if where: r['w'] = where
        if x.get('phoneNumber'): r['ph'] = x['phoneNumber']
        if x.get('tenantWebsite'): r['web'] = x['tenantWebsite']
        deals = [FLAG[f['description']] for f in x.get('campaignFlags') or [] if f['description'] in FLAG]
        if deals: r['d'] = deals
        if x.get('storeHours'):
            h = {d['day']: ('closed' if d.get('isClosed') == 'Yes' else f"{short_t(d.get('openTime'))}–{short_t(d.get('closeTime'))}") for d in x['storeHours']}
            r['h'] = [h.get(d, '') for d in DAYS]
        p = pos.get(norm(n))
        if p: r['lat'], r['lng'] = p['lat'], p['lng']
        out.append(r)
    return out


def inside(pt, ring):
    x, y, c = pt[1], pt[0], False
    for (a, b), (cc, d) in zip(ring, ring[1:] + ring[:1]):
        if (a > y) != (cc > y) and x < (d - b) * (y - a) / (cc - a) + b:
            c = not c
    return c


OSM_CAT = {'clothes': 'clothes', 'shoes': 'shoes', 'jewelry': 'jewelry', 'bag': 'bags', 'perfumery': 'beauty', 'cosmetics': 'beauty', 'beauty': 'beauty',
           'sports': 'sports', 'outdoor': 'sports', 'electronics': 'fun', 'video_games': 'fun', 'toys': 'fun', 'gift': 'gifts', 'houseware': 'home',
           'furniture': 'home', 'bed': 'home', 'optician': 'bags', 'watches': 'jewelry', 'department_store': 'clothes', 'boutique': 'clothes', 'fashion_accessories': 'bags'}
DROP = re.compile(r'parking|supercharger|premium outlets|world market|outlet center annex|regional transportation', re.I)


def outlets(aid, bbox, mall_name):
    r = ET.fromstring(get(f'https://api.openstreetmap.org/api/0.6/map?bbox={bbox}'))
    nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in r.iter('node')}
    tags = lambda el: {t.get('k'): t.get('v') for t in el.findall('tag')}
    ring = None
    for w in r.iter('way'):
        t = tags(w)
        if t.get('name') == mall_name and ('shop' in t or 'landuse' in t or 'building' in t):
            g = [nodes[n.get('ref')] for n in w.findall('nd') if n.get('ref') in nodes]
            if ring is None or len(g) > len(ring): ring = g
    out, seen = [], set()
    for el in list(r.iter('node')) + list(r.iter('way')):
        t = tags(el)
        n = t.get('name')
        if not n or not ('shop' in t or t.get('amenity') in ('restaurant', 'fast_food', 'cafe', 'ice_cream')) or DROP.search(n) or norm(n) in seen:
            continue
        if el.tag == 'node': ll = nodes[el.get('id')]
        else:
            g = [nodes[x.get('ref')] for x in el.findall('nd') if x.get('ref') in nodes]
            if not g: continue
            ll = (sum(p[0] for p in g) / len(g), sum(p[1] for p in g) / len(g))
        if ring and not inside(ll, ring):
            continue
        seen.add(norm(n))
        c = 'food' if t.get('amenity') else OSM_CAT.get(t.get('shop'), 'gifts')
        row = dict(n=n, a=aid, c=c, lat=round(ll[0], 6), lng=round(ll[1], 6))
        sub = t.get('cuisine') or t.get('shop')
        if sub: row['t'] = sub.replace('_', ' ').split(';')[0]
        if t.get('opening_hours'): row['oh'] = t['opening_hours']
        if t.get('website'): row['web'] = t['website']
        out.append(row)
    return out, ring


if __name__ == '__main__':
    world = json.load(open('public/data/world.json'))
    shops = venetian(world)
    n, ring_n = outlets('north', '-115.1610,36.1605,-115.1545,36.1665', 'Las Vegas North Premium Outlets')
    s, ring_s = outlets('south', '-115.1735,36.0505,-115.1650,36.0575', 'Las Vegas South Premium Outlets')
    shops += n + s
    shops.sort(key=lambda x: (x['a'], x['n'].lower()))
    rings = {k: [[round(a, 6), round(b, 6)] for a, b in v] for k, v in (('north', ring_n), ('south', ring_s)) if v}
    data = dict(updated=datetime.date.today().isoformat(), areas=AREAS, shops=shops, rings=rings)
    json.dump(data, open('public/data/shops.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    from collections import Counter
    print(len(shops), Counter(x['a'] for x in shops), Counter(x['c'] for x in shops), {k: len(v) for k, v in rings.items()})
