#!/bin/bash
#
# This script will find all files in the current directory which
# do not have BaseColor in their name and resize them to 512px

# Loop through all PNG files in folders and sub-folders
dir=${1:-.}

# Loop through all PNG files in folders and sub-folders
for file in $(find "$dir" -type f -name "*.jpg"); do

	# Resize all files that do not have BaseColor in the name
	if [[ "$file" != *"Color"* ]] && [[ "$file" != *"atlas"* ]]; then

		png_file="${file%.*}.png"  # Convert extension to PNG
		echo "Converting and resizing JPEG: $file"

		convert "$file" -resize 512x512 "$png_file"
    	echo "--------------------------------------------"
	fi
done
