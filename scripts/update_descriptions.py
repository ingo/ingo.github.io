import os
import yaml
import argparse
from pathlib import Path

def load_descriptions(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    descriptions = {}
    for i in range(0, len(lines), 3):
        file = lines[i].strip().split(': ')[1]
        description = lines[i+1].strip().split(': ')[1]
        descriptions[file] = description
    
    return descriptions

def yaml_load_byte_string(loader, node):
    return loader.construct_scalar(node)

yaml.add_constructor(u'tag:yaml.org,2002:str', yaml_load_byte_string, Loader=yaml.SafeLoader)

def represent_str(dumper, data):
    if data.encode('UTF-8').isascii():
        return dumper.represent_str(data)
    else:
        return dumper.represent_unicode(data)

yaml.add_representer(str, represent_str, Dumper=yaml.SafeDumper)

def replace_description(file_path, descriptions, debug=False):
    with open(file_path, 'r+', encoding='utf-8') as f:
        lines = f.readlines()
        end_yaml = lines.index('---\n', 1)
        yaml_text = ''.join(lines[1:end_yaml])
        yaml_data = yaml.safe_load(yaml_text)
        if file_path.name in descriptions:
            yaml_data['description'] = descriptions[file_path.name]

        new_yaml_text = yaml.dump(yaml_data, default_flow_style=False)

        f.seek(0)
        f.write('---\n')
        f.write(new_yaml_text)
        f.write('---\n')
        f.write(''.join(lines[end_yaml+1:]))
        f.truncate()

    if debug:
        print(f"Updated file: {file_path}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("folder", help="Folder containing the markdown files")
    parser.add_argument("desc_file", help="File containing the new descriptions")
    parser.add_argument("--debug", action="store_true", help="Print debug information")
    args = parser.parse_args()

    folder_path = Path(args.folder)
    if not folder_path.is_dir():
        print("Error: folder does not exist or is not a directory")
        return

    descriptions = load_descriptions(args.desc_file)

    markdown_files = folder_path.glob('*.md')
    for file in markdown_files:
        replace_description(file, descriptions, debug=args.debug)

if __name__ == '__main__':
    main()
