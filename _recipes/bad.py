import re
import os
import sys
import shutil

# Initialize the regular expression pattern.
pattern = re.compile(r'\A(?!---)', re.MULTILINE | re.DOTALL)

# Check if a directory path was provided.
if len(sys.argv) != 2:
    print('Usage: python script.py <dir_path>')
    sys.exit(1)

# Get the directory path from the command-line arguments.
dir_path = sys.argv[1]

# Check if the directory exists.
if not os.path.isdir(dir_path):
    print('The provided path is not a directory.')
    sys.exit(1)

# Create the 'to_fix' subdirectory if it does not already exist.
to_fix_path = os.path.join(dir_path, 'to_fix')
os.makedirs(to_fix_path, exist_ok=True)

# Loop over each file in the directory.
for filename in os.listdir(dir_path):
    # Check if the file is a Markdown file.
    if filename.endswith('.md'):
        file_path = os.path.join(dir_path, filename)
        # Open the Markdown file.
        with open(file_path, 'r') as f:
            content = f.read()
            # Check if the file does not start with '---'.
            if pattern.search(content):
                # Move the file to the 'to_fix' subdirectory.
                shutil.move(file_path, os.path.join(to_fix_path, filename))
                print(f"Moved {filename} to 'to_fix' subdirectory")
