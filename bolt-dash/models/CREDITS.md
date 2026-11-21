# Model credits

All `.glb` files in this folder come from the **Ultimate Platformer Pack by Quaternius**
(https://quaternius.com), released under **CC0 1.0 (public domain)**.
Downloaded from the GitHub mirror `trebeljahr/quaternius-showcase` (`public/glb/platformer_game_pack`).

`models/acc/` and `models/k/` contain models from **Kenney** (https://kenney.nl, CC0) via the GitHub
mirror `shorepine/kenney`, and from **Quaternius** (CC0) via `trebeljahr/quaternius-showcase`.
Kenney textures (colormap.png) were embedded into each .glb.

- film/x-hm-b (hockey mask): "Jason Mask" by ShadowSupreme, https://sketchfab.com/3d-models/jason-mask-e4835b7ecfb949abab16cc2065a1e738 (Sketchfab Standard licence), via github.com/apaleblueman/amazoff-dot-com. Textures resized.
- k/soccer-field: "Soccer Field" by tikodev (https://sketchfab.com/tikoavp), CC-BY-4.0, https://sketchfab.com/3d-models/soccer-field-4648dead5e1f4c97bcef826e40e6cfbe (via github.com/gonnabea/Metaverse-Jworld-Client)
- k/bomb: Kenney Platformer Kit (CC0, kenney.nl), via github.com/foxssake/netfox
- k/gy-*: Kenney Graveyard Kit (CC0, kenney.nl), via github.com/mashumafi/hunted_house_bbgj5
- k/pet-*: Ultimate Monsters by Quaternius (CC0), via github.com/mika314/KitchenSink
- acc/kk-*: KayKit Adventurers by Kay Lousberg (CC0), via github.com/Tamicktom/game-3d
- world/*.pack: Kenney City Kit (Commercial, Suburban, Roads), Car Kit, Food Kit, Mini Market, Furniture Kit (CC0, kenney.nl), via github.com/series-ai/jam-ready-assets

## Loading screen flags
- Country flags from **flag-icons** by Panayiotis Lipiridis — https://github.com/lipis/flag-icons — MIT License.

## Announcer voices
- Recorded commentator lines (world/voice-ar.pack.txt, world/voice-en.pack.txt) were spoken by Piper neural voices
  (https://github.com/rhasspy/piper, MIT), via the sherpa-onnx model releases:
  - Arabic: ar_JO "kareem" (medium). Dataset: https://github.com/AliMokhammad/arabicttstrain/ (license: see that URL)
  - English: en_US "libritts_r" (medium), speakers 3 and 9. Dataset: LibriTTS-R, CC BY 4.0
- Live announcer voice (world/voice/): the same Piper voices (8-bit), run in the page with ONNX Runtime Web
  (MIT) and Piper's phonemizer from @mintplex-labs/piper-tts-web / @diffusionstudio/piper-wasm (MIT), which
  includes espeak-ng data (GPL-3.0), trimmed to Arabic and English.
