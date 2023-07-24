import random
import re
import time
import openai
import os
import argparse
import shutil
import unidecode

system_file_path = "system_text.md"

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

def transform_content(content, system_file_path):

    content = re.sub(r'\[!.*?\]\(.*?svg.*?\]\(.*?\)', '', content)

    model = "gpt-4"

    response = None
    for delay_secs in (2**x for x in range(0, 6)):
        try:
            system_text = read_system_text(system_file_path)            
            response = openai.ChatCompletion.create(
                model=model,
                temperature = .3,
                messages=[
                    {"role": "system", "content": system_text},
                    {"role": "user", "content": f"Convert the following content into the new format {content}"},
                ]
            )
            break
        
        except openai.OpenAIError as e:
            randomness_collision_avoidance = random.randint(0, 1000) / 1000.0
            sleep_dur = delay_secs + randomness_collision_avoidance
            print(f"Error: {e}. Retrying in {round(sleep_dur, 2)} seconds.")
            time.sleep(sleep_dur)
            continue

    return response.choices[0]["message"]["content"]    

def save_transformed_file(output_folder, title, transformed_content, debug):
    # Replace non-alphanumeric characters (except underscores) with underscores in the title
    title = re.sub(r"[^a-zA-Z0-9_]+", "_", title)

    # Ensure the file name is not too long (100 characters limit)
    title = title[:100]

    # Append the ".md" extension to the title
    output_file_path = os.path.join(output_folder, f"{title}.md")

    with open(output_file_path, "w", encoding="utf-8") as output_file:
        output_file.write(transformed_content)

    if debug:
        print(f"Saving {title}.md successfully.\n")

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

            transformed_content = transform_content(content, system_file_path)
            title = generate_title(transformed_content, debug)

            if not(title):
                title = filename[:-3]
            save_transformed_file(output_folder, title, transformed_content, debug)

            if debug:
                print(f"Processed {filename} successfully.\n")
        except Exception as e:
            if debug:
                print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transform Markdown files.")
    parser.add_argument("input_folder", help="Path to the input folder containing Markdown files.")
    parser.add_argument("output_folder", help="Path to the output folder to save transformed Markdown files.")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode.")
    args = parser.parse_args()

    process_markdown_files(args.input_folder, args.output_folder, args.debug)
