#!/usr/bin/env python3

import sys
import os
import subprocess
import json
from pathlib import Path
from datetime import datetime
import argparse
import pypandoc

# Parse arguments
parser = argparse.ArgumentParser(
    description="Builds a single recipe page. Useful for quick iterations."
)
parser.add_argument("recipe", help="Recipe filename (without .md extension)")
parser.add_argument("-q", "--quiet", action="store_true", help="Quiet mode")
args = parser.parse_args()

QUIET = args.quiet
recipe_basename = args.recipe


def status(*message):
    """Print status messages (unless in quiet mode)"""
    if QUIET:
        return
    bold = "\033[1m"
    normal = "\033[0m"
    print(f"{bold}{' '.join(str(m) for m in message)}{normal}")


def x(*cmd):
    """Execute command and log it (unless in quiet mode)"""
    if not QUIET:
        print(f"↪ {' '.join(str(c) for c in cmd)}", file=sys.stderr)
    subprocess.run(cmd, check=True)


def pandoc_convert(input_file, output_file, extra_args=None, to_format="html", template=None):
    """
    Convert files using pypandoc library (faster than subprocess)
    """
    if not QUIET:
        args_str = ' '.join(extra_args) if extra_args else ''
        print(f"↪ pypandoc {input_file} {args_str} -o {output_file}", file=sys.stderr)
    
    pypandoc.convert_file(
        input_file,
        to_format,
        outputfile=output_file,
        extra_args=extra_args
    )


# Ensure temp directory exists
os.makedirs("_temp", exist_ok=True)

# Build the recipe file path
recipe_file = Path(f"_recipes/{recipe_basename}.md")
if not recipe_file.exists():
    print(f"Error: Recipe file {recipe_file} not found!")
    sys.exit(1)

file_str = str(recipe_file)
status(f"Building recipe: {recipe_basename}")

# Run add_metadata.py
status("Extracting metadata...")
subprocess.run([sys.executable, "scripts/add_metadata.py", file_str, "_temp/"], check=True)

# Extract category
status("Extracting category...")
pandoc_convert(
    file_str,
    f"_temp/{recipe_basename}.category.txt",
    extra_args=[
        "--metadata-file", "config.yaml",
        "--metadata-file", f"_temp/{recipe_basename}.yml",
        "--metadata", f"basename={recipe_basename}",
        "--template", "_templates/technical/category.template.txt"
    ],
    to_format="html"
)

# Extract metadata JSON
status("Extracting metadata JSON...")
pandoc_convert(
    file_str,
    f"_temp/{recipe_basename}.metadata.json",
    extra_args=[
        "--metadata-file", f"_temp/{recipe_basename}.yml",
        "--metadata", f"htmlfile={recipe_basename}.html",
        "--template", "_templates/technical/metadata.template.json"
    ],
    to_format="html"
)

# Get category
category_file = Path(f"_temp/{recipe_basename}.category.txt")
with open(category_file, "r") as f:
    category = f.read().strip().split(" ", 1)[1]
category_faux_urlencoded = category.lower().replace(" ", "_").replace("/", "_")

# Get update date
if os.environ.get("GITHUB_ACTIONS") == "true":
    result = subprocess.run(
        ["git", "log", "-1", "--date=short-local", "--pretty=format:%cd", file_str],
        capture_output=True,
        text=True,
    )
    updated_at = result.stdout.strip()
else:
    updated_at = datetime.fromtimestamp(recipe_file.stat().st_mtime).strftime("%Y-%m-%d")

# Build recipe page
status("Building recipe page...")
pandoc_convert(
    file_str,
    f"_site/{recipe_basename}.html",
    extra_args=[
        "--metadata-file", "config.yaml",
        "--metadata-file", f"_temp/{recipe_basename}.yml",
        "--metadata", f"basename={recipe_basename}",
        "--metadata", f"category_faux_urlencoded={category_faux_urlencoded}",
        "--metadata", f"updatedtime={updated_at}",
        "--template", "_templates/recipe.template.html"
    ]
)

status(f"✓ Recipe built: _site/{recipe_basename}.html")
