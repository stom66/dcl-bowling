#!/bin/bash
#
# This script will find all *.png files in the current directory and:
# - optimise them using optipng
# - optimise them using pngout

dir=${1:-.}

# Loop through all PNG files in folders and sub-folders
for file in $(find "$dir" -type f -name "*.png")
do
    echo "Optimising PNG: $file"

    # Rename the file to have a `-src` suffix
    mv "$file" "${file%.*}-src.png"

    # Attempt to lossy compress, within a quality range:
    pngquant --speed 2 \
			 --quality 80-95 \
			 --strip \
			 --force \
			 --output "$file" \
			 "${file%.*}-src.png"

    # Check that a lossy version was generated
    # If NOT, copy the src file
    if [ ! -f $file ]
    then
        echo "pngquant was unable to compress the file $file"
        cp "${file%.*}-src.png" "$file"
    fi

    # Losslessly optimise the output with pngout
    pngout $file

    # Losslessly optimise the output with optipng
	# optipng appears to offer no more compressions than pngout
    # optipng -o7 $file

    # Remove the `-src` variant
    rm "${file%.*}-src.png"

    echo "--------------------------------------------"
done

cowsay "All PNG files have been opti-moos-ed"
