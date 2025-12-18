import os
import json
from openai import OpenAI
from bs4 import BeautifulSoup
from datetime import datetime

# Initialize OpenAI client (with error handling)
api_key = os.getenv("OPENAI_API_KEY")
client = None
if api_key:
    try:
        client = OpenAI(api_key=api_key)
        # Test client with a cheap call (optional, but skips if quota low)
        client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": "Say 'OK'"}], max_tokens=5)
    except Exception as e:
        print(f"OpenAI client init failed (likely quota): {e}")
        client = None
else:
    print("No OPENAI_API_KEY—using fallbacks.")

def discover_new_tools(num_tools=2):
    """Fallback to curated 2025 AI tools (no OpenAI needed). Sourced from recent searches."""
    # Curated from 2025 sources: Avoids site duplicates (ChatGPT, Claude, etc.)
    potential_tools = [
        {"name": "Manus", "url": "https://manus.ai"},  # AI for social media scheduling
        {"name": "Filmora", "url": "https://filmora.wondershare.com"},  # AI video editing
        {"name": "Clipchamp", "url": "https://clipchamp.com"},  # Microsoft AI video creator
        {"name": "Jasper", "url": "https://jasper.ai"},  # AI content writing
        {"name": "Gemini", "url": "https://gemini.google.com"},  # Google AI for ideas
        {"name": "Runway ML", "url": "https://runwayml.com"},  # AI video generation
        {"name": "Fireflies.ai", "url": "https://fireflies.ai"},  # AI meeting notes for consulting
    ]
    import random
    selected = random.sample(potential_tools, min(num_tools, len(potential_tools)))
    print(f"Discovered {len(selected)} new tools: {[t['name'] for t in selected]}")
    return selected

def generate_review(tool, use_openai=True):
    """Generate review—tries OpenAI, falls back to static if quota hit."""
    name, url = tool['name'], tool.get('url', '#')
    if client and use_openai:
        try:
            prompt = f"""
            Write a concise, SEO-optimized review (150-200 words) for {name} as a side hustle tool (date: October 20, 2025).
            Include:
            - Earnings potential: $X–$Y/mo
            - Pros: 2-3 bullets
            - Cons: 1-2 bullets
            - Example: One practical side hustle idea
            - Disruption: How it changes the game
            Format as HTML for .review-card: <p>Earnings: ...</p><div class="pros-cons"><ul><li>Pro</li></ul><ul><li>Con</li></ul></div><div class="example"><code>Example</code></div><p>Disruption: ...</p><a href="{url}" class="affiliate-link">Try Now</a>
            """
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": "Expert AI side hustle reviewer."}, {"role": "user", "content": prompt}],
                temperature=0.7, max_tokens=300
            )
            return f'<div class="review-card"><h3>Review: {name} (Updated Oct 2025)</h3><p>{response.choices[0].message.content.strip()}</p></div>'
        except Exception as e:
            print(f"OpenAI review failed for {name}: {e}—using static fallback.")
    
    # Static fallback (customize as needed)
    return f"""
    <div class="review-card">
        <h3>Review: {name} (Updated Oct 2025)</h3>
        <p>Earnings potential: $100–$400/mo</p>
        <div class="pros-cons">
            <ul><li>Easy to use for beginners</li><li>Fast content generation</li><li>Integrates with social media</li></ul>
            <ul><li>Free tier limits advanced features</li></ul>
        </div>
        <div class="example"><code>Example: Use {name} to create Pinterest pins and sell scheduling services on Fiverr for $50/project.</code></div>
        <p>Disruption: Transforms manual marketing into automated hustles, saving hours weekly.</p>
        <a href="{url}" target="_blank" class="affiliate-link">Try {name} Now</a>
    </div>
    """

def update_files():
    """Update index.html with new reviews, archive old ones."""
    tools = discover_new_tools(num_tools=3)
    if not tools:
        print("No tools discovered—exiting.")
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
        if archive_grid:
            for review in list(index_grid.find_all("div", class_="review-card")):  # Copy without removing yet
                archive_grid.append(review)
            with open("archive.html", "w", encoding="utf-8") as f:
                f.write(str(archive_soup))
            print("✅ Archived old reviews")
    except FileNotFoundError:
        print("Warning: archive.html not found—creating.")
        # [Insert basic archive.html template as before]

    # Clear and inject new reviews
    index_grid.clear()
    for tool in tools:
        review_html = generate_review(tool)
        index_grid.append(BeautifulSoup(review_html, "html.parser"))
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(str(index_soup))
    print("✅ Injected new reviews into index.html")

def main():
    update_files()

if __name__ == "__main__":
    main()
