#!/bin/bash
# Renders frames [FROM, TO) of an episode with W workers and encodes them to one video-only segment.
# Usage: EP=1 film/render-seg.sh <from> <to> <workers> <out.mp4>
set -e
cd "$(dirname "$0")/.."
FROM=$1; TO=$2; WK=${3:-4}; OUT=$4; DIR=$(mktemp -d /tmp/seg.XXXX)
STEP=$(( (TO - FROM + WK - 1) / WK ))
for ((i=0; i<WK; i++)); do a=$((FROM + i*STEP)); b=$((a + STEP)); [ $b -gt $TO ] && b=$TO; [ $a -ge $b ] && continue
  EP=${EP:-1} node film/render-ep.cjs $DIR $a $b 1 > $DIR/log_$i.txt 2>&1 & done
wait
ffmpeg -v error -y -framerate 24 -start_number $FROM -i $DIR/%05d.jpg -frames:v $((TO - FROM)) -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -r 24 $OUT
echo "segment $OUT done: $(ls $DIR/*.jpg | wc -l) frames"
