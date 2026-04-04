#!/bin/bash
#
# This script will find all *.jpg files in the current directory and:
# - convert them to png

dir=${1:-.}

# Loop through all jpg or jpeg files in folders and sub-folders
find "$dir" -type f -name "*.jpg" | while read file
do
    echo "Converting JPG: $file"
    convert "$file" "${file%.*}.png"
    echo "--------------------------------------------"
done
