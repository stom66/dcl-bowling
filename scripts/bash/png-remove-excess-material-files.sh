#!/bin/bash
# Used for removing the textures we don't use, after using them to generate the rough and ORM textures

dir=${1:-.}

echo "looping through directory ${dir}"
# Loop through all PNG files in folders and sub-folders
for file in $(find "$dir" -type f | grep -E 'GLOSS|BUMP|REFL|DISP|DISP16')
do
    if [[ $file =~ \.(png|jpg|jpeg|tif)$ ]]; then # specify file extensions to search
        echo "Removing image file: $file"
		rm "$file"
    fi

    echo "--------------------------------------------"
done
