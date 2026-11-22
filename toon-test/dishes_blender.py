# Four Egyptian dishes modelled in Blender with soft, organic shapes:
#   subdivision surfaces + bevels (no hard edges), noise displacement (natural bumps),
#   particle scattering (rice, lentils, beans, crumbs, strands), metaballs (sauces and cream melt together),
#   procedural colour variation, and a Cycles render; each dish is also exported as GLB.
# Usage: python dishes_blender.py -- <out folder> [samples]
import bpy, bmesh, sys, os, math, random
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]; OUT = args[0]; SAMPLES = int(args[1]) if len(args) > 1 else 64
os.makedirs(OUT, exist_ok=True)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    sc.render.resolution_x = sc.render.resolution_y = 800; sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (1.0, 0.95, 0.88, 1); bg.inputs['Strength'].default_value = 0.6
    return sc

def mat(name, rgb, rough=0.5, coat=0.0, sss=0.0, noise=0.0, noise_scale=8.0, rgb2=None, alpha=1.0, metal=0.0, transmission=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; p = nt.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*rgb, 1); p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    if coat: p.inputs['Coat Weight'].default_value = coat; p.inputs['Coat Roughness'].default_value = 0.05
    if sss: p.inputs['Subsurface Weight'].default_value = sss; p.inputs['Subsurface Radius'].default_value = (0.4, 0.25, 0.15)
    if transmission: p.inputs['Transmission Weight'].default_value = transmission
    if alpha < 1: p.inputs['Alpha'].default_value = alpha
    if noise:   # colour variation: two tones mixed by a noise texture
        tx = nt.nodes.new('ShaderNodeTexNoise'); tx.inputs['Scale'].default_value = noise_scale; tx.inputs['Detail'].default_value = 6
        ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color = (*rgb, 1); ramp.color_ramp.elements[1].color = (*(rgb2 or [c * (1 - noise) for c in rgb]), 1)
        ramp.color_ramp.elements[0].position = 0.35; ramp.color_ramp.elements[1].position = 0.75
        nt.links.new(tx.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], p.inputs['Base Color'])
    return m

def smooth(o, levels=2, bevel=0.0):
    if bevel: b = o.modifiers.new('bev', 'BEVEL'); b.width = bevel; b.segments = 4; b.limit_method = 'ANGLE'
    s = o.modifiers.new('sub', 'SUBSURF'); s.levels = s.render_levels = levels
    for poly in o.data.polygons: poly.use_smooth = True
    return o

def spin(name, profile, m, steps=64):
    # a lathe: spin a 2D profile (x, z) around the vertical axis
    bm = bmesh.new(); vs = [bm.verts.new((x, 0, z)) for x, z in profile]
    for a, b in zip(vs, vs[1:]): bm.edges.new((a, b))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=math.tau, steps=steps, use_duplicate=False)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); o.data.materials.append(m); return smooth(o, 2)

def mound(name, r, h, z, m, strength=0.06, scale=0.35):
    # a soft heap of food: half sphere, squashed, with gentle noise bumps
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=r, location=(0, 0, z)); o = bpy.context.object; o.name = name
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.001], context='VERTS'); bm.to_mesh(o.data); bm.free()
    o.scale.z = h / r; tex = bpy.data.textures.new(name + '_n', 'CLOUDS'); tex.noise_scale = scale
    d = o.modifiers.new('bumps', 'DISPLACE'); d.texture = tex; d.strength = strength; d.mid_level = 0.5
    o.data.materials.append(m); smooth(o, 1); return o

def scatter(target, piece, count, size=(0.8, 1.2), seed=1, rot=1.0, vert_only=False):
    # particles spread small objects (grains, beans, crumbs) over a surface, each a bit different
    ps = target.modifiers.new('scatter_' + piece.name, 'PARTICLE_SYSTEM').particle_system; st = ps.settings
    st.type = 'HAIR'; st.count = count; st.hair_length = 1; st.render_type = 'OBJECT'; st.instance_object = piece; st.particle_size = 1.0
    st.size_random = (size[1] - size[0]) / max(size[1], 1e-3); st.use_advanced_hair = True; st.use_rotations = True; st.rotation_mode = 'NOR'; st.rotation_factor_random = rot; st.phase_factor_random = 2.0
    st.emit_from = 'FACE'; st.use_emit_random = True; ps.seed = seed; piece.hide_render = True; piece.location = (50, 50, 50)

