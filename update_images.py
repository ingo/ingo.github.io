import sys
import re
import yaml
import markdown
from bs4 import BeautifulSoup
import html2text
import os
import argparse

# command line arguments
parser = argparse.ArgumentParser(description='Process markdown files.')
parser.add_argument('input_filename', help='Input filename')
parser.add_argument('--debug', action='store_true', help='Debug flag')
args = parser.parse_args()

# read markdown
with open(args.input_filename, "r") as file:
    md_content = file.readlines()

# extract yaml preamble
match = re.match(r'---\n(.*?)\n---', "".join(md_content), re.DOTALL)
if not match:
    print("No YAML front-matter found in the file")
    sys.exit(1)

pre = match.group(1)

# convert the preamble to dictionary
pre_dict = yaml.safe_load(pre)

# Get the path of current file
current_file_path = os.path.dirname(os.path.abspath(args.input_filename))

# get the name of the markdown file (without extension)
markdown_file_name = os.path.splitext(os.path.basename(args.input_filename))[0]

# If "image:" key does not exist in YAML, create one.
if "image" not in pre_dict:
    pre_dict["image"] = markdown_file_name + ".jpg"
elif not isinstance(pre_dict["image"], str):
    print(f"Image path is not a string: {pre_dict['image']}")
    sys.exit(1)

# check if the image file exists
image_path = os.path.join(current_file_path, pre_dict["image"])
if os.path.isfile(image_path):
    # rename it to be the same as the markdown file
    new_image_path = os.path.join(current_file_path, markdown_file_name + ".jpg")
    os.rename(image_path, new_image_path)
    pre_dict["image"] = markdown_file_name + ".jpg"
else:
    # if the image file doesn't exist, create a placeholder value
    pre_dict["image"] = markdown_file_name + ".jpg"

# update the yaml part in the markdown content
md_content = md_content[md_content.index("---\n") + len(pre.split("\n")) + 3:]
md_content.insert(0, "---\n" + yaml.safe_dump(pre_dict) + "---\n")

# write back to the original markdown file
with open(args.input_filename, "w") as file:
    file.writelines(md_content)

# if debug flag is set, print debug info
if args.debug:
    print(f"Processed file: {args.input_filename}")
