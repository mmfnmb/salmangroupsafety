# Packs assets/<folder>/*.glb into JSON ({file: base64}) for publishing (the page host does not serve .glb).
# Shared folders become one assets/<folder>.json; per-file folders (humans, cars) become assets/<folder>-<name>.json
# so a phone only downloads the character and car it shows.
import base64, json, os
BUNDLE = ['mon', 'house', 'street', 'mat']
PERFILE = ['hum', 'car']
for f in os.listdir('assets'):
    if f.endswith('.json'): os.remove('assets/' + f)
def b64(p): return base64.b64encode(open(p, 'rb').read()).decode()
for d in BUNDLE:
    out = {f: b64(f'assets/{d}/{f}') for f in sorted(os.listdir(f'assets/{d}')) if f.endswith('.glb') and not f.startswith('creature')}
    json.dump(out, open(f'assets/{d}.json', 'w'), separators=(',', ':')); print(d, len(out), os.path.getsize(f'assets/{d}.json'))
for d in PERFILE:
    for f in sorted(os.listdir(f'assets/{d}')):
        if not f.endswith('.glb'): continue
        p = f'assets/{d}-{f[:-4]}.json'; json.dump({f: b64(f'assets/{d}/{f}')}, open(p, 'w'), separators=(',', ':')); print(p, os.path.getsize(p))
