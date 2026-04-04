#!/bin/bash

# Simple script to generate images with the specified accent colors

# Set image dimensions and output directory
DIMENSIONS="32x32"
OUTPUT_DIR="../assets/tex"

# Define colors dictionary with line breaks for readability
declare -A colors=(
  ["accent_yellow"]="#fede46"
  ["accent_teal"]="#009c94"
  ["accent_orange"]="#ef8b64"
  ["accent_red"]="#ed5955"

  ["accent_purple"]="#a365b9"
  ["accent_blue_light"]="#265d9f"
  ["accent_blue_mid"]="#417290"
  ["accent_blue_dark"]="#15182c"

  ["palette_01_01"]="#22223b"
  ["palette_01_02"]="#23344a"
  ["palette_01_03"]="#234558"
  ["palette_01_04"]="#4a4e69"
  ["palette_01_05"]="#393F2D"

  ["bw_000"]="#000000"
  ["bw_111"]="#111111"
  ["bw_222"]="#222222"
  ["bw_333"]="#333333"
  ["bw_444"]="#444444"
  ["bw_555"]="#555555"
  ["bw_666"]="#666666"
  ["bw_777"]="#777777"
  ["bw_888"]="#888888"
  ["bw_999"]="#999999"
  ["bw_aaa"]="#aaaaaa"
  ["bw_bbb"]="#bbbbbb"
  ["bw_ccc"]="#cccccc"
  ["bw_ddd"]="#dddddd"
  ["bw_eee"]="#eeeeee"
  ["bw_fff"]="#ffffff"

)

# Create output directory if it doesn't exist
if [ ! -d "$OUTPUT_DIR" ]; then
  mkdir "$OUTPUT_DIR"
fi

# Loop through colors and create image files
for name in "${!colors[@]}"
do
  # Create a new image file with the specified color and dimensions
  echo "Generating image file for color $name: ${colors[$name]}"
  convert -size "$DIMENSIONS" xc:"${colors[$name]}" "$OUTPUT_DIR/${name}.png"

  echo "Running pngquant on $OUTPUT_DIR/${name}.png"
  pngquant -q --speed 0 --quality 80-95 -f "$OUTPUT_DIR/${name}.png" -o "$OUTPUT_DIR/${name}.png"

  echo "Running pngout on $OUTPUT_DIR/${name}.png"
  pngout "$OUTPUT_DIR/${name}.png"

  echo "------------------------------------------"
done

