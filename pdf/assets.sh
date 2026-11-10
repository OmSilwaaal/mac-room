#!/bin/zsh
# Builds every image the PDF uses into pdf/img from public/media, src/assets and pdf/.frames.
# Usage: zsh pdf/assets.sh   (needs ffmpeg; run node pdf/frames.cjs first)
set -e
cd "$(dirname "$0")/.."
M=public/media; I=pdf/img; F=pdf/.frames; T=$(mktemp -d)
mkdir -p $I/strip

# black-ink-on-paper palette for the dithered images
ffmpeg -v error -y -f lavfi -i "color=c=0x111111:s=16x8,format=rgb24" -f lavfi -i "color=c=0xe9e6de:s=16x8,format=rgb24" -filter_complex "[0][1]vstack=2" -frames:v 1 $T/kpal.png

still() { ffmpeg -v error -y -ss $3 -i "$2" -frames:v 1 -vf scale=1000:-2 -q:v 3 $I/$1.jpg; }
still tvx-squish $M/travauxus-squish.mp4 5
still tvx-ascii $M/travauxus-ascii.mp4 6
still tvx-opening $M/travauxus-opening.mp4 4
still tvx-dither $M/travauxus-dither.mp4 3
still a5-site $M/a5-site.mp4 7.6
still om-site $M/om-site.mp4 4
still pusto $M/pusto.mp4 6
cp $M/a5-card-1.jpg $I/a5-card.jpg
cp $M/om-card-1.jpg $I/om-card.jpg
cp $M/om-card-2.jpg $I/om-card-back.jpg

# five frames spread across a video (or explicit times), for the filmstrips
strip() {
  local name=$1 src=$2; shift 2
  local times=("$@")
  if [ ${#times} -eq 0 ]; then
    local d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
    times=($(python3 -c "print(' '.join(str(round($d*(i-0.5)/5,2)) for i in range(1,6)))"))
  fi
  local i=0
  for t in $times; do i=$((i+1)); ffmpeg -v error -y -ss $t -i "$src" -frames:v 1 -vf "scale=480:300:force_original_aspect_ratio=increase,crop=480:300" -q:v 4 $I/strip/$name-$i.jpg; done
}
for n in squish ascii opening dither; do strip tvx-$n $M/travauxus-$n.mp4; done
strip a5 $M/a5-site.mp4 0.4 1.6 4.0 5.2 7.6   # intro only: the later contact page shows Ari's phone and email
strip om $M/om-site.mp4
strip pusto $M/pusto.mp4

# dithered stills + strips from rendered frames
dith() { ffmpeg -v error -y -i "$2" -i $T/kpal.png -filter_complex "[0:v]scale=${3}:flags=area,eq=contrast=1.25[v];[v][1:v]paletteuse=dither=bayer:bayer_scale=2,scale=${4}:flags=neighbor" -frames:v 1 "$1"; }
for n in tennisbot vitalis newthing; do
  count=$(ls $F/$n | wc -l | tr -d ' ')
  main=$(python3 -c "print(int(($count-1)*0.85))")
  dith $I/$n.png $(printf "$F/$n/f%03d.png" $main) 400:250 1200:750
  for i in 1 2 3 4 5; do
    k=$(python3 -c "print(int(($count-1)*($i-0.5)/5))")
    dith $I/strip/$n-$i.png $(printf "$F/$n/f%03d.png" $k) 320:200 640:400
  done
done

# portrait
ffmpeg -v error -y -i src/assets/pfp.jpg -i $T/kpal.png -filter_complex "[0:v]crop=iw/1.35:ih/1.35:iw*0.6-iw/2.7:ih*0.58-ih/2.7,scale=220:260:flags=area,eq=contrast=1.35[v];[v][1:v]paletteuse=dither=floyd_steinberg,scale=660:780:flags=neighbor" -frames:v 1 $I/pfp.png

rm -rf $T
echo "images: $(ls $I | wc -l | tr -d ' ') + strips: $(ls $I/strip | wc -l | tr -d ' ')"
