# Turns Cycles HDR lightmaps into small 8-bit PNGs (sRGB-encoded, scaled by S) and shrinks the sky HDR. Prints the scale S.
import bpy, sys, os, numpy as np
args = sys.argv[sys.argv.index('--') + 1:]; src, dst = args[0], args[1]; os.makedirs(dst, exist_ok=True); S = 4.0
for f in sorted(os.listdir(src)):
    p = os.path.join(src, f)
    if f.startswith('lm_') and f.endswith('.hdr'):
        im = bpy.data.images.load(p); w, h = im.size; a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)
        a[..., :3] = np.clip(a[..., :3] / S, 0, 1) ** (1 / 2.2); a[..., 3] = 1
        o = bpy.data.images.new(f[:-4], w, h, alpha=False); o.pixels = a.ravel().tolist(); bpy.context.scene.render.image_settings.quality = 88; o.file_format = 'JPEG'; o.filepath_raw = os.path.join(dst, f[:-4] + '.jpg'); o.save()
        print(f, w, h, float(np.percentile(a[..., :3], 99.9)))
    if f == 'sky.hdr':
        im = bpy.data.images.load(p); im.scale(1024, 512); im.filepath_raw = os.path.join(dst, 'sky.hdr'); im.file_format = 'HDR'; im.save()
print('S', S)
