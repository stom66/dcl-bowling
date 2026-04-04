#!/bin/bash

# This script will find all *.gltf files in the input folder and:
# - converts them to glb
# - keeps external texture files
# - does NOT run draco compression - this should be done by blender

# Check if input and output folders are provided as arguments
if [ $# -lt 2 ]; then
  echo "Please provide input and output folder paths."
  exit 1
fi

input_folder=$1
output_folder=$2

# Create output folder if it doesn't exist
mkdir -p "$output_folder"

# Loop through all gltf files in the input folder and sub-folders
find "$input_folder" -type f -name "*.gltf" | while read -r file; do

  echo "Converting glTF to GLB: $file"

  # Get the relative path of the input file
  rel_file="${file#$input_folder}"

  # Remove leading slash if present
  rel_file="${rel_file#/}"

  # Generate the output file path
  output_file="$output_folder/${rel_file%.gltf}.glb"

  # Create the output folder if it doesn't exist
  mkdir -p "$(dirname "$output_file")"

  # Run gltf-pipeline on the file
  gltf-pipeline --stats \
    -i "$file" \
    -o "$output_file" \
    --separateTextures

  echo "----------------------------------------------------------------"

done

cowsay "All glTF files have been moo-ved to GLBs"
