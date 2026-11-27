# Builds a test city street in Blender, lights it with a physical sky and sun, bakes the global illumination of every
# static surface into lightmaps with Cycles (CPU), and exports glTF (+ HDR lightmaps + an equirect sky) for three.js.
# Usage: python street.py -- <input glb folder> <output folder> [samples] [lightmap size]
import bpy, bmesh, sys, os, math, random, json
from mathutils import Vector, Matrix

args = sys.argv[sys.argv.index('--') + 1:]
IN, OUT = args[0], args[1]
SAMPLES = int(args[2]) if len(args) > 2 else 96
LM = int(args[3]) if len(args) > 3 else 2048
os.makedirs(OUT, exist_ok=True)
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ---------------------------------------------------------------- materials from the scanned Poly Haven sets
def load_glb(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(IN, name + '.glb'))
    return [o for o in bpy.data.objects if o not in before]

MAT = {}
for n in ['brick_wall_10', 'red_brick_03', 'factory_brick', 'Bricks113A', 'plastered_wall_02', 'painted_concrete', 'Concrete049', 'asphalt_02', 'concrete_floor_worn_001', 'metal_plate', 'rusty_metal_02']:
    objs = load_glb(n)
    for o in objs:
        if o.type == 'MESH' and o.material_slots: MAT[n] = o.material_slots[0].material
    for o in objs: bpy.data.objects.remove(o, do_unlink=True)

def flat(name, rgb, rough=0.6, metal=0.0, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*rgb, 1); p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    if emit: p.inputs['Emission Color'].default_value = (*emit, 1); p.inputs['Emission Strength'].default_value = 2.0
    return m

MAT['glass'] = flat('glass', (0.02, 0.025, 0.03), 0.05, 0.0)
MAT['frame'] = flat('frame', (0.75, 0.74, 0.7), 0.5)
MAT['frame_dark'] = flat('frame_dark', (0.06, 0.06, 0.065), 0.4, 0.6)
MAT['awning_r'] = flat('awning_r', (0.45, 0.06, 0.05), 0.8)
MAT['awning_g'] = flat('awning_g', (0.05, 0.22, 0.12), 0.8)
MAT['awning_b'] = flat('awning_b', (0.08, 0.12, 0.3), 0.8)
MAT['curb'] = MAT['Concrete049']
MAT['line'] = flat('line', (0.85, 0.82, 0.7), 0.7)
for k, c in (('sign_a', (0.75, 0.62, 0.15)), ('sign_b', (0.1, 0.1, 0.12)), ('sign_c', (0.55, 0.1, 0.08)), ('sign_d', (0.85, 0.85, 0.82))): MAT[k] = flat(k, c, 0.5)
AC = []

# ---------------------------------------------------------------- geometry helpers (UVs in metres for tiling textures)
def box(name, cx, cy, cz, sx, sy, sz, mat, tile=2.0, parts=None):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * sx + cx, v.co.y * sy + cy, v.co.z * sz + cz))
    uv = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        n = f.normal
        for l in f.loops:
            p = l.vert.co
            if abs(n.z) > 0.5: l[uv].uv = (p.x / tile, p.y / tile)
            elif abs(n.x) > 0.5: l[uv].uv = (p.y / tile, p.z / tile)
            else: l[uv].uv = (p.x / tile, p.z / tile)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.transform(Matrix.Translation((-cx, -cy, -cz)))   # origin at the centre so rotations work
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); o.data.materials.append(mat); o.location = (cx, cy, cz)
    if parts is not None: parts.append(o)
    return o

STATIC = []   # baked into lightmaps
GLASS = []    # windows stay live (they reflect the sky in the game)

# ---------------------------------------------------------------- the street (along X), road 10 m, sidewalks 4.5 m
L = 100.0
box('road', 0, 0, -0.05, L, 10, 0.1, MAT['asphalt_02'], 4.0, STATIC)
for s in (-1, 1):
    box('walk', 0, s * 7.25, 0.07, L, 4.5, 0.14, MAT['concrete_floor_worn_001'], 2.0, STATIC)
    box('curb', 0, s * 5.06, 0.08, L, 0.14, 0.16, MAT['curb'], 1.0, STATIC)
for x in range(-48, 50, 6): box('dash', x, 0, 0.003, 3.0, 0.15, 0.006, MAT['line'], 1.0, STATIC)

