import json
from operator import itemgetter
import sys

# Retrieve command line arguments
input_file = sys.argv[1]
output_file = sys.argv[2]
size = int(sys.argv[3])

def read_json_file(filename):
    with open(filename, "r") as f:
        data = json.load(f)
    return data

def write_json_file(filename, data):
    with open(filename, "w") as f:
        json.dump(data, f, indent=4)

def sort_recipes_by_date(data, size):
    # Concatenate all recipes into a single list
    all_recipes = []
    for category in data['categories']:
        if(category['category'] != 'Untested'):
            all_recipes.extend(category['recipes'])

    # Sort all recipes by date and limit to 'size'
    all_recipes.sort(key=itemgetter('updated'), reverse=True)
    all_recipes = all_recipes[:size]

    # Create a new category with sorted and limited recipes
    new_category = {'category': 'Recent Additions', 'recipes': all_recipes}
    data['categories'] = [new_category]

    return data

data = read_json_file(input_file)
data = sort_recipes_by_date(data, size)
write_json_file(output_file, data)
