import os
import re
import yaml
import argparse
from pathlib import Path
from itertools import dropwhile

def extract_first_sentence(text):
    match = re.match(r'(.*?[.!?])\s(.*)', text.replace('\n', ' '), re.DOTALL)
    if match:
        return match.group(1), match.group(2)
    else:
        return text, ''  # In case there's no full stop, return the whole text

def process_file(file_path, debug=False):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    separator_indices = [i for i, line in enumerate(lines) if line.strip() == '---']
    if len(separator_indices) != 2:
        raise ValueError(f'File {file_path} is not in the expected format')
    yaml_header = lines[separator_indices[0]+1:separator_indices[1]]
    content = list(dropwhile(lambda x: not x.strip(), lines[separator_indices[1]+1:]))

    yaml_dict = yaml.safe_load(''.join(yaml_header))
    
    if 'description' in yaml_dict:  # Check if 'description' key exists
        first_sentence, remaining_text = extract_first_sentence(yaml_dict['description'])
        yaml_dict['description'] = first_sentence

        # iterate over content
        for i, line in enumerate(content):
            print(f'{i}: {line}\n')

        # Check if the first non-blank line of the content starts with '###'
        if content and content[0].startswith('###'):
            print(f'Found a heading: {content[0]}')
            content = [remaining_text, '\n', '\n'] + content
        else:
            if(remaining_text.endswith('.')):
                remaining_text = remaining_text + " "            
            content = [remaining_text] + content

    new_yaml_header = yaml.dump(yaml_dict, default_flow_style=False)
    new_content = ['---\n', new_yaml_header, '---\n\n'] + content

    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_content)

    if debug:
        print(f'Processed file {file_path}')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('directory', type=str, help='Directory containing the markdown files')
    parser.add_argument('--debug', action='store_true', help='Write out progress to command line')
    args = parser.parse_args()

    markdown_files = Path(args.directory).rglob('*.md')
    for file_path in markdown_files:
        process_file(file_path, args.debug)

if __name__ == '__main__':
    main()
