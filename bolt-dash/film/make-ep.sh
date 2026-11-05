#!/bin/bash
# One command for a whole episode, no supervision needed:
# dump timing + subtitles -> render all frames on every core -> synthesize the soundtrack -> encode -> media/sNeM.mp4 + subs.
# Usage: EP=1 OUT=s1e1 film/make-ep.sh      (progress in /tmp/make-ep.log; finished marker /tmp/make-ep.done)
set -e
cd "$(dirname "$0")/.."
EP=${EP:-1}; OUT=${OUT:-s1e1}; W=${W:-4}; T=${T:-/tmp/ep-$OUT}; mkdir -p $T/frames  # same folder every run, so a restart resumes
rm -f /tmp/make-ep.done; exec > >(tee -a /tmp/make-ep.log) 2>&1
echo "[$(date +%T)] dump"; [ -f $T/ep.meta.json ] || EP=$EP node film/dump-ep.cjs $T/ep
FR=$(node -e "console.log(require('$T/ep.meta.json').frames)"); TOTAL=$(node -e "console.log(require('$T/ep.meta.json').total)")
node -e "require('fs').writeFileSync('$T/cues.json', JSON.stringify(require('$T/ep.meta.json').cues))"
echo "[$(date +%T)] render $FR frames with $W workers"
STEP=$(( (FR + W - 1) / W ))
for ((i=0; i<W; i++)); do a=$((i*STEP)); b=$((a+STEP)); [ $b -gt $FR ] && b=$FR; EP=$EP node film/render-ep.cjs $T/frames $a $b 1 > $T/w$i.log 2>&1 & PIDS="$PIDS $!"; done
wait $PIDS  # only the workers (a bare wait would also wait for the log's tee forever)
echo "[$(date +%T)] frames: $(ls $T/frames | wc -l)"
node film/audio-ep.cjs $T/cues.json $T/ep.subs.json $TOTAL $T/audio.wav
ffmpeg -v error -y -framerate 24 -i $T/frames/%05d.jpg -i $T/audio.wav -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 112k -shortest media/$OUT.mp4
cp $T/ep.subs.json media/$OUT.subs.json
ls -la media/$OUT.mp4; echo "[$(date +%T)] done"; touch /tmp/make-ep.done
