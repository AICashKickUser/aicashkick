import os
import json
from openai import OpenAI
from bs4 import BeautifulSoup
from datetime import datetime

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY not found. Set it in GitHub Secrets.")

def discover_new_tools(num_tools=2):
    """Use OpenAI to suggest new AI tools for 2025 side hustles."""
    current_date = datetime.now().strftime('%B %d, %Y')  # e.g., October 20, 2025
    prompt = f"""
    Current date: {current_date}. Suggest {num_tools} new or emerging AI tools released in 2025 for side hustles (e.g., content creation, design, automation). Exclude ChatGPT, Claude, Perplexity, Midjourney, Canva. Provide in JSON:
    [
        {{ "name": "Tool Name", "url": "https://tool.com" }}
    ]
    """
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an AI tool scout specializing in side hustle apps."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.8,
        max_tokens=200
    )
    try:
        tools = json.loads(response.choices[0].message.content.strip())
        if not isinstance(tools, list):
            print("Error: Expected JSON list of tools.")
            return []
        return tools
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        # Fallback to static list if API fails
        return [
            {"name": "Fireflies.ai", "url": "https://fireflies.ai"},
            {"name": "Runway ML", "url": "https://runwayml.com"}
        ]

def generate_review(tool):
    """Generate a review matching index.html's .review-card styling."""
    name, url = tool['name'], tool.get('url', '#')
    prompt = f"""
    Write a concise, SEO-optimized review (150-200 words) for {name} as a side hustle tool (date: October 20, 2025).
    Include:
    - Earnings potential: $X–$Y/mo
    - Pros: 2-3 bullets
    - Cons: 1-2 bullets
    - Example: One practical side hustle idea
    - Disruption: How it changes the game
    Format as HTML for a .review-card div, matching this structure:
    <div class="review-card">
        <h3>Review: {name} (Updated Oct 2025)</h3>
        <p>Earnings potential: $X–$Y/mo</p>
        <div class="pros-cons">
            <ul><li>Pro 1</li><li>Pro 2</li></ul>
            <ul><li>Con 1</li></ul>
        </div>
        <div class="example"><code>Example: Idea</code></div>
        <p>Disruption: Impact</p>
        <a href="{url}" target="_blank" class="affiliate-link">Try {name} Now</a>
    </div>
    """
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an expert reviewer for AI side hustle tools."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=300
    )
    return response.choices[0].message.content.strip()

def update_files():
    """Update index.html with new reviews, archive old ones."""
    # Discover new tools
    tools = discover_new_tools()
    if not tools:
        print("No new tools discovered—exiting.")
        return

    # Load index.html
    try:
        with open("index.html", "r", encoding="utf-8") as f:
            index_html = f.read()
        index_soup = BeautifulSoup(index_html, "html.parser")
        index_grid = index_soup.find("div", {"id": "reviews-grid"})
        if not index_grid:
            raise ValueError("Error: #reviews-grid not found in index.html")
    except FileNotFoundError:
        print("Error: index.html not found")
        return

    # Archive current reviews
    try:
        with open("archive.html", "r", encoding="utf-8") as f:
            archive_html = f.read()
        archive_soup = BeautifulSoup(archive_html, "html.parser")
        archive_grid = archive_soup.find("div", {"id": "archive-grid"})
        if not archive_grid:
            print("Warning: #archive-grid not found in archive.html")
        else:
            for review in index_grid.find_all("div", class_="review-card"):
                archive_grid.append(review)
            with open("archive.html", "w", encoding="utf-8") as f:
                f.write(str(archive_soup))
            print("✅ Archived old reviews")
    except FileNotFoundError:
        print("Warning: archive.html not found—creating basic version")
        with open("archive.html", "w", encoding="utf-8") as f:
            f.write("""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Tool Review Archive - AI Cash Kick</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .reviews-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
        .review-card { background: #f9f9f9; border-radius: 12px; padding: 20px; box-shadow: 0 0 15px rgba(0,123,255,0.1); }
        .review-card h3 { color: #00b4ff; }
        .pros-cons { display: flex; justify-content: space-between; }
        .pros-cons ul { list-style: disc; padding-left: 20px; color: #555; }
        .example { background: #f1f5fb; padding: 15px; border-radius: 8px; }
        .affiliate-link { background: #007bff; color: white; padding: 10px; border-radius: 5px; }
    </style>
</head>
<body>
    <header><div class="container"><h1>AI Cash Kick</h1></div></header>
    <section id="archive"><div class="container"><h2>Archived AI Tool Reviews</h2><div id="archive-grid" class="reviews-grid"></div></div></section>
</body>
</html>""")

    # Clear and inject new reviews (limit to 3)
    index_grid.clear()
    for tool in tools[:3]:
        review_html = generate_review(tool)
        index_grid.append(BeautifulSoup(review_html, "html.parser"))
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(str(index_soup))
    print("✅ Injected new reviews into index.html")

def main():
    update_files()

if __name__ == "__main__":
    main()
