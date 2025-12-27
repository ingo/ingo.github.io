# nyum

*A simple, beautiful recipe website generator.*

<img src="_assets/favicon.png" align="right" width="96">

**nyum** takes your favorite recipes (written in simple Markdown) and turns them into a **fast, searchable, responsive website**. It's perfect for keeping your personal recipe collection organized, or for sharing recipes with family and friends.

It's *not* a cooking blog framework – there's no ads, no clutter, and no fuss. Just your recipes, beautifully presented.

Think of it as a **cookbook for nerds**.

## Quick start

1. **[Get started](#getting-started)** – Install the tools you need
2. **[Add a recipe](#adding-a-recipe)** – Create your first recipe file
3. **[Build your site](#building-your-website)** – Generate the website
4. **[Deploy](#deployment)** – Share it with the world

## Screenshots

See it in action! [Check out the live demo on GitHub Pages](https://muschenetz.com/) to explore a full working site.

## Getting started

### What you need

* **[Python](https://www.python.org)** – version 3.7 or later
* **[Pandoc](https://pandoc.org)** – version 2.8 or later (converts Markdown to HTML)

That's it! No other dependencies.

**Install on macOS:**
```bash
brew install python3 pandoc
```

**Install on Linux:**
Most package managers have both. Try `apt install python3 pandoc` or equivalent.

### Setup

1. Get the code:
   ```bash
   git clone https://github.com/ingo/ingo.github.io.git
   cd ingo.github.io
   ```

2. Remove demo recipes (optional):
   ```bash
   rm _recipes/*.md
   rm _site/*.html
   ```

3. Edit `config.yaml` to customize your site:
   - Site title, description, and language
   - Enable/disable images on the index page
   - Deployment settings (if deploying to a server)

You're ready to go!

## Adding a recipe

### Create a new recipe file

Create a new `.md` file in the `_recipes/` folder. For example: `my_awesome_pasta.md`. Each recipe has two parts: **metadata** (at the top) and **instructions** (below).

### Metadata (the recipe card)

Start your file with a YAML block that describes your recipe. Only the `title` is required; everything else is optional:

```yaml
---
title: My Awesome Pasta
category: Pasta
description: A simple, delicious pasta that takes 20 minutes.
size: 2 servings
time: 20 minutes
author: Your Name
image: my_awesome_pasta.jpg
favorite: ✓
spicy: ✓
---
```

**Available fields:**

| Field | Purpose | Example |
|-------|---------|---------|
| `title` | Recipe name (required) | `Cheese Pasta` |
| `category` | Group recipes by type | `Pasta`, `Desserts` |
| `description` | Short summary (shown on index) | `A quick weeknight meal` |
| `image` | Photo filename | `pasta.jpg` |
| `size` | Servings or yield | `2 servings`, `12 cupcakes` |
| `time` | Cooking time | `30 minutes` |
| `author` | Creator's name | `Grandma` |
| `source` | Link to original recipe | `https://example.com` |
| `favorite` | Mark as favorite | `✓` |
| `veggie` / `vegan` | Dietary info | `✓` |
| `spicy` / `sweet` / `salty` | Flavor notes | `✓` |
| `original_title` | Name in original language | `日本のパスタ` |
| `nutrition` | Nutrition info | See example below |

**Nutrition example:**
```yaml
nutrition:
  - 300 calories
  - 10g protein
  - 45g carbs
```

### Instructions (the recipe)

After the `---`, write your recipe using Markdown. The key idea is to **list ingredients next to the steps that use them**. Use horizontal rules (`---`) to separate steps:

```markdown
---
title: Simple Pasta
---

* `400g` pasta
* `2 cloves` garlic, minced
* `3 tbsp` olive oil
* Salt and pepper to taste

> Bring a large pot of salted water to boil.

---

* `200g` spinach
* `100g` cream

> While water heats, sauté garlic in olive oil until fragrant.
> Add spinach and cook until wilted.
> Pour in cream and simmer for 2 minutes.

---

> Add pasta to boiling water and cook until al dente.
> Drain and toss with the spinach sauce.
> Season with salt and pepper. Serve immediately!
```

**Formatting tips:**

- **Ingredients**: Use backticks around amounts for proper columns: `` `2 tbsp` ``
- **Instructions**: Precede with `>` (blockquote)
- **Full Markdown**: Use bold, italic, links, lists, emojis – whatever you want!
- **Photos**: Include `![](photo.jpg)` in steps to show cooking progress
- **See an example**: Check out [kkaennipjeon.md](https://github.com/doersino/nyum/blob/main/_recipes/kkaennipjeon.md) in the repo

## Photos (recipe images)

### Adding a photo to your recipe

1. **Take a photo** of your finished dish and save it as a JPG or PNG
2. **Place it in `_recipes/`** alongside your recipe file
3. **Add the filename** to your recipe's metadata:
   ```yaml
   image: my_awesome_pasta.jpg
   ```

That's it! The photo will appear at the top of your recipe page.

### Photo tips for best results

- **Size**: Aim for 800×600 pixels or larger
- **Format**: JPG works great (smaller file size)
- **Aspect ratio**: Landscape photos (wider than tall) work best
- **Lighting**: Good natural light makes a big difference
- **Styling**: A few nice food styling touches go a long way

### Photo attribution

If you used someone else's photo, give them credit:

```yaml
image: photo.jpg
image_attribution: Photo by Jane Smith
image_source: https://example.com/photo
```

The attribution appears in the bottom corner of the photo, and clicking it links to the source.

## Building your website

### One-command build
Once you've added recipes to `_recipes/`, build your site:

```bash
python3 build.py
```

That's it! Your website is now in the `_site/` folder, ready to view or deploy.

**What happens during the build:**

- Converts all your Markdown recipes to HTML
- Creates an index page with all recipes grouped by category
- Generates a search index for searching recipes
- Optimizes images and assets
- Produces a complete, static website in `_site/`

### Build options

```bash
# See all options
python3 build.py --help

# Build quietly (less output)
python3 build.py --quiet

# Clean up build files only (don't generate site)
python3 build.py --clean
```

### How it works

The build process:

1. **Extracts metadata** from each recipe's YAML front matter
2. **Groups recipes by category** and builds an index
3. **Converts Markdown to HTML** using Pandoc
4. **Creates category pages** so you can browse by type
5. **Builds a searchable index** for the website

For the technically curious: see [how the build process works](#how-the-build-process-works) below.

### View your site locally

After building, open `_site/index.html` in your browser to see your website. Or run a local server:

```bash
# Python 3
python3 -m http.server 8000 --directory _site

# Then visit: http://localhost:8000
```

### Deployment

After building, your entire website is in the `_site/` folder. You can:

- **Upload to any web host** – Copy `_site/` contents to your server
- **Use rsync** – Automated deployment with `deploy.py`
- **Deploy to GitHub Pages** – Automatically build and deploy on every push

#### Option 1: Manual upload

Upload the contents of `_site/` to your web host using FTP, SFTP, or whatever method your host supports.

#### Option 2: Rsync deployment

For servers you have SSH access to:

1. **Set your deployment target** in `config.yaml`:
   ```yaml
   deploy_target: "username@example.com:/var/www/recipes"
   ```

2. **Deploy with one command:**
   ```bash
   python3 deploy.py
   ```

**Deployment options:**

```bash
# Preview what will be uploaded (dry-run)
python3 deploy.py --dry-run

# Deploy quietly
python3 deploy.py --quiet

# See all options
python3 deploy.py --help
```

⚠️ **Important:** `rsync` deletes old files on the server, so double-check your target path before deploying the first time!

#### Option 3: GitHub Pages (automated)

The repo includes a GitHub Actions workflow that automatically:
- Builds your site on every push to `main`
- Deploys to the `gh-pages` branch
- Makes your site available at `username.github.io/nyum`

This works automatically if you fork the repo. You may need to enable GitHub Pages in your repository settings.


## How the build process works

The build script does something interesting: it groups recipes by category and builds both a combined index and individual category pages.

Here's how:

1. **Extract metadata** – Each recipe's YAML front matter is converted to JSON
2. **Group by category** – Python reads the categories and organizes recipes
3. **Build indexes** – Creates a JSON structure for the index page
4. **Convert to HTML** – Pandoc transforms Markdown to beautiful HTML
5. **Generate pages** – Creates recipe pages, category pages, and a searchable index

The search functionality works by collecting metadata from all recipes into a single JSON file that the website searches locally in your browser.

## Tips and gotchas

- **Filenames**: Avoid special characters in recipe filenames
- **No `index.md`**: Don't create a recipe named `index.md` – it will be overwritten
- **Images**: Must be in the same `_recipes/` folder as the recipe file
- **Empty categories**: The script assumes at least one recipe exists
- **YAML special characters**: If using quotes in titles, escape them properly

## License

You may use this repository's contents under the terms of the *MIT License*, see `LICENSE`.

However, the subdirectories `_assets/fonts/` and `_assets/tabler-icons` contain **third-party software with its own licenses**:

* The sans-serif typeface [**Barlow**](https://github.com/jpt/barlow) is licensed under the *SIL Open Font License Version 1.1*, see `_assets/fonts/barlow/OFL.txt`.
* [**Lora**](https://github.com/cyrealtype/Lora-Cyrillic), the serif typeface used in places where Barlow isn't, is also licensed under the *SIL Open Font License Version 1.1*, see `_assets/fonts/lora/OFL.txt`.
* The icons (despite having been modified slightly) are part of [**Tabler Icons**](https://tabler-icons.io), they're licensed under the *MIT License*, see `_assets/tabler-icons/LICENSE.txt`. The placeholder image shown on the index page for recipes that don't have their own image if the `show_images_on_index` option is enabled also makes use of these icons.
