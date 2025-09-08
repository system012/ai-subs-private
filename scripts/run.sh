#!/bin/bash

# Check if gum is installed
if ! command -v gum &> /dev/null
then
    echo "Error: gum is not installed. Please install it (https://github.com/charmbracelet/gum) to use this script."
    exit 1
fi

# Define the subs directory and the output directory
SUBS_DIR="subs"
OUTPUT_DIR="output"

# Check if the subs directory exists, create it if not
if [ ! -d "$SUBS_DIR" ]; then
  gum style --foreground 212 "Directory '$SUBS_DIR' not found. Creating it..."
  mkdir -p "$SUBS_DIR"
  if [ $? -ne 0 ]; then
    gum style --foreground 197 "Error: Failed to create directory '$SUBS_DIR'."
    exit 1
  fi
  gum style --foreground 70 "Directory '$SUBS_DIR' created successfully."
fi

# Create the output directory if it doesn't exist
if [ ! -d "$OUTPUT_DIR" ]; then
  gum style --foreground 212 "Directory '$OUTPUT_DIR' not found. Creating it..."
  mkdir -p "$OUTPUT_DIR"
  if [ $? -ne 0 ]; then
    gum style --foreground 197 "Error: Failed to create directory '$OUTPUT_DIR'."
    exit 1
  fi
  gum style --foreground 70 "Directory '$OUTPUT_DIR' created successfully."
fi

# Find .srt files in the subs directory, sort by modification time (newest first)
# macOS compatible version using stat
raw_stat_output=$(find "$SUBS_DIR" -maxdepth 1 -name '*.srt' -print0 | xargs -0 stat -f "%m %N" 2>/dev/null)
sorted_paths_output=$(echo "$raw_stat_output" | sort -nr | cut -d' ' -f2-)

sorted_files=()
while IFS= read -r line; do
    # Add to array only if the line is not empty
    if [[ -n "$line" ]]; then
        sorted_files+=("$line")
    fi
done <<< "$sorted_paths_output"

# Check if any .srt files were found
if [ ${#sorted_files[@]} -eq 0 ]; then
  gum style --foreground 212 "No .srt files found in the '$SUBS_DIR' directory."
  exit 0
fi

# Prepare display names (basenames) for gum
display_names=()
for file_path in "${sorted_files[@]}"; do
  display_names+=("$(basename "$file_path")")
done

# Use gum to let the user choose a file by its display name
selected_display_name=$(gum choose "${display_names[@]}" --header "Select the input subtitle file:")

# Check if the user cancelled (gum choose returns empty string on cancel)
if [ -z "$selected_display_name" ]; then
  gum style --foreground 212 "No file selected. Exiting."
  exit 0
fi

# Find the original full path corresponding to the selected display name
selected_file=""
for file_path in "${sorted_files[@]}"; do
  if [[ "$(basename "$file_path")" == "$selected_display_name" ]]; then
    selected_file="$file_path"
    break
  fi
done

# Double-check if we found the full path (should always work if selection wasn't cancelled)
if [ -z "$selected_file" ]; then
    gum style --foreground 197 "Error: Could not map selected display name back to file path."
    exit 1
fi

# Construct the output filename
# Get the filename without the directory path
filename=$(basename "$selected_file")
# Get the filename without the extension
filename_no_ext="${filename%.*}"
# Create the output filename in the OUTPUT_DIR
output_file="${OUTPUT_DIR}/${filename_no_ext}_output.srt"

# Run the node script with the selected input and generated output
gum style --bold --foreground 117 "Running translation for:" "Input: $selected_file" "Output: $output_file"
echo "" # Add a newline for better separation

bun run index.ts -i "$selected_file" -o "$output_file"

# Capture the exit code of the bun command
exit_code=$?

if [ $exit_code -eq 0 ]; then
  gum style --foreground 70 "Translation process completed successfully for: $filename"
else
  gum style --foreground 197 "Translation process failed with exit code $exit_code."
fi

exit $exit_code
