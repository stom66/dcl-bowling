#!/bin/bash
#
# This script will find all *.jpg files in the current directory and:
# - optimise them using jpegtran

#  jpegtran -copy none -optimize -outfile SandWavy001_NRM_1K.2.jpg SandWavy001_NRM_1K.jpg

dir=${1:-.}

# Loop through all jpg or jpeg files in folders and sub-folders
find "$dir" -type f -name "*.jpg" | while read file
do
    echo "Optimising JPG: $file"

	# Get the original file size
    orig_size=$(du -h "$file" | cut -f1)

	# Rename the file to have a `-src` suffix
    mv "$file" "${file%.*}-src.jpg"

	# Losslessly optimise the image using jpegtran
    jpegtran -optimize -copy none -outfile "$file" "${file%.*}-src.jpg"

    # Check that a lossy version was generated
    # If NOT, copy the src file
    if [ ! -f $file ]
    then
        echo "jpegtran was unable to compress the file $file"
        cp "${file%.*}-src.jpg" "$file"
	else

		orig_size_bytes=$(du -b "${file%.*}-src.jpg" | cut -f1)
		new_size_bytes=$(du -b "$file" | cut -f1)
    	new_size=$(du -h "$file" | cut -f1)
		reduction=$(echo "scale=2; ($orig_size_bytes - $new_size_bytes) / $orig_size_bytes * 100" | bc)

		echo "$file has been reduced from $orig_size -> $new_size: $reduction%"

    fi


    # Remove the `-src` variant
    rm "${file%.*}-src.jpg"

    echo "--------------------------------------------"
done
