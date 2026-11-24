"""Download a free-licence photo and a short summary for each Strip place from Wikipedia/Wikimedia Commons."""
import json, re, urllib.parse, urllib.request, html
TITLES = {
  'airport': 'Harry_Reid_International_Airport', 'mandalay': 'Mandalay_Bay', 'luxor': 'Luxor_Las_Vegas', 'nyny': 'New_York-New_York_Hotel_and_Casino',
  'mgm': 'MGM_Grand_Las_Vegas', 'aria': 'Aria_Resort_and_Casino', 'cosmo': 'The_Cosmopolitan_of_Las_Vegas', 'bellagio': 'Bellagio_(resort)',
  'paris': 'Paris_Las_Vegas', 'caesars': "Caesars_Palace", 'forum': 'Caesars_Forum', 'venetian': 'The_Venetian_Las_Vegas', 'palazzo': 'The_Palazzo',
  'wynn': 'Wynn_Las_Vegas', 'encore': 'Encore_Las_Vegas', 'resortsworld': 'Resorts_World_Las_Vegas', 'fontainebleau': 'Fontainebleau_Las_Vegas',
  'allegiant': 'Allegiant_Stadium', 'sphere': 'Sphere_(venue)', 'fountains': 'Fountains_of_Bellagio', 'highroller': 'High_Roller_(Ferris_wheel)',
  'sign': 'Welcome_to_Fabulous_Las_Vegas_sign', 'strat': 'The_Strat',
}
UA = {'User-Agent': 'TrekkingSquad/1.0 (https://github.com/natadej/Vegas-Quest-by-Luffy)'}
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()
def strip(s): return html.unescape(re.sub(r'<[^>]+>', '', s or '')).strip()
out = {}
for pid, title in TITLES.items():
    s = json.loads(get(f'https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}'))
    rec = {'title': s.get('title'), 'about': s.get('extract', ''), 'src': s.get('content_urls', {}).get('desktop', {}).get('page')}
    # first real photo (not a logo/map) in the article's lead section, usually the infobox picture
    lead = json.loads(get(f'https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=text&section=0&page={urllib.parse.quote(title)}'))['parse']['text']['*']
    names = [urllib.parse.unquote(m) for m in re.findall(r'/(?:thumb/)?[0-9a-f]/[0-9a-f]{2}/([^/"]+?\.(?:jpe?g|JPE?G))', lead)]
    names = [n for n in names if not re.search(r'logo|map|locator|flag|icon', n, re.I)]
    if names:
        fname = names[0]
        q = json.loads(get('https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=900&titles=' + urllib.parse.quote('File:' + fname)))
        page = next(iter(q['query']['pages'].values()))
        ii = (page.get('imageinfo') or [None])[0]
        if ii:
            md = ii['extmetadata']; lic = md.get('LicenseShortName', {}).get('value', '')
            if any(k in lic for k in ('CC', 'Public domain', 'PD', 'GFDL')) and 'NC' not in lic:
                open(f'public/img/places/{pid}.jpg', 'wb').write(get(ii['thumburl']))
                rec.update(img=f'img/places/{pid}.jpg', credit=strip(md.get('Artist', {}).get('value', ''))[:80], license=lic, file=ii['descriptionurl'])
    out[pid] = rec
    print(pid, rec.get('license', 'NO IMAGE'), len(rec['about']))
json.dump(out, open('src/data/placeInfo.json', 'w'), indent=1, ensure_ascii=False)
