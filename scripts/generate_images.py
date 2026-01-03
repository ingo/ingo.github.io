import os
import re
import argparse
from google import genai
from google.genai import types
from PIL import Image
from dotenv import load_dotenv
import io

# Load environment variables from .env file
load_dotenv()

def debug_log_structure(message, debug):
    if debug:
        print(f"DEBUG: {message}")

def generate_image(input_path, output_path, debug):
    # Read the content of the input file
    with open(input_path, "r", encoding="utf-8") as file:
        content = file.read()

    # Use a regex pattern to find the image prompt within the content
    pattern = r'^\s*image_prompt:\s*(.*?)$'
    match = re.search(pattern, content, re.MULTILINE | re.IGNORECASE)

    if match:
        image_prompt = match.group(1).strip()
        debug_log_structure(f"Using image prompt: {image_prompt}", debug)
    else:
        debug_log_structure(f"No image prompt found in {input_path}. Skipping image generation.", debug)
        return

    # Initialize the GenAI client with the API key
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    # Generate the image using the Gemini model
    debug_log_structure(f"Sending request to Gemini API for {input_path}.", debug)
    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=(image_prompt,),
        config=types.GenerateContentConfig(
            response_modalities=[types.Modality.TEXT, types.Modality.IMAGE],
        ),
    )

    # Save the generated image to the specified output path
    try:
        for part in response.candidates[0].content.parts:
            if part.text:
                debug_log_structure(f"Text response: {part.text}", debug)
            elif part.inline_data:
                image = Image.open(io.BytesIO(part.inline_data.data))
                image.save(output_path)
                debug_log_structure(f"Image saved: {output_path}", debug)
                return
    except AttributeError as e:
        debug_log_structure(f"Error processing response for {input_path}: {e}", debug)
    except Exception as e:
        debug_log_structure(f"Unexpected error for {input_path}: {e}", debug)

def generate_images_in_directory(input_dir, output_dir, debug):
    # Ensure the output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Iterate over all markdown files in the input directory
    for root, _, files in os.walk(input_dir):
        for file in files:
            if file.endswith(".md"):
                input_file_path = os.path.join(root, file)
                output_file_path = os.path.join(output_dir, os.path.splitext(file)[0] + ".png")
                generate_image(input_file_path, output_file_path, debug)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate images for markdown files with image prompts.")
    parser.add_argument("input_path", help="Path to the input file or directory.")
    parser.add_argument("output_path", help="Path to the output file or directory.")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode.")
    args = parser.parse_args()

    if os.path.isdir(args.input_path):
        generate_images_in_directory(args.input_path, args.output_path, args.debug)
    else:
        generate_image(args.input_path, args.output_path, args.debug)