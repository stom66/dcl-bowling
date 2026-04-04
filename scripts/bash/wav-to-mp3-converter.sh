#!/bin/bash

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null
then
    echo "FFmpeg is not installed. Please install FFmpeg and try again."
    exit
fi

# Check if input directory is provided
if [ -z "$1" ]
then
    echo "Please provide input directory as argument."
    exit
fi

# Get the absolute path of the input directory
input_dir=$(realpath "$1")

# Check if the input directory exists
if [ ! -d "$input_dir" ]
then
    echo "Input directory does not exist."
    exit
fi

# Set the bitrate and channel options
bitrate="64k"
channels=1

# Loop through all the WAV files in the input directory and convert them to MP3
total_size=0
total_compressed_size=0
for file in "$input_dir"/*.wav
do
    # Get the file name without extension
    filename=$(basename -- "$file")
    filename="${filename%.*}"

    # Convert WAV to MP3 using FFmpeg with the specified options
    ffmpeg -i "$file" -b:a "$bitrate" -ac "$channels" -q:a 2 "$input_dir/$filename.mp3" -hide_banner -loglevel panic

    # Get the file size of the original WAV file and the compressed MP3 file
    original_size=$(wc -c < "$file")
    compressed_size=$(wc -c < "$input_dir/$filename.mp3")

    # Calculate the percentage of compression achieved
    percentage=$((100 - (compressed_size * 100 / original_size)))

    # Add the file sizes to the total
    total_size=$((total_size + original_size))
    total_compressed_size=$((total_compressed_size + compressed_size))

    # Print the percentage of compression achieved
    echo "$filename compressed by $percentage% (original size: $original_size bytes, compressed size: $compressed_size bytes)"
	echo "-----------------------------------------------------------------------------------"
done

# Calculate the total percentage of compression achieved
total_percentage=$((100 - (total_compressed_size * 100 / total_size)))

# Print the total percentage of compression achieved
echo "Total compression achieved: $total_percentage% (original size: $total_size bytes, compressed size: $total_compressed_size bytes)"

echo "Conversion completed."
