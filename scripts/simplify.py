import random
import re
import time
import html2text
from openai import OpenAI
from google import genai
from google.genai import types
from PIL import Image
import yaml

import os
import argparse
import shutil
import openai
import unidecode
import subprocess
import requests
from dotenv import load_dotenv

system_file_path = "scripts/system_text.md"
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Load environment variables from .env file
load_dotenv()

# Set OpenAI API key from .env

def read_system_text(file_path):
    with open(file_path, "r") as file:
        return file.read().strip()

def generate_title(content, debug):
    # Use a regex pattern to find the title within the '---' delimiters
    pattern = r'^---\s*title:\s*(.*?)$'
    match = re.search(pattern, content, re.MULTILINE | re.IGNORECASE)

    #if debug:
        #print(f"Content {content}.\n")

    if match:
        title = match.group(1).strip()
        print(f"Match: {match}.\n")
    else:
        # If no title is found, use a default title
        return None

    # Remove any non-ASCII characters from the title
    title = unidecode.unidecode(title)

    # Replace non-alphanumeric characters (except underscores) with underscores in the title
    title = re.sub(r"[^a-zA-Z0-9_]+", "_", title)

    # Ensure the file name is not too long (100 characters limit)
    return title[:100].lower()

# Enable debugging globally
def debug_log(message, debug):
    if debug:
        print(f"DEBUG: {message}")

def transform_content(content, system_file_path, debug):
    debug_log("Starting content transformation.", debug)
    content = re.sub(r'\[!.*?\]\(.*?svg.*?\]\(.*?\)', '', content)
    model = "gpt-4"
    response = None

    for delay_secs in (2**x for x in range(0, 6)):
        try:
            system_text = read_system_text(system_file_path)
            debug_log(f"System text loaded: {system_text[:50]}...", debug)
            response = client.chat.completions.create(
                model=model,
                temperature=0.3,
                messages=[
                    {"role": "system", "content": system_text},
                    {"role": "user", "content": f"Convert the following content into the new format {content}"},
                ]
            )
            debug_log("Content transformation successful.", debug)
            break
        except openai.OpenAIError as e:
            randomness_collision_avoidance = random.randint(0, 1000) / 1000.0
            sleep_dur = delay_secs + randomness_collision_avoidance
            debug_log(f"Error: {e}. Retrying in {round(sleep_dur, 2)} seconds.", debug)
            time.sleep(sleep_dur)
            continue

    debug_log("Returning transformed content.", debug)
    return response.choices[0].message.content    

def save_transformed_file(output_folder, title, transformed_content, debug):
    # Replace non-alphanumeric characters (except underscores) with underscores in the title
    title = re.sub(r"[^a-zA-Z0-9_]+", "_", title)

    # Ensure the file name is not too long (100 characters limit)
    title = title[:100]

    # Strip the leading underscore if present
    if title.startswith("_"):
        title = title[1:]

    # Append the ".md" extension to the title
    output_file_path = os.path.join(output_folder, f"{title}.md")

    with open(output_file_path, "w", encoding="utf-8") as output_file:
        output_file.write(transformed_content)

    if debug:
        print(f"Saving {title}.md successfully.\n")

    # return the file path of the saved file
    return output_file_path

def process_markdown_files(input_folder, output_folder, debug=False):
    # Create the output folder if it doesn't exist
    os.makedirs(output_folder, exist_ok=True)

    # Get a list of markdown files in the input folder
    markdown_files = [file for file in os.listdir(input_folder) if file.endswith(".md")]
    markdown_files = sorted(markdown_files)

    for filename in markdown_files:
        input_file_path = os.path.join(input_folder, filename)
        output_file_path = os.path.join(output_folder, filename)

        try:
            if debug:
                print(f"Reading {filename}.")

            with open(input_file_path, "r", encoding="utf-8", errors="replace") as input_file:
                content = input_file.read()

            if debug:
                print(f"Transforming {filename}.")

            transformed_content = transform_content(content, system_file_path, debug)
            title = generate_title(transformed_content, debug)

            if not(title):
                title = filename[:-3]
            saved_file_path = save_transformed_file(output_folder, title, transformed_content, debug)

            # Removed image generation logic and added a call to the new script
            call_image_generation(saved_file_path, debug)
            if debug:
                print(f"Processed {filename} successfully.\n")
        except Exception as e:
            if debug:
                print(f"Error processing {filename}: {e}")

def process_html_files(input_folder, output_folder):
    # Create the output folder if it doesn't exist
    os.makedirs(output_folder, exist_ok=True)

    # Get a list of html files in the input folder
    html_files = [file for file in os.listdir(input_folder) if file.endswith(".html")]
    html_files = sorted(html_files)

    h = html2text.HTML2Text()
    h.ignore_links = False

    for filename in html_files:
        input_file_path = os.path.join(input_folder, filename)
        output_file_path = os.path.join(output_folder, filename.replace('.html', '.md'))

        with open(input_file_path, 'r', encoding='utf-8', errors='replace') as input_file:
            html_content = input_file.read()

        # Convert HTML to Markdown
        markdown_content = h.handle(html_content)

        with open(output_file_path, 'w', encoding='utf-8') as output_file:
            output_file.write(markdown_content)

def update_yaml_metadata(input_file, image_file, debug):
    with open(input_file, "r", encoding="utf-8") as file:
        content = file.read()

    # Parse the YAML metadata
    yaml_delimiter = "---"
    if content.startswith(yaml_delimiter):
        parts = content.split(yaml_delimiter)
        if len(parts) > 2:
            metadata = yaml.safe_load(parts[1])
            if debug:
                print(f"Original metadata: {metadata}")

            # Update the image field
            # Ensure the image path is relative to the input file's directory
            relative_image_path = os.path.relpath(image_file, start=os.path.dirname(input_file))
            metadata["image"] = relative_image_path

            # Reconstruct the content
            updated_content = yaml_delimiter + "\n" + yaml.dump(metadata) + yaml_delimiter + "\n" + "\n".join(parts[2:])

            # Write the updated content back to the file
            with open(input_file, "w", encoding="utf-8") as file:
                file.write(updated_content)

            if debug:
                print(f"Updated metadata: {metadata}")

def call_image_generation(input_file, debug):

    # the output path for the image is alongside the input file
    output_file = os.path.splitext(input_file)[0] + ".png"

    script_dir = os.path.dirname(os.path.abspath(__file__))
    generate_images_path = os.path.join(script_dir, "generate_images.py")
    command = ["python3", generate_images_path, input_file, output_file]
    if debug:
        command.append("--debug")
    result = subprocess.run(command, check=True)

    if result.returncode == 0:  # Check if the image generation was successful
        update_yaml_metadata(input_file, output_file, debug)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transform files.")
    parser.add_argument("input_folder", help="Path to the input folder containing files.")
    parser.add_argument("output_folder", help="Path to the output folder to save transformed files.")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode.")
    args = parser.parse_args()

    # First, convert HTML files to markdown
    process_html_files(args.input_folder, args.input_folder)

    # Then, process the markdown files
    process_markdown_files(args.input_folder, args.output_folder, args.debug)

    print(f"Recipe and image saved successfully in {args.output_folder}.")

