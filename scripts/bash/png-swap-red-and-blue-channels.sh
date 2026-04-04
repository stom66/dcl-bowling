#!/bin/bash

# Source and destination folders
SRC_DIR="../assets/tex/dev/red"
DEST_DIR="../assets/tex/dev/blue"

# Loop through all images in the source folder
for file in "$SRC_DIR"/*.png; do
  # Get the filename without the extension
  filename=$(basename "$file" .png)

  # Convert the image and output to the destination folder with swapped red and blue channels
  convert "$file" -separate -swap 0,2 -combine "$DEST_DIR/$filename.png"
done