def piece(name, kind, size, m, squash=(1, 1, 1)):
    if kind == 'capsule': bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=size)
    elif kind == 'tube': bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=size, depth=size * 1.6)
    else: bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=size)
    o = bpy.context.object; o.name = name; o.scale = squash; o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    if kind == 'tube': smooth(o, 1, bevel=size * 0.25)
    return o

def metaballs(name, balls, m, res=0.02):
    # sauce / cream: balls that melt into one smooth surface
    mb = bpy.data.metaballs.new(name); mb.resolution = res; mb.render_resolution = res * 0.6; o = bpy.data.objects.new(name, mb); bpy.context.collection.objects.link(o)
    for (x, y, z, r, sx, sy, sz) in balls:
        e = mb.elements.new(); e.co = (x, y, z); e.radius = r; e.type = 'ELLIPSOID'; e.size_x, e.size_y, e.size_z = sx, sy, sz
    o.data.materials.append(m); return o

def strand(points, r, m, name='strand'):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 3; cu.use_fill_caps = True
    sp = cu.splines.new('NURBS'); sp.points.add(len(points) - 1)
    for p, (x, y, z) in zip(sp.points, points): p.co = (x, y, z, 1)
    sp.use_endpoint_u = True; sp.order_u = 3; o = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(o); o.data.materials.append(m); return o

def studio(sc, target_z=0.35, dist=3.2):
    for (loc, e, sz, col) in [((2.5, -2.5, 3.5), 500, 2.5, (1, 0.95, 0.88)), ((-3, -1, 2), 160, 3, (0.9, 0.95, 1)), ((0, 3, 2.5), 260, 2, (1, 1, 1))]:
        bpy.ops.object.light_add(type='AREA', location=loc); l = bpy.context.object; l.data.energy = e; l.data.size = sz; l.data.color = col
        l.rotation_euler = (Vector((0, 0, target_z)) - l.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=20); fl = bpy.context.object; fl.data.materials.append(mat('floor', (1.0, 0.94, 0.86), 0.8))
    bpy.ops.object.camera_add(location=(0, -dist, dist * 0.78)); cam = bpy.context.object; cam.data.lens = 55; sc.camera = cam
    cam.rotation_euler = (Vector((0, 0, target_z)) - cam.location).to_track_quat('-Z', 'Y').to_euler(); return fl

def finish(name, sc, floor):
    sc.render.filepath = os.path.join(OUT, name + '.png'); bpy.ops.render.render(write_still=True)
    # export the dish (particles made real, metaballs/curves converted) as GLB
    floor.hide_set(True); bpy.ops.object.select_all(action='DESELECT')
    for o in list(sc.objects):
        if o.type in ('MESH', 'META', 'CURVE') and o != floor and not o.hide_render: o.select_set(True)
    try:
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), use_selection=True, export_format='GLB', export_apply=True)
    except Exception as e: print('export', name, e)

