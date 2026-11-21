# Renders two character options in a chunky cartoon style with black outlines:
#   A = a ready-made CC0 character (KayKit, posed with its idle animation)
#   B = an original character built here from shapes
# Usage: python render.py -- <folder with plain glbs> <out folder> [samples]
import bpy, sys, os, math
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
IN, OUT = args[0], args[1]; SAMPLES = int(args[2]) if len(args) > 2 else 64
os.makedirs(OUT, exist_ok=True)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 900, 1100; sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.32, 0.55, 0.95, 1); bg.inputs['Strength'].default_value = 0.9
    return sc

def mat(name, rgb, rough=0.55, metal=0.0, emit=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*rgb, 1); p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    if emit: p.inputs['Emission Color'].default_value = (*rgb, 1); p.inputs['Emission Strength'].default_value = emit
    return m

OUTLINE = None
def outline_mat():
    global OUTLINE
    if OUTLINE: return OUTLINE
    m = bpy.data.materials.new('outline'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader'); geo = nt.nodes.new('ShaderNodeNewGeometry')
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (0.02, 0.015, 0.03, 1)
    nt.links.new(geo.outputs['Backfacing'], mix.inputs['Fac']); nt.links.new(em.outputs[0], mix.inputs[1]); nt.links.new(tr.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], o.inputs['Surface'])
    OUTLINE = m; return m

def add_outline(o, width):
    # inverted hull: a slightly bigger copy turned inside out, drawn black only from behind
    if o.type != 'MESH': return
    o.data.materials.append(outline_mat()); md = o.modifiers.new('outline', 'SOLIDIFY'); md.thickness = width; md.offset = 1.0
    md.use_flip_normals = True; md.use_rim = False; md.material_offset = len(o.data.materials) - 1

def stage(sc, height, target_z):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=height * 0.55, depth=0.12, location=(0, 0, -0.06)); d = bpy.context.object
    d.data.materials.append(mat('stage', (0.98, 0.78, 0.25), 0.6)); add_outline(d, 0.02)
    tgt = Vector((0, 0, target_z))
    def light(kind, loc, energy, size=1.0, color=(1, 1, 1)):
        bpy.ops.object.light_add(type=kind, location=loc); l = bpy.context.object; l.data.energy = energy; l.data.color = color
        if kind == 'AREA': l.data.size = size
        l.rotation_euler = (tgt - l.location).to_track_quat('-Z', 'Y').to_euler(); return l
    light('AREA', (height * 1.3, -height * 1.8, height * 1.9), 260 * height ** 2, height * 1.4, (1.0, 0.96, 0.9))       # key, front right
    light('AREA', (-height * 1.6, -height * 0.9, height * 1.0), 90 * height ** 2, height * 1.4, (0.85, 0.9, 1.0))       # fill, front left
    light('AREA', (-height * 0.6, height * 1.8, height * 1.6), 320 * height ** 2, height * 0.8, (0.8, 0.9, 1.0))       # rim from behind
    bpy.ops.object.camera_add(location=(height * 0.55, -height * 2.6, target_z + height * 0.15)); cam = bpy.context.object; sc.camera = cam; cam.data.lens = 50
    d2 = Vector((0, 0, target_z)) - cam.location; cam.rotation_euler = d2.to_track_quat('-Z', 'Y').to_euler()

# ======================================================================== A: ready-made character, idle pose
sc = reset()
before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=os.path.join(IN, 'SpaceRanger_anim.glb')); char = [o for o in bpy.data.objects if o not in before]
arm = next(o for o in char if o.type == 'ARMATURE')
act = next((a for a in bpy.data.actions if 'Idle_A' in a.name), None); print('ACT', act, [a.name for a in bpy.data.actions])
if act:
    arm.animation_data_create(); arm.animation_data.action = act
    try:
        if act.slots: arm.animation_data.action_slot = act.slots[0]
    except Exception as e: print('slot', e)
