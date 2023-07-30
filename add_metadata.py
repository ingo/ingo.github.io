import sys
import re
import yaml
import markdown
from bs4 import BeautifulSoup, NavigableString
import html2text
import os
from PIL import Image
import datetime

# validate command line arguments
if len(sys.argv) != 3:
    print("Usage: python script.py <input_filename> <output_filename>")
    sys.exit(1)

input_filename = sys.argv[1]
output_filename = sys.argv[2]

# read markdown
with open(input_filename, "r") as file:
    md_content = file.read()

# convert markdown to html
html = markdown.markdown(md_content)

# use BeautifulSoup to parse html
soup = BeautifulSoup(html, "html.parser")

# extract yaml preamble
pre = re.match(r'---\n(.*?)\n---', md_content, re.DOTALL).group(1)

# convert the preamble to dictionary
pre_dict = yaml.load(pre, Loader=yaml.FullLoader)

# Get the path of current file
current_file_path = os.path.dirname(os.path.abspath(input_filename))

# Get the last modification time
modification_time = os.path.getmtime(input_filename)

# Convert the modification time to a datetime object and adjust to UTC
modification_time = datetime.datetime.utcfromtimestamp(modification_time)

# Format the date
formatted_date = modification_time.strftime('%Y-%m-%d')

# Create a dictionary and add the formatted date to it
pre_dict["updated"] = formatted_date

# Check if image key exists and then if image file exists in the same directory as the current file
image_filename = pre_dict.get("image")

# Check if image file exists in the same directory as the current file
if(pre_dict.get("category")):
    placeholder_name = "placeholder_" + pre_dict.get("category").lower() + ".jpg"
else:
    placeholder_name = "placeholder.jpg"

if image_filename:
    image_path = os.path.join(current_file_path, image_filename)
    if not os.path.isfile(image_path):
        pre_dict["image_validated"] = placeholder_name
    else:
        pre_dict["image_validated"] = image_filename
else:
    pre_dict["image_validated"] = placeholder_name

image_name = pre_dict["image_validated"]
image_path = os.path.join(current_file_path, image_name)
print(f"Image path: {image_path}")
with Image.open(image_path) as img:
    width, height = img.size
    print(f"Image size: {width}x{height}")
    if width > height:
        pre_dict["landscape"] = "true"

# Check if difficulty key exists
difficulty = pre_dict.get("difficulty")
if not difficulty:
    pre_dict["difficulty"] = "medium"

# Check if size key exists
time = pre_dict.get("size")
if not difficulty:
    pre_dict["size"] = "TBD"

# Check if time key exists
time = pre_dict.get("time")
if not difficulty:
    pre_dict["time"] = "TBD"

# compile the full dictionary
recipe_dict = pre_dict

try:
    h = html2text.HTML2Text()
    backstory_html = soup.find_all('p')[1].prettify()
    backstory = h.handle(backstory_html) if len(backstory_html) > 1 else None
    # add preamble text
    recipe_dict['backstory'] = backstory    
except:
    print("No backstory found")    

# find sections based on headers
for header in soup.find_all('h3'):
    section_name = header.text.lower()  # use header text as section name
    next_node = header.find_next_sibling()
    section_items = []

    while next_node and next_node.name != 'h3':
        if isinstance(next_node, NavigableString):
            next_node = next_node.find_next_sibling()
            continue

        sublist_dict = {"title": "", "list": []}

        if next_node.name == 'ul' or next_node.name == 'ol':
            sublist_dict["list"] = [li.text for li in next_node.find_all('li')]
        elif next_node.name == 'p' or next_node.name == 'h4':
            sublist_dict["title"] = next_node.text

        section_items.append(sublist_dict)

        next_node = next_node.find_next_sibling() if next_node else None

    # add section to the dictionary only if it has items
    if section_items:
        recipe_dict[section_name] = section_items

# write yaml file
with open(output_filename, 'w') as file:
    yaml.dump(recipe_dict, file)
