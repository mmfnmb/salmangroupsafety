// Copies named animations from one glTF onto a character whose bones have the same names.
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const [charF, animF, out, ...names] = process.argv.slice(2); const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const ch = await io.read(charF), an = await io.read(animF); const byName = new Map(ch.getRoot().listNodes().map((n) => [n.getName(), n])); const buf = ch.getRoot().listBuffers()[0];
const copyAcc = (a) => ch.createAccessor().setType(a.getType()).setArray(a.getArray().slice()).setBuffer(buf);
for (const A of an.getRoot().listAnimations()) { if (names.length && !names.includes(A.getName())) continue; const N = ch.createAnimation(A.getName());
  for (const c of A.listChannels()) { const t = byName.get(c.getTargetNode()?.getName()); if (!t) continue; const s = c.getSampler();
    const S2 = ch.createAnimationSampler().setInput(copyAcc(s.getInput())).setOutput(copyAcc(s.getOutput())).setInterpolation(s.getInterpolation()); N.addSampler(S2);
    N.addChannel(ch.createAnimationChannel().setTargetNode(t).setTargetPath(c.getTargetPath()).setSampler(S2)); } }
await io.write(out, ch); console.log('ok');
