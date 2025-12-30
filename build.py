#!/usr/bin/env python3

import sys
import os
import shutil
import subprocess
import json
import time
import yaml
from pathlib import Path
from datetime import datetime
import random
import argparse

# Parse arguments
parser = argparse.ArgumentParser(
    description="Builds the site. If the -c flag is given, stops after resetting _site/ and _temp/."
)
parser.add_argument("-q", "--quiet", action="store_true", help="Quiet mode")
parser.add_argument("-c", "--clean", action="store_true", help="Clean and exit")
args = parser.parse_args()

QUIET = args.quiet
CLEAN = args.clean

TIME_START = time.time()


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


def remove_and_recreate_dir(path):
    """Remove directory if it exists and recreate it"""
    if os.path.exists(path):
        shutil.rmtree(path)
    os.makedirs(path, exist_ok=True)


# Reset directories
status("Resetting _site/ and _temp_/...")
remove_and_recreate_dir("_site")
remove_and_recreate_dir("_temp")

if CLEAN:
    sys.exit(0)

# Copy assets
status("Copying assets...")
x("cp", "-r", "_assets/", "_site/assets/")
x("cp", "_assets/about.html", "_site/about.html")

# Copy static files
status("Copying static files...")
for file in Path("_recipes").glob("*"):
    if file.suffix == ".md":
        continue
    x("cp", str(file), "_site/")

# Install dependencies
if Path("requirements.txt").exists():
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)

# Extract metadata
status("Extracting metadata...")
for file in Path("_recipes").glob("*.md"):
    file_str = str(file)
    basename = file.stem

    # Run add_metadata.py
    subprocess.run([sys.executable, "scripts/add_metadata.py", file_str, "_temp/"], check=True)

    # Extract category
    x(
        "pandoc",
        file_str,
        "--metadata-file", "config.yaml",
        "--metadata-file", f"_temp/{basename}.yml",
        "--metadata", f"basename={basename}",
        "--template", "_templates/technical/category.template.txt",
        "-t", "html",
        "-o", f"_temp/{basename}.category.txt",
    )

    # Extract metadata
    x(
        "pandoc",
        file_str,
        "--metadata-file", f"_temp/{basename}.yml",
        "--metadata", f"htmlfile={basename}.html",
        "--template", "_templates/technical/metadata.template.json",
        "-t", "html",
        "-o", f"_temp/{basename}.metadata.json",
    )

# Copy webp files
status("Copying webp files...")
for file in Path("_temp").glob("*.webp"):
    x("cp", str(file), "_site/")

# Group metadata by category
status("Grouping metadata by category...")
index_json_path = Path("_temp/index.json")

# Load featured recipes configuration
featured_config = {}
featured_yaml_path = Path("featured.yaml")
if featured_yaml_path.exists():
    with open(featured_yaml_path, "r") as f:
        featured_config = yaml.safe_load(f) or {}

# Read all category files
categories_data = {}
category_files = sorted(Path("_temp").glob("*.category.txt"))

for cat_file in category_files:
    with open(cat_file, "r") as f:
        content = f.read().strip()
        if content:
            parts = content.split(" ", 1)
            if len(parts) == 2:
                basename = parts[0]
                category = parts[1]
                if category not in categories_data:
                    categories_data[category] = []
                categories_data[category].append(basename)

# Build index.json
index_data = {"categories": []}