R = random.Random(5)
# ======================================================================== KOSHARI
sc = reset()
bowl = spin('bowl', [(0, 0), (0.5, 0.0), (0.78, 0.08), (0.95, 0.35), (1.0, 0.48), (0.95, 0.5), (0.9, 0.42), (0.75, 0.15), (0.45, 0.07), (0, 0.07)], mat('bowl', (0.95, 0.93, 0.88), 0.25, coat=0.6))
rim = spin('rim', [(0.94, 0.47), (1.02, 0.47), (1.02, 0.51), (0.94, 0.51), (0.94, 0.47)], mat('rimblue', (0.15, 0.4, 0.75), 0.3))
heap = mound('heap', 0.84, 0.38, 0.3, mat('ricebase', (0.92, 0.82, 0.6), 0.6, sss=0.2, noise=0.15))
scatter(heap, piece('rice', 'capsule', 0.016, mat('rice', (0.98, 0.95, 0.86), 0.45, sss=0.4), (0.7, 0.7, 2.0)), 2600, seed=1)
scatter(heap, piece('lentil', 'ico', 0.026, mat('lentil', (0.5, 0.29, 0.13), 0.4, noise=0.25), (1, 1, 0.45)), 1300, seed=2, rot=0.3)
scatter(heap, piece('pasta', 'tube', 0.022, mat('pasta', (0.95, 0.78, 0.42), 0.4, sss=0.2)), 260, seed=3)
metaballs('sauce', [(0, 0, 0.67, 0.22, 1.6, 1.6, 0.35), (0.12, 0.06, 0.66, 0.15, 1.3, 1.1, 0.35), (-0.1, -0.08, 0.66, 0.15, 1.2, 1.4, 0.35), (0.05, -0.15, 0.64, 0.1, 1, 1, 0.4)], mat('sauce', (0.72, 0.1, 0.05), 0.12, coat=1, sss=0.2, noise=0.2, noise_scale=4))
onion = mat('onion', (0.45, 0.22, 0.07), 0.35, noise=0.35, rgb2=(0.75, 0.45, 0.15))
for i in range(60):
    a = R.random() * math.tau; d = R.random() * 0.35; z = 0.72 + R.random() * 0.06; pts = []
    for k in range(5): pts.append((math.cos(a) * d + math.cos(a + k * 0.7) * 0.03 * k, math.sin(a) * d + math.sin(a + k * 0.7) * 0.03 * k, z + math.sin(k * 1.3) * 0.015))
    strand(pts, 0.007, onion, 'onion')
finish('koshari', sc, studio(sc))

# ======================================================================== FUL MEDAMES
sc = reset()
spin('pot', [(0, 0), (0.5, 0), (0.85, 0.06), (1.0, 0.3), (1.04, 0.38), (0.98, 0.4), (0.92, 0.32), (0.75, 0.12), (0, 0.1)], mat('clay', (0.62, 0.27, 0.12), 0.75, noise=0.2))
mash = mound('mash', 0.9, 0.2, 0.2, mat('mash', (0.42, 0.24, 0.12), 0.35, noise=0.2, noise_scale=6), strength=0.03)
bean = piece('bean', 'ico', 0.055, mat('bean', (0.48, 0.28, 0.13), 0.3, coat=0.4, noise=0.3, rgb2=(0.62, 0.4, 0.2)), (1.25, 0.85, 0.65))
scatter(mash, bean, 340, seed=4, rot=0.5)
metaballs('oil', [(0.05, 0.0, 0.42, 0.25, 1.6, 1.4, 0.12), (-0.15, 0.12, 0.42, 0.15, 1.2, 1.2, 0.12), (0.2, -0.1, 0.42, 0.12, 1, 1, 0.12)], mat('oil', (0.78, 0.62, 0.1), 0.02, coat=1, transmission=0.5))
scatter(mash, piece('cumin', 'ico', 0.009, mat('cumin', (0.3, 0.16, 0.06), 0.6)), 500, seed=5)
scatter(mash, piece('parsley', 'ico', 0.022, mat('parsley', (0.18, 0.5, 0.15), 0.5), (1, 1, 0.3)), 120, seed=6, rot=0.8)
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.16, location=(-0.6, -0.35, 0.48)); lem = bpy.context.object; lem.scale = (1, 1, 0.5)
lem.data.materials.append(mat('lemon', (0.95, 0.82, 0.15), 0.35, sss=0.3)); smooth(lem, 1)
finish('ful', sc, studio(sc, 0.3))

