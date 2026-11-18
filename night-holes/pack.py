# Packs assets/<folder>/*.glb into assets/<folder>.json ({file: base64}) for publishing.
import base64, json, os, sys
for d in ['lab', 'props', 'mon', 'hum']:
    out = {f: base64.b64encode(open(f'assets/{d}/{f}', 'rb').read()).decode() for f in sorted(os.listdir(f'assets/{d}')) if f.endswith('.glb') and not f.startswith('Details_') and 'Long_Wall' not in f and 'Window' not in f and f not in ('creature.glb', 'creature-walk.glb', 'creature-run.glb')}
    json.dump(out, open(f'assets/{d}.json', 'w'), separators=(',', ':'))
    print(d, len(out), os.path.getsize(f'assets/{d}.json'))
