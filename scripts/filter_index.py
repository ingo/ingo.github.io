import json
from operator import itemgetter
import os
import sys
import yaml

# Debug flag: Set to True to enable debug output, False to disable
DEBUG = False

def debug_print(message):
    """Print debug messages if DEBUG is enabled."""
    if DEBUG:
        print(message)

# Retrieve command line arguments
input_file = sys.argv[1]
output_file = sys.argv[2]
size = int(sys.argv[3])

def read_json_file(filename):
    debug_print(f"Reading JSON file: {filename}")
    with open(filename, "r") as f:
        data = json.load(f)
    debug_print(f"Loaded data: {data}")
    return data

def write_json_file(filename, data):
    debug_print(f"Writing JSON file: {filename}")
    with open(filename, "w") as f:
        json.dump(data, f, indent=4)
    debug_print(f"Data written to {filename}")

def load_featured_config():
    """Load featured recipes from featured.yaml"""
    try:
        debug_print("Loading featured.yaml configuration")
        with open("featured.yaml", "r") as f:
            config = yaml.safe_load(f) or {}
            featured = config.get("homepage", [])
            debug_print(f"Featured recipes loaded: {featured}")
            return featured
    except FileNotFoundError:
        debug_print("featured.yaml not found, returning empty list")
        return []

def sort_recipes_by_date(data, size):
    debug_print("Sorting recipes by date")
    # Load featured homepage recipes
    featured_basenames = load_featured_config()
    debug_print(f"Featured basenames: {featured_basenames}")
    
    # Concatenate all recipes into a single list
    all_recipes = []
    for category in data['categories']:
        if category['category'] != 'Untested':
            debug_print(f"Processing category: {category['category']}")
            # Include both featured and regular recipes
            all_recipes.extend(category.get('featured_recipes', []))
            all_recipes.extend(category.get('recipes', []))

    debug_print(f"Total recipes collected: {len(all_recipes)}")
    
    # Separate featured and non-featured recipes
    featured_recipes = []
    regular_recipes = []
    
    for recipe in all_recipes:
        # Create basename from htmlfile
        htmlfile = recipe.get('htmlfile', '')
        basename = os.path.splitext(os.path.basename(htmlfile))[0]  # Extract basename from htmlfile
        recipe['basename'] = basename  # Add basename to the recipe
        debug_print(f"Processing recipe: {basename}")

        if basename in featured_basenames:
            featured_recipes.append(recipe)
        else:
            regular_recipes.append(recipe)
    
    debug_print(f"Featured recipes: {len(featured_recipes)}")
    debug_print(f"Regular recipes: {len(regular_recipes)}")
    
    # Sort featured recipes by order in featured.yaml
    featured_recipes.sort(key=lambda x: featured_basenames.index(x.get('basename', '')) if x.get('basename', '') in featured_basenames else 999)
    debug_print(f"Sorted featured recipes: {featured_recipes}")
    
    # Sort regular recipes by date and limit total to 'size'
    regular_recipes.sort(key=itemgetter('updated'), reverse=True)
    #debug_print(f"Sorted regular recipes by date: {regular_recipes}")
    
    # Limit to size (featured first, then fill with recent)
    remaining_slots = size - len(featured_recipes)
    #debug_print(f"Remaining slots for regular recipes: {remaining_slots}")
    if remaining_slots > 0:
        regular_recipes = regular_recipes[:remaining_slots]
    else:
        regular_recipes = []
    
    # Combine featured and regular
    all_displayed_recipes = featured_recipes + regular_recipes
    #debug_print(f"All displayed recipes: {all_displayed_recipes}")

    # Create a new category with sorted and limited recipes
    new_category = {
        'category': 'Recent Additions',
        'featured_recipes': featured_recipes,
        'recipes': regular_recipes
    }
    data['categories'] = [new_category]

    return data

data = read_json_file(input_file)
data = sort_recipes_by_date(data, size)
write_json_file(output_file, data)