sc.frame_set(12)
bpy.context.view_layer.update()
pts = [o.matrix_world @ Vector(c) for o in char if o.type == 'MESH' for c in o.bound_box]
h = max(p.z for p in pts) - min(p.z for p in pts); zmin = min(p.z for p in pts)
for o in char:
    if o.parent is None: o.location.z -= zmin; o.rotation_euler.z += math.pi
for o in char: add_outline(o, h * 0.012)
stage(sc, h, h * 0.5)
sc.render.filepath = os.path.join(OUT, 'A_ready.png'); bpy.ops.render.render(write_still=True)

# ======================================================================== B: an original character from shapes
sc = reset(); OUTLINE = None
SKIN = mat('skin', (0.93, 0.66, 0.5), 0.6); HOOD = mat('hoodie', (1.0, 0.42, 0.08), 0.7); JEANS = mat('jeans', (0.12, 0.2, 0.45), 0.8)
SHOE = mat('shoe', (0.96, 0.96, 0.94), 0.5); SOLE = mat('sole', (0.85, 0.1, 0.12), 0.5); HAIR = mat('hair', (0.18, 0.1, 0.06), 0.5)
WHITE = mat('eyewhite', (1, 1, 1), 0.3); BLACK = mat('pupil', (0.02, 0.02, 0.03), 0.2); LENS = mat('lens', (0.1, 0.85, 0.95), 0.05, 0.0, 0.6)
STRAP = mat('strap', (0.1, 0.1, 0.12), 0.5); GUN = mat('blaster', (0.12, 0.75, 0.6), 0.35); GUN2 = mat('blaster2', (1.0, 0.85, 0.1), 0.35); MOUTH = mat('mouth', (0.45, 0.08, 0.1), 0.4)
PARTS = []
def part(kind, loc, scale, m, rot=(0, 0, 0), sub=2, **kw):
    if kind == 'sphere': bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=loc, **kw)
    elif kind == 'cube': bpy.ops.mesh.primitive_cube_add(location=loc, **kw)
    elif kind == 'cyl': bpy.ops.mesh.primitive_cylinder_add(vertices=24, location=loc, **kw)
    elif kind == 'cone': bpy.ops.mesh.primitive_cone_add(vertices=16, location=loc, **kw)
    elif kind == 'torus': bpy.ops.mesh.primitive_torus_add(location=loc, **kw)
    o = bpy.context.object; o.scale = scale; o.rotation_euler = rot; o.data.materials.append(m); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if kind == 'cube' and sub:
        b = o.modifiers.new('bev', 'BEVEL'); b.width = 0.4 * min(scale); b.segments = 4
    if sub: s = o.modifiers.new('sub', 'SUBSURF'); s.levels = s.render_levels = 1
    bpy.ops.object.shade_smooth(); PARTS.append(o); return o

# legs and big sneakers
for sx in (-1, 1):
    part('cyl', (sx * 0.2, 0, 0.42), (0.15, 0.15, 0.26), JEANS, rot=(0, sx * 0.08, 0))
    part('cube', (sx * 0.22, -0.08, 0.1), (0.17, 0.3, 0.11), SHOE)
    part('cube', (sx * 0.22, -0.08, 0.02), (0.18, 0.31, 0.03), SOLE, sub=0)
