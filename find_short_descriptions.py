import os
import re
import sys
import shutil
import yaml

def find_description_and_copy(directory):
    to_process_dir = os.path.join(directory, '_to_process')
    if not os.path.exists(to_process_dir):
        os.makedirs(to_process_dir)

    for filename in os.listdir(directory):
        if filename.endswith('.md'):
            file_path = os.path.join(directory, filename)
            with open(file_path, 'r') as file:
                content = file.read()

                # Extract YAML front matter using regex
                yaml_match = re.match(r'---\n(.*?)\n---', content, re.DOTALL)
                if not yaml_match:
                    continue
                
                yaml_data = yaml.safe_load(yaml_match.group(1))
                description = yaml_data.get('description')

                if description and len(description) >= 270:
                    print(f"File: {filename}")
                    print(f"Description: {description}\n")
                    new_file_path = os.path.join(to_process_dir, filename)
                    shutil.copy2(file_path, new_file_path)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script_name.py <directory_path>")
    else:
        directory_path = sys.argv[1]
        find_description_and_copy(directory_path)
