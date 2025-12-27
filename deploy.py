#!/usr/bin/env python3

import sys
import subprocess
import argparse
import random
from pathlib import Path

# Parse arguments
parser = argparse.ArgumentParser(
    description="Deploys the contents of _site/ to the remote location specified in config.yaml using rsync."
)
parser.add_argument("-q", "--quiet", action="store_true", help="Quiet mode")
parser.add_argument("-n", "--dry-run", action="store_true", help="Dry run (don't actually deploy)")
args = parser.parse_args()

QUIET = args.quiet
DRYRUN = args.dry_run


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


# Read remote configuration
status("Reading remote configuration...")
x(
    "pandoc",
    "_templates/technical/empty.md",
    "--metadata", "title=dummy",
    "--metadata-file", "config.yaml",
    "--template", "_templates/technical/deploy_remote.template.txt",
    "-t", "html",
    "-o", "_temp/deploy_remote.txt",
)

with open("_temp/deploy_remote.txt", "r") as f:
    remote = f.read().strip()

if not remote:
    status("Can't deploy – it seems like you haven't specified a remote.")
    sys.exit(1)

# Deploy
status("Deploying...")
flags = ["rsync", "-a", "--delete"]
if QUIET:
    flags.append("--quiet")
else:
    flags.append("--verbose")
if DRYRUN:
    flags.append("--dry-run")
flags.extend(["_site/", remote])

x(*flags)

# Print success message
EMOJIS = "🍇🍈🍉🍊🍋🍌🍍🥭🍎🍏🍐🍑🍒🍓🥝🍅🥥🥑🍆🥔🥕🌽🌶️🥒🥬🥦"
random_emoji = random.choice(EMOJIS)
status(f"Success! {random_emoji}")
