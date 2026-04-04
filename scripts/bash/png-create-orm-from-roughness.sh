#!/bin/bash


# Check if the input images are grayscale
if ! identify "$1" | grep -q 'Gray'; then
  echo "Error: $1 is not a grayscale image." >&2
  exit 1
fi

convert "$1" -background black -channel G -combine "$2"

echo "Images combined successfully. Output file: $2"
