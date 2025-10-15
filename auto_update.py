import os
import requests
from bs4 import BeautifulSoup
import openai
import tweepy
from datetime import datetime

# -----------------------------
# CONFIG
# -----------------------------
INDEX_HTML_PATH = "index.html"
REVIEWS_SECTION_ID = "reviews"  # where new reviews will be inserted
MAX_TOOLS = 3  # Number of tools to process each run

openai.api_key = os.getenv("OPENAI_API_KEY")

# Twitter setup (optional)
TWITTER_ENABLED = True
if TWITTER_ENABLED:
    auth = tweepy.OAuth1UserHandler(
        os.getenv("TWITTER_API_KEY"),
        os.getenv("TWITTER_API_SECRET"),
        os.getenv("TWITTER_ACCESS_TOKEN"),
        os.getenv("TWITTER_ACCESS_SECRET")
    )
    twitter_api = tweepy.API(auth)

# -----------------------------
# 1. Get trending AI tools
# -----------------------------
def fetch_ai_tools():
    """
    Fetch a small list of trending AI tools.
    For simplicity, using a hardcoded list. 
    Can replace with scraping or API later.
    """
    tools = [
        {"name": "ChatGPT", "url": "https://chat.openai.com"},
        {"name": "Midjourney", "url": "https://www.midjourney.com"},
        {"name": "Canva AI", "url": "https://www.canva.com"},
    ]
    return tools[:MAX_TOOLS]

# -----------------------------
# 2. Generate AI review using OpenAI
# -----------------------------
def generate_review(tool_name, tool_url):
    prompt = f"""
    Write a concise, SEO-friendly AI review for a website. Include:
    - Short description of {tool_name}
    - Pros and cons (2 each)
    - Estimated earning potential if used for side hustles
    - Example of usage (1 short sentence)
    Format the output as HTML card ready to inject in a div.
    """
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=300
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

    # Clear previous automated reviews (optional: comment tag)
    for card in reviews_section.find_all("div", class_="auto-review"):
        card.decompose()

    # Insert new reviews
    for review_html in new_reviews_html:
        review_soup = BeautifulSoup(review_html, "html.parser")
        for div in review_soup.contents:
            if hasattr(div, "attrs"):
                div["class"] = div.get("class", []) + ["auto-review"]
        reviews_section.append(review_soup)

    # Write back
    with open(INDEX_HTML_PATH, "w", encoding="utf-8") as f:
        f.write(str(soup.prettify()))
    print("✅ index.html updated with new reviews.")

# -----------------------------
# 4. Optional: Tweet new AI tools
# -----------------------------
def tweet_new_tools(tools):
    if not TWITTER_ENABLED:
        return
    for t in tools:
        try:
            tweet_text = f"New AI Tool Alert! 🚀 {t['name']} - Try it here: {t['url']} #AI #SideHustle"
            twitter_api.update_status(tweet_text)
            print(f"✅ Tweeted about {t['name']}")
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
        review_html = generate_review(tool["name"], tool["url"])
        new_reviews.append(review_html)

    update_index_html(new_reviews)
    tweet_new_tools(tools)

if __name__ == "__main__":
    main()
