import os
import json
import argparse

def json_to_markdown(json_file):
    with open(json_file, 'r') as file:
        data = json.load(file)
        text = data["document"]["text"]
        return text

def save_as_markdown(json_file, text):
    markdown_file = os.path.splitext(json_file)[0] + ".md"
    with open(markdown_file, 'w') as file:
        file.write(text)

def convert_json_files_to_markdown(directory, debug=False):
    if not os.path.isdir(directory):
        print(f"Error: {directory} is not a valid directory.")
        return

    for filename in os.listdir(directory):
        if filename.endswith(".json"):
            json_file = os.path.join(directory, filename)
            text = json_to_markdown(json_file)
            save_as_markdown(json_file, text)
            if debug:
                print(f"Processed: {filename}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert JSON files to Markdown.")
    parser.add_argument("directory", help="Path to the directory containing JSON files.")
    parser.add_argument("--debug", action="store_true", help="Show processing status.")
    args = parser.parse_args()

    input_directory = args.directory
    debug_mode = args.debug

    convert_json_files_to_markdown(input_directory, debug=debug_mode)
