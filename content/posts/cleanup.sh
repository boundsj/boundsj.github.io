#!/bin/bash

# Define the cutoff date
cutoff_date="2024-01-09"

# Regular expression for the date format YYYY-MM-DD
date_regex="[0-9]{4}-[0-9]{2}-[0-9]{2}"

# Loop through all directories in the current directory
for dir in */; do
  # Remove the trailing slash from the directory name
  dir_name=$(basename "$dir")

  # Check if the directory name has at least 3 parts (e.g., title-YYYY-MM-DD)
  parts_count=$(echo "$dir_name" | awk -F'-' '{print NF}')
  if [[ $parts_count -ge 3 ]]; then
    # Extract the date part from the directory name using awk
    dir_date=$(echo "$dir_name" | awk -F'-' '{print $(NF-2)"-"$(NF-1)"-"$NF}')

    # Check if the extracted part matches the date pattern
    if [[ "$dir_date" =~ $date_regex ]]; then
      # If the directory date is greater than the cutoff date
      if [[ "$dir_date" > "$cutoff_date" ]]; then
        # Remove the directory
        echo "Removing directory: $dir"
        rm -r "$dir"
      fi
    else
      echo "Skipping directory without valid date: $dir"
    fi
  else
    echo "Skipping directory with insufficient parts: $dir"
  fi
done
