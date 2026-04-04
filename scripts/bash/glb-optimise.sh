#!/bin/bash

# What:
# This script will find all *.glb files in the current directory and:
# - converts them to gltf
# - externalises texture files

# How to use:
# Drag and drop this script into the folder of images to be optimised
# Run the script, either via terminal, or in VSCode (right-click and Run Code)

# Script:
# Loop through all GLB files in folders and sub-folders
for f in $(find . -type f -name "*.glb")
do
    echo "Optimising file: $f"
    gltf-pipeline \
        --input $f \
        --output ${f%.*}.gltf \
        --json \
        --separateTextures \
        --stats
    echo "--------------------------------------------"
done
