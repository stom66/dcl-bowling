#!/bin/bash

find ../assets/tex/ -type f \( -name "*GLOSS*.png" -o -name "*GLOSS*.jpg" \) -print0 |
while read -d $'\0' file; do
    if [[ -f "$file" ]]; then
        echo "Converting GLOSS: $file"
        filename="${file/GLOSS/ROUGH}"
        convert "$file" -negate "$filename"
        echo "Converted to ROUGH: $filename"
        echo "---------------------------------------------"
    else
        echo "Skipping $file"
    fi
done
