// Keeps only colour textures (the baked street is drawn unlit with lightmaps, so normal/roughness maps are never used).
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import { prune } from '@gltf-transform/functions';
const [i, o] = process.argv.slice(2); const io = new NodeIO().registerExtensions(ALL_EXTENSIONS); const doc = await io.read(i);
for (const m of doc.getRoot().listMaterials()) { m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null); m.setEmissiveTexture(null); }
await doc.transform(prune({ keepAttributes: true })); await io.write(o, doc); console.log('ok');
