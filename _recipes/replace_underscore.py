import os
import glob
import argparse

def replace_dash_with_underscore(file_path, debug=False):
    if debug:
        print(f"Editing file: {file_path}")

    with open(file_path, 'r', errors='ignore') as file:
        lines = file.readlines()

    with open(file_path, 'w', errors='ignore') as file:
        for line in lines:
            if line.startswith('image: '):
                file.write(line.replace('-', '_'))
            else:
                file.write(line)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--debug", help="enable debug mode", action="store_true")
    args = parser.parse_args()

    # Loop over all .md files in the current directory
    for file_path in glob.glob('*.md'):
        replace_dash_with_underscore(file_path, args.debug)

if __name__ == "__main__":
    main()
