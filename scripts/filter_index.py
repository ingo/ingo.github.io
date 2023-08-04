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
    for category in data['categories']:
        category['recipes'].sort(key=itemgetter('updated'), reverse=True)
        category['recipes'] = category['recipes'][:size]
    return data

data = read_json_file(input_file)
data = sort_recipes_by_date(data, size)
write_json_file(output_file, data)