for category in sorted(categories_data.keys()):
    # Faux urlencode the category
    category_faux_urlencoded = category.lower().replace(" ", "_").replace("/", "_")
    
    # Get featured recipes for this category
    featured_basenames = featured_config.get("categories", {}).get(category_faux_urlencoded, [])
    
    category_obj = {
        "category": category,
        "category_faux_urlencoded": category_faux_urlencoded,
        "featured_recipes": [],
        "recipes": [],
    }

    # Collect all recipe metadata
    all_recipes = []
    for basename in categories_data[category]:
        metadata_file = Path(f"_temp/{basename}.metadata.json")
        if metadata_file.exists():
            with open(metadata_file, "r") as f:
                metadata = json.load(f)
                all_recipes.append((basename, metadata))
    
    # Separate featured and regular recipes
    featured_recipes = []
    regular_recipes = []
    
    for basename, metadata in all_recipes:
        if basename in featured_basenames:
            featured_recipes.append((basename, metadata))
        else:
            regular_recipes.append((basename, metadata))
    
    # Sort featured recipes by order in featured.yaml
    featured_recipes.sort(key=lambda x: featured_basenames.index(x[0]) if x[0] in featured_basenames else 999)
    
    # Add to category object
    category_obj["featured_recipes"] = [metadata for _, metadata in featured_recipes]
    category_obj["recipes"] = [metadata for _, metadata in regular_recipes]

    index_data["categories"].append(category_obj)
    
    # Write category JSON file for category page building
    category_json_path = Path(f"_temp/{category_faux_urlencoded}.category.json")
    with open(category_json_path, "w") as f:
        json.dump(category_obj, f)

with open(index_json_path, "w") as f:
    json.dump(index_data, f)

# Build recipe pages
status("Building recipe pages...")
for file in Path("_recipes").glob("*.md"):
    file_str = str(file)
    basename = file.stem

    # Get category
    category_file = Path(f"_temp/{basename}.category.txt")
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
        updated_at = datetime.fromtimestamp(file.stat().st_mtime).strftime("%Y-%m-%d")

    x(
        "pandoc",
        file_str,
        "--metadata-file", "config.yaml",
        "--metadata-file", f"_temp/{basename}.yml",
        "--metadata", f"basename={basename}",
        "--metadata", f"category_faux_urlencoded={category_faux_urlencoded}",
        "--metadata", f"updatedtime={updated_at}",
        "--template", "_templates/recipe.template.html",
        "-o", f"_site/{basename}.html",
    )

# Build category pages
status("Building category pages...")
for file in Path("_temp").glob("*.category.json"):
    basename = file.stem.replace(".category", "")
    x(
        "pandoc",
        "_templates/technical/empty.md",
        "--metadata-file", "config.yaml",
        "--metadata", "title=dummy",
        "--metadata", f"updatedtime={datetime.now().strftime('%Y-%m-%d')}",
        "--metadata-file", str(file),
        "--template", "_templates/category.template.html",
        "-o", f"_site/{basename}.html",
    )

# Filter index for homepage (latest 21 recipes)
status("Building index page...")
subprocess.run([sys.executable, "scripts/filter_index.py", "_temp/index.json", "_temp/index_filtered.json", "12"], check=True)

x(
    "pandoc",
    "_templates/technical/empty.md",
    "--metadata-file", "config.yaml",
    "--metadata", "title=dummy",
    "--metadata", f"updatedtime={datetime.now().strftime('%Y-%m-%d')}",
    "--metadata-file", "_temp/index_filtered.json",
    "--template", "_templates/index.template.html",
    "-o", "_site/index.html",
)

# Build index (all) page
status("Building index (all) page...")
x(
    "pandoc",
    "_templates/technical/empty.md",
    "--metadata-file", "config.yaml",
    "--metadata", "title=dummy",
    "--metadata", f"updatedtime={datetime.now().strftime('%Y-%m-%d')}",
    "--metadata-file", "_temp/index.json",
    "--template", "_templates/index.template.all.html",
    "-o", "_site/index_all.html",
)

# Assemble search index
status("Assembling search index...")
search_data = []
for file in sorted(Path("_temp").glob("*.metadata.json")):
    with open(file, "r") as f:
        search_data.append(json.load(f))

with open("_temp/search.json", "w") as f:
    json.dump(search_data, f)

x("cp", "-r", "_temp/search.json", "_site/")

# Print completion message
TIME_END = time.time()
TIME_TOTAL = int(TIME_END - TIME_START)

EMOJIS = "🍇🍈🍉🍊🍋🍌🍍🥭🍎🍏🍐🍑🍒🍓🥝🍅🥥🥑🍆🥔🥕🌽🌶️🥒🥬🥦"
random_emoji = random.choice(EMOJIS)
status(f"All done after {TIME_TOTAL} seconds! {random_emoji}")