# ---------------------------------------------------------------- buildings on both sides
FACADES = ['brick_wall_10', 'red_brick_03', 'factory_brick', 'Bricks113A', 'plastered_wall_02', 'painted_concrete']
def building(x0, w, side, floors, facade):
    d = 12.0; fh = 3.2; h = floors * fh + 1.2; front = side * 9.5; cy = front + side * d / 2
    box('bld', x0 + w / 2, cy, h / 2, w, d, h, MAT[facade], 2.5, STATIC)
    box('cornice', x0 + w / 2, front + side * 0.0, h - 0.6, w + 0.1, 0.5, 0.25, MAT['Concrete049'], 1.0, STATIC)
    box('parapet', x0 + w / 2, cy, h + 0.45, w, d, 0.9, MAT['Concrete049'], 2.0, STATIC)
    for i in range(1, floors):                      # string course between floors
        box('band', x0 + w / 2, front, i * fh + 0.95, w, 0.12, 0.15, MAT['Concrete049'], 1.0, STATIC)
    fy = front - side * 0.06                         # facade plane (street side)
    n = max(2, int(w // 2.6)); step = w / n
    for f in range(1, floors):                       # upper windows
        z = f * fh + 1.0 + 0.85
        for k in range(n):
            x = x0 + step * (k + 0.5)
            box('win', x, fy - side * 0.02, z, 1.1, 0.04, 1.5, MAT['glass'], 1.0, GLASS)
            for dx, sx in ((-0.6, 0.1), (0.6, 0.1)): box('wf', x + dx, fy - side * 0.06, z, sx, 0.12, 1.7, MAT['frame'], 1.0, STATIC)
            box('wf', x, fy - side * 0.06, z + 0.8, 1.3, 0.12, 0.1, MAT['frame'], 1.0, STATIC)
            box('sill', x, fy - side * 0.12, z - 0.82, 1.4, 0.24, 0.08, MAT['Concrete049'], 1.0, STATIC)
            box('wf', x, fy - side * 0.05, z, 0.05, 0.08, 1.5, MAT['frame'], 1.0, STATIC)
    # shop front on the ground floor: big glass, dark frame, awning
    box('shopglass', x0 + w / 2, fy - side * 0.03, 1.6, w - 1.6, 0.04, 2.4, MAT['glass'], 1.0, GLASS)
    box('shopframe', x0 + w / 2, fy - side * 0.08, 2.85, w - 1.4, 0.14, 0.15, MAT['frame_dark'], 1.0, STATIC)
    box('shopframe', x0 + w / 2, fy - side * 0.08, 0.35, w - 1.4, 0.14, 0.7, MAT['frame_dark'], 1.0, STATIC)
    for xx in (x0 + 0.75, x0 + w - 0.75, x0 + w / 2): box('mullion', xx, fy - side * 0.08, 1.6, 0.12, 0.14, 2.6, MAT['frame_dark'], 1.0, STATIC)
    aw = box('awning', x0 + w / 2, fy - side * 0.9, 3.15, w - 1.2, 1.8, 0.06, MAT[random.choice(['awning_r', 'awning_g', 'awning_b'])], 1.0, STATIC)
    aw.rotation_euler.x = side * 0.28
    # shop sign board above the awning
    box('sign', x0 + w / 2, fy - side * 0.1, 3.75, min(w - 2.0, 7.0), 0.12, 0.75, MAT[random.choice(['sign_a', 'sign_b', 'sign_c', 'sign_d'])], 1.0, STATIC)
    # balconies on some buildings: slab + railing posts + top rail
    if random.random() < 0.55:
        for f in range(1, floors):
            if random.random() < 0.35: continue
            z = f * fh + 0.95
            for k in range(n):
                if random.random() < 0.5: continue
                x = x0 + step * (k + 0.5)
                box('balc', x, fy - side * 0.55, z - 0.06, 1.9, 1.1, 0.14, MAT['Concrete049'], 1.0, STATIC)
                box('rail', x, fy - side * 1.07, z + 0.55, 1.9, 0.05, 0.05, MAT['frame_dark'], 1.0, STATIC)
                for i in range(9): box('rail', x - 0.9 + i * 0.225, fy - side * 1.07, z + 0.28, 0.025, 0.025, 0.55, MAT['frame_dark'], 1.0, STATIC)
                for dx in (-0.93, 0.93): box('rail', x + dx, fy - side * 0.55, z + 0.55, 0.05, 1.05, 0.05, MAT['frame_dark'], 1.0, STATIC)
    # wall air-conditioners under some windows, a drain pipe at the corner, roof tanks
    for f in range(1, floors):
        for k in range(n):
            if random.random() < 0.18: AC.append((x0 + step * (k + 0.5) + 0.3, fy - side * 0.3, f * fh + 0.55, side))
    box('pipe', x0 + 0.25, fy - side * 0.12, h / 2, 0.11, 0.11, h, MAT['rusty_metal_02'], 1.0, STATIC)
    if random.random() < 0.6: box('tank', x0 + w * random.uniform(0.3, 0.7), cy, h + 1.2, 1.4, 1.4, 1.5, MAT['metal_plate'], 1.0, STATIC)

for side in (-1, 1):
    x = -L / 2
    while x < L / 2 - 6:
        w = random.choice([9.0, 11.0, 13.0, 15.0]); w = min(w, L / 2 - x)
        building(x, w, side, random.choice([3, 4, 4, 5, 6]), random.choice(FACADES)); x += w

# ---------------------------------------------------------------- street furniture (scanned props)
def prop(name, x, y, rz=0.0):
    objs = load_glb(name); roots = [o for o in objs if o.parent is None]
    for r in roots: r.location = (x, y, 0.14 if abs(y) > 5 else 0.0); r.rotation_euler.z = rz
    bpy.context.view_layer.update()
    for o in objs:
        if o.type == 'MESH': STATIC.append(o)
    return objs

for x in range(-45, 46, 15):
    for s in (-1, 1): prop('street_lamp_01', x, s * 5.6, 0 if s < 0 else math.pi)
for x, s, n in [(-38, -1, 'metal_trash_can'), (-12, 1, 'fire_hydrant'), (8, -1, 'utility_box_02'), (22, 1, 'metal_trash_can'), (31, -1, 'fire_hydrant'), (-26, 1, 'utility_box_02')]:
    prop(n, x, s * 6.0, random.random() * 6)
prop('concrete_road_barrier', 44, 3.0, 1.57); prop('concrete_road_barrier', 44, -1.0, 1.57)
for (x, y, z, side) in AC:
    objs = prop('exterior_aircon_unit', x, y, 0 if side < 0 else math.pi); keep = random.random() < 0.5
    for o in objs:
        if o.type == 'MESH' and (('rusted' in o.name) != keep):
            if o in STATIC: STATIC.remove(o)
            bpy.data.objects.remove(o, do_unlink=True); continue
        if o.parent is None: o.location.z = z; o.scale = (0.8, 0.8, 0.8)
# overhead cables across the street, sagging between the buildings
for x in (-33, -8, 17, 39):
    for dz in (0.0, 0.35):
        pts = [Vector((x + 0.3 * math.sin(i), -9.4 + i * 18.8 / 12, 7.6 + dz - 0.9 * math.sin(math.pi * i / 12))) for i in range(13)]
        for a, b in zip(pts, pts[1:]):
            m = (a + b) / 2; d = b - a; o = box('wire', m.x, m.y, m.z, 0.025, d.length, 0.025, MAT['frame_dark'], 1.0, STATIC); o.rotation_euler.x = math.atan2(d.z, d.y)
# the scanned lamps are very dense: thin them before baking
bpy.context.view_layer.update()
for o in STATIC:
    if o.type == 'MESH' and o.name.startswith('street_lamp') and len(o.data.vertices) > 4000:
        md = o.modifiers.new('dec', 'DECIMATE'); md.ratio = 0.12; bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get(); nm = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); o.modifiers.clear(); o.data = nm

# ---------------------------------------------------------------- sky and sun (physical, late afternoon)
w = bpy.data.worlds.new('sky'); sc.world = w; w.use_nodes = True; nt = w.node_tree
sky = nt.nodes.new('ShaderNodeTexSky')
try: sky.sky_type = 'MULTIPLE_SCATTERING'
except Exception: sky.sky_type = 'NISHITA'
SUN_EL, SUN_AZ = math.radians(28), math.radians(215)
sky.sun_elevation = SUN_EL; sky.sun_rotation = SUN_AZ
for k, v in (('altitude', 50), ('air_density', 1.2), ('dust_density', 1.6), ('aerosol_density', 1.6)):
    if hasattr(sky, k): setattr(sky, k, v)
bg = nt.nodes['Background']; nt.links.new(sky.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 0.35
bpy.ops.object.light_add(type='SUN'); sun = bpy.context.object; sun.data.energy = 3.2; sun.data.angle = math.radians(0.6); sun.data.color = (1.0, 0.92, 0.82)
sun.rotation_euler = (math.pi / 2 - SUN_EL, 0, SUN_AZ + math.pi / 2)
sun_dir = sun.matrix_world.to_quaternion() @ Vector((0, 0, 1))   # points towards the sun

# ---------------------------------------------------------------- render settings
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.max_bounces = 6; sc.cycles.diffuse_bounces = 4
sc.view_settings.view_transform = 'AgX'

# a preview render from the street, to compare with the game
bpy.ops.object.camera_add(location=(-30, -2.5, 1.7)); cam = bpy.context.object; sc.camera = cam
cam.rotation_euler = (math.radians(88), 0, math.radians(-78)); cam.data.lens = 24
sc.render.resolution_x, sc.render.resolution_y = 1280, 720; sc.cycles.use_denoising = True
sc.render.filepath = os.path.join(OUT, 'preview.png'); bpy.ops.render.render(write_still=True)

# the sky as an equirect HDR for the game's background and reflections (scene hidden)
for o in sc.objects: o.hide_render = o.type != 'CAMERA'
cam.data.type = 'PANO'; cam.data.panorama_type = 'EQUIRECTANGULAR'; cam.location = (0, 0, 20); cam.rotation_euler = (math.pi / 2, 0, -math.pi / 2)
sc.render.resolution_x, sc.render.resolution_y = 2048, 1024; sc.cycles.samples = 32; sc.render.image_settings.file_format = 'HDR'
sc.render.filepath = os.path.join(OUT, 'sky.hdr'); bpy.ops.render.render(write_still=True)
for o in sc.objects: o.hide_render = False
cam.data.type = 'PERSP'

# ---------------------------------------------------------------- join static parts into chunks and bake lightmaps
def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    objs = [o for o in objs if o.name in bpy.data.objects and o.type == 'MESH']
    for o in objs:
        o.select_set(True)
        if o.parent:
            mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join(); j = bpy.context.object; j.name = name; return j

chunks = {}
for key, test in [('ground', lambda o: abs(o.location.y) < 9.6 and o.dimensions.z < 1.0 and not o.name.startswith(('street_lamp', 'fire', 'metal', 'utility', 'concrete_road'))),
                  ('left', lambda o: True), ('right', lambda o: True)]:
    pass
ground = [o for o in STATIC if o.name.split('.')[0] in ('road', 'walk', 'curb', 'dash')]
props = [o for o in STATIC if o not in ground and not o.name.split('.')[0] in ('bld', 'cornice', 'parapet', 'band', 'wf', 'sill', 'shopframe', 'mullion', 'awning', 'sign', 'balc', 'rail', 'pipe', 'tank', 'wire')]
rest = [o for o in STATIC if o not in ground and o not in props]
bpy.context.view_layer.update()
left = [o for o in rest if (o.matrix_world @ Vector(o.bound_box[0])).y < 0]
right = [o for o in rest if o not in left]
for name, objs in [('ground', ground), ('left', left), ('right', right), ('props', props)]:
    if objs: chunks[name] = join(objs, name)
gl = join(GLASS, 'glass')

sc.cycles.samples = SAMPLES; sc.render.bake.margin = 4
meta = {'sun': [sun_dir.x, sun_dir.z, -sun_dir.y], 'sunColor': list(sun.data.color), 'chunks': []}
for name, o in chunks.items():
    me = o.data
    if 'Lightmap' not in me.uv_layers: me.uv_layers.new(name='Lightmap')
    me.uv_layers.active = me.uv_layers['Lightmap']
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004); bpy.ops.object.mode_set(mode='OBJECT')
    size = LM if name != 'props' else LM // 2
    img = bpy.data.images.new('lm_' + name, size, size, float_buffer=True)
    for slot in o.material_slots:          # every material gets an image node selected as bake target
        m = slot.material; m.use_nodes = True; nd = m.node_tree.nodes.new('ShaderNodeTexImage'); nd.image = img; nd.name = 'BAKE'
        for n2 in m.node_tree.nodes: n2.select = False
        nd.select = True; m.node_tree.nodes.active = nd
    print('baking', name, size, flush=True)
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, use_clear=True, margin=4)
    img.filepath_raw = os.path.join(OUT, 'lm_' + name + '.hdr'); img.file_format = 'HDR'; img.save()
    for slot in o.material_slots:
        nt2 = slot.material.node_tree; nd = nt2.nodes.get('BAKE')
        if nd: nt2.nodes.remove(nd)
    me.uv_layers.active = me.uv_layers[0]
    meta['chunks'].append(name)

# ---------------------------------------------------------------- export (Y up)
bpy.ops.object.select_all(action='DESELECT')
for o in list(chunks.values()) + [gl]: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'street.glb'), use_selection=True, export_format='GLB', export_image_format='WEBP', export_texcoords=True, export_normals=True, export_apply=True)
json.dump(meta, open(os.path.join(OUT, 'street.json'), 'w'))
print('DONE', flush=True)