# ======================================================================== KUNAFA
sc = reset()
spin('tray', [(0, 0), (1.05, 0), (1.12, 0.04), (1.15, 0.17), (1.11, 0.18), (1.08, 0.05), (0, 0.03)], mat('steel', (0.8, 0.82, 0.85), 0.2, metal=1))
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=1.02, depth=0.16, location=(0, 0, 0.12)); base = bpy.context.object; base.data.materials.append(mat('kbase', (0.82, 0.42, 0.08), 0.25, coat=0.9, noise=0.25, rgb2=(0.95, 0.6, 0.2))); smooth(base, 2, bevel=0.03)
strandmat = mat('kstrand', (0.92, 0.55, 0.15), 0.2, coat=1, noise=0.3, rgb2=(0.75, 0.35, 0.05))
for i in range(700):
    a = R.random() * math.tau; d = math.sqrt(R.random()) * 0.97; x, y = math.cos(a) * d, math.sin(a) * d; ang = R.random() * math.tau; L = 0.1 + R.random() * 0.12; pts = []
    for k in range(4): t = k / 3; pts.append((x + math.cos(ang + t * 1.6) * L * t, y + math.sin(ang + t * 1.6) * L * t, 0.205 + R.random() * 0.012))
    strand(pts, 0.007, strandmat, 'k')
bpy.ops.mesh.primitive_circle_add(vertices=48, radius=0.33, fill_type='NGON', location=(0, 0, 0.225)); ctr = bpy.context.object; ctr.data.materials.append(mat('none', (0, 0, 0)))
ctr.hide_render = False; scatter(ctr, piece('pist', 'ico', 0.028, mat('pistachio', (0.42, 0.68, 0.2), 0.5, noise=0.3, rgb2=(0.6, 0.8, 0.3)), (1, 1, 0.6)), 260, seed=7)
ctr.modifiers['scatter_pist'].show_render = True; ctr.show_instancer_for_render = False
finish('kunafa', sc, studio(sc, 0.15))

# ======================================================================== QASHTOUTA
sc = reset()
cup = spin('cup', [(0, 0), (0.42, 0), (0.46, 0.05), (0.62, 1.0), (0.66, 1.04), (0.6, 1.04), (0.58, 0.99), (0.43, 0.08), (0, 0.04)], mat('plastic', (1, 1, 1), 0.02, transmission=1.0))
spin('cake', [(0, 0.05), (0.42, 0.05), (0.51, 0.52), (0, 0.52)], mat('cake', (0.96, 0.84, 0.58), 0.85, sss=0.2, noise=0.25, noise_scale=20, rgb2=(0.85, 0.66, 0.38)))
spin('milk', [(0, 0.52), (0.51, 0.52), (0.55, 0.66), (0, 0.66)], mat('milk', (0.98, 0.95, 0.88), 0.35, sss=0.6))
metaballs('cream', [(0, 0, 0.72, 0.36, 1.4, 1.4, 0.45), (0, 0, 0.86, 0.2, 1, 1, 0.8), (0.18, 0.1, 0.76, 0.16, 1, 1, 0.6), (-0.15, -0.12, 0.76, 0.15, 1, 1, 0.6)], mat('cream', (1, 0.98, 0.94), 0.4, sss=0.5), 0.015)
metaballs('mango', [(0, 0, 0.98, 0.2, 1.5, 1.5, 0.25), (0.22, 0.05, 0.9, 0.08, 1, 1, 1.6), (-0.2, 0.1, 0.9, 0.07, 1, 1, 1.5), (0.02, -0.22, 0.9, 0.07, 1, 1, 1.5)], mat('mango', (1.0, 0.55, 0.05), 0.05, coat=1, sss=0.3), 0.012)
mm = mat('mangocube', (1.0, 0.62, 0.08), 0.15, coat=0.8, sss=0.3)
for i in range(8):
    a = R.random() * math.tau; d = 0.08 + R.random() * 0.17
    bpy.ops.mesh.primitive_cube_add(size=0.09, location=(math.cos(a) * d, math.sin(a) * d, 1.04 + R.random() * 0.03), rotation=(R.random(), R.random(), R.random())); c = bpy.context.object; c.data.materials.append(mm); smooth(c, 2, bevel=0.02)
finish('qashtouta', sc, studio(sc, 0.6, 3.0))
print('DONE')
