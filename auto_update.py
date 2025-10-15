import os
from datetime import datetime
import openai
from bs4 import BeautifulSoup
import requests

# Optional Twitter
try:
    import tweepy
    TWITTER_ENABLED = True
except ImportError:
    TWITTER_ENABLED = False

# -----------------------------
# CONFIG
# -----------------------------
INDEX_HTML_PATH = "index.html"
REVIEWS_SECTION_ID = "reviews"  # ID where reviews are injected
MAX_TOOLS = 3  # Number of tools to generate per run

# Set OpenAI API key from environment
openai.api_key = os.getenv("OPENAI_API_KEY")

# Twitter setup (optional)
if TWITTER_ENABLED:
    auth = tweepy.OAuth1UserHandler(
        os.getenv("TWITTER_API_KEY"),
        os.getenv("TWITTER_API_SECRET"),
        os.getenv("TWITTER_ACCESS_TOKEN"),
        os.getenv("TWITTER_ACCESS_SECRET")
    )
    twitter_api = tweepy.API(auth)
else:
    twitter_api = None

# -----------------------------
# 1. Fetch trending AI tools
# -----------------------------
def fetch_ai_tools():
    """
    Example: Hardcoded list for simplicity.
    You can replace with scraping FutureTools.io or another API.
    """
    tools = [
        {"name": "ChatGPT", "url": "https://chat.openai.com"},
        {"name": "Midjourney", "url": "https://www.midjourney.com"},
        {"name": "Canva AI", "url": "https://www.canva.com"}
    ]
    return tools[:MAX_TOOLS]

# -----------------------------
# 2. Generate AI review using OpenAI v1.0+
# -----------------------------
def generate_review(tool_name, tool_url):
    prompt = f"""
    Write a concise, SEO-friendly HTML review card for a website.
    Include:
    - Short description of {tool_name}
    - 2 pros and 2 cons
    - Earning potential if used for side hustles
    - One example usage sentence
    Wrap everything in a <div class="review-card">...</div> ready to inject
    """
    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=350
    )
    html_review = response.choices[0].message.content.strip()
    return html_review

# -----------------------------
# 3. Inject reviews into index.html
# -----------------------------
def update_index_html(new_reviews_html):
    with open(INDEX_HTML_PATH, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")

    reviews_section = soup.find(id=REVIEWS_SECTION_ID)
    if not reviews_section:
        print(f"ERROR: Could not find section with id='{REVIEWS_SECTION_ID}'")
        return

    # Remove previous automated reviews
    for card in reviews_section.find_all("div", class_="auto-review"):
        card.decompose()

    # Insert new reviews
    for review_html in new_reviews_html:
        review_soup = BeautifulSoup(review_html, "html.parser")
        for div in review_soup.contents:
            if hasattr(div, "attrs"):
                div["class"] = div.get("class", []) + ["auto-review"]
        reviews_section.append(review_soup)

    # Save updated index.html
    with open(INDEX_HTML_PATH, "w", encoding="utf-8") as f:
        f.write(str(soup.prettify()))
    print("✅ index.html updated successfully!")

# -----------------------------
# 4. Optional: Tweet about new tools
# -----------------------------
def tweet_new_tools(tools):
    if not TWITTER_ENABLED or twitter_api is None:
        return
    for t in tools:
        try:
            tweet_text = f"New AI Tool Alert! 🚀 {t['name']} - Try it here: {t['url']} #AI #SideHustle"
            twitter_api.update_status(tweet_text)
            print(f"✅ Tweeted: {t['name']}")
        except Exception as e:
            print(f"⚠️ Could not tweet {t['name']}: {e}")

# -----------------------------
# MAIN
# -----------------------------
def main():
    tools = fetch_ai_tools()
    new_reviews = []
    for tool in tools:
        print(f"Generating review for {tool['name']}...")
        try:
            review_html = generate_review(tool["name"], tool["url"])
            new_reviews.append(review_html)
        except Exception as e:
            print(f"⚠️ Failed to generate review for {tool['name']}: {e}")

    update_index_html(new_reviews)
    tweet_new_tools(tools)

if __name__ == "__main__":
    main()