# body: hoodie, pocket, hood behind the neck, backpack straps
part('cube', (0, 0, 0.98), (0.42, 0.3, 0.36), HOOD)
part('cube', (0, -0.29, 0.85), (0.24, 0.03, 0.1), mat('pocket', (0.9, 0.35, 0.05), 0.7))
part('torus', (0, 0.12, 1.33), (0.32, 0.26, 0.18), HOOD, rot=(math.radians(70), 0, 0), major_radius=1.0, minor_radius=0.35)
for sx in (-1, 1): part('cube', (sx * 0.22, -0.3, 1.05), (0.04, 0.02, 0.3), STRAP, sub=0)
# left arm: hand on hip; right arm: holding the blaster up
part('cyl', (-0.5, 0, 1.02), (0.11, 0.11, 0.24), HOOD, rot=(0, math.radians(-35), 0))
part('sphere', (-0.6, -0.04, 0.8), (0.13, 0.13, 0.13), SKIN)
part('cyl', (0.52, -0.12, 1.1), (0.11, 0.11, 0.24), HOOD, rot=(math.radians(55), math.radians(20), 0))
part('sphere', (0.58, -0.34, 1.18), (0.13, 0.13, 0.13), SKIN)
# the blaster: body, barrel, tank
part('cube', (0.6, -0.55, 1.28), (0.12, 0.32, 0.13), GUN)
part('cyl', (0.6, -0.95, 1.3), (0.07, 0.07, 0.18), GUN2, rot=(math.radians(90), 0, 0))
part('sphere', (0.6, -0.42, 1.48), (0.13, 0.13, 0.13), GUN2)
# head: big and round, ears, nose, big eyes, brows, a grin
HEAD_Z = 1.78
part('sphere', (0, -0.02, HEAD_Z), (0.5, 0.46, 0.47), SKIN)
for sx in (-1, 1):
    part('sphere', (sx * 0.49, 0, HEAD_Z - 0.02), (0.09, 0.06, 0.12), SKIN)
    part('sphere', (sx * 0.17, -0.4, HEAD_Z + 0.03), (0.12, 0.06, 0.15), WHITE)
    part('sphere', (sx * 0.16, -0.455, HEAD_Z + 0.02), (0.055, 0.03, 0.07), BLACK)
    part('sphere', (sx * 0.145, -0.475, HEAD_Z + 0.05), (0.018, 0.01, 0.018), WHITE, sub=0)
    part('cube', (sx * 0.18, -0.42, HEAD_Z + 0.22), (0.11, 0.03, 0.025), HAIR, rot=(0, sx * 0.25, 0))
part('sphere', (0, -0.47, HEAD_Z - 0.08), (0.06, 0.05, 0.05), SKIN)
part('torus', (0.04, -0.4, HEAD_Z - 0.2), (0.13, 0.08, 0.09), MOUTH, rot=(math.radians(80), 0, math.radians(-8)), major_radius=1.0, minor_radius=0.3)
# spiky hair and goggles pushed up on the forehead
for i, (x, y, z, rx, ry) in enumerate([(0, -0.1, 0.42, -0.4, 0), (-0.25, -0.05, 0.36, -0.2, -0.6), (0.25, -0.05, 0.36, -0.2, 0.6), (-0.12, 0.15, 0.42, 0.4, -0.3), (0.13, 0.15, 0.43, 0.4, 0.35), (0, 0.3, 0.3, 0.9, 0), (-0.35, 0.15, 0.25, 0.3, -1.0), (0.35, 0.15, 0.25, 0.3, 1.0)]):
    part('cone', (x, y, HEAD_Z + z), (0.17, 0.17, 0.3), HAIR, rot=(rx, ry, 0), sub=1)
part('sphere', (0, 0.02, HEAD_Z + 0.12), (0.5, 0.47, 0.36), HAIR)
part('torus', (0, -0.02, HEAD_Z + 0.27), (0.5, 0.47, 0.6), STRAP, rot=(0.12, 0, 0), major_radius=1.0, minor_radius=0.06)
for sx in (-1, 1):
    part('cyl', (sx * 0.17, -0.4, HEAD_Z + 0.33), (0.13, 0.13, 0.05), mat('rim', (0.85, 0.85, 0.88), 0.3, 0.8), rot=(math.radians(78), 0, 0))
    part('cyl', (sx * 0.17, -0.43, HEAD_Z + 0.33), (0.1, 0.1, 0.04), LENS, rot=(math.radians(78), 0, 0), sub=0)
for o in PARTS: add_outline(o, 0.022)
stage(sc, 2.3, 1.15)
sc.render.filepath = os.path.join(OUT, 'B_original.png'); bpy.ops.render.render(write_still=True)
print('DONE')
