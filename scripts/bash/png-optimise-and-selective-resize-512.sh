#!/bin/bash
#
# This script will find all *.png files in the current directory and:
# - optimise them using optipng
# - optimise them using pngout

# Loop through all PNG files in folders and sub-folders
for file in $(find . -type f -name "*.png")
do
    echo "Optimising PNG: $file"

	# Resize all files that do not have BaseColor in the name
	if [[ "$file" != *"Color"* ]] && [[ "$file" != *"atlas"* ]]; then
        width=$(identify -format "%w" "$file")
        height=$(identify -format "%h" "$file")

        if ((width > 512 || height > 512)); then
            echo "Resizing PNG: $file"
            convert "$file" -resize 512x512 "$file"
            echo "--------------------------------------------"
		else; then
			echo "Image is a color or atlas, skipping resize"
        fi
	fi

    # Rename the file to have a `-src` suffix
    mv "$file" "${file%.*}-src.png"

    # Attempt to lossy compress, within a quality range:
    pngquant --speed 2 --quality 80-95 -f "${file%.*}-src.png" -o "$file"

    # Check that a lossy version was generated
    # If NOT, copy the src file
    if [ ! -f $file ]
    then
        echo "pngquant was unable to compress the file $file"
        cp "${file%.*}-src.png" "$file"
    fi

    # Losslessly optimise the output
    pngout $file

    # Remove the `-src` variant
    rm "${file%.*}-src.png"

    echo "--------------------------------------------"
done
