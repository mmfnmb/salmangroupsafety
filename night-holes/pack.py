# Packs every assets/<folder>/<name>.glb into its own assets/<folder>-<name>.json ({file: base64}) for publishing
# (the page host does not serve .glb). One file per model, so the game downloads only what a scene uses.
# assets/manifest.json lists each bundle's size so the loading bar can show megabytes.
import base64, json, os
for f in os.listdir('assets'):
    if f.endswith('.json'): os.remove('assets/' + f)
man = {}
for d in ['mon', 'house', 'street', 'mat', 'hum', 'car']:
    for f in sorted(os.listdir(f'assets/{d}')):
        if not f.endswith('.glb'): continue
        p = f'assets/{d}-{f[:-4]}.json'
        json.dump({f: base64.b64encode(open(f'assets/{d}/{f}', 'rb').read()).decode()}, open(p, 'w'), separators=(',', ':'))
        man[f'{d}/{f}'] = os.path.getsize(p)
json.dump(man, open('assets/manifest.json', 'w'), separators=(',', ':'))
print(len(man), 'bundles', round(sum(man.values()) / 1e6, 1), 'MB')
