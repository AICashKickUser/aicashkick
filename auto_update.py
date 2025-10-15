import os
import re
import openai
import requests
from bs4 import BeautifulSoup
from datetime import datetime

# Optional Twitter (if enabled)
try:
    import tweepy
    TWITTER_ENABLED = True
except ImportError:
    TWITTER_ENABLED = False

# -----------------------------
# CONFIG
# -----------------------------
INDEX_HTML_PATH = "index.html"
REVIEWS_SECTION_ID = "reviews"
MAX_TOOLS = 3
FUTURETOOLS_URL = "https://www.futuretools.io"
openai.api_key = os.getenv("OPENAI_API_KEY")

# Twitter Setup
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
# 1️⃣ Fetch trending AI tools dynamically
# -----------------------------
def fetch_ai_tools():
    print("🔍 Fetching trending AI tools from FutureTools.io ...")
    try:
        response = requests.get(FUTURETOOLS_URL, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")

        tools = []
        for item in soup.select("a.group")[:MAX_TOOLS]:
            name = item.select_one("h2")
            url = item.get("href")

            if name and url:
                clean_name = name.text.strip()
                full_url = url if url.startswith("http") else FUTURETOOLS_URL + url
                tools.append({"name": clean_name, "url": full_url})

        print(f"✅ Found {len(tools)} tools.")
        return tools

    except Exception as e:
        print(f"⚠️ Error fetching tools: {e}")
        # Fallback if scraping fails
        return [
            {"name": "ChatGPT", "url": "https://chat.openai.com"},
            {"name": "Midjourney", "url": "https://www.midjourney.com"},
            {"name": "Canva AI", "url": "https://www.canva.com"}
        ]


# -----------------------------
# 2️⃣ Generate AI-powered review (OpenAI v1)
# -----------------------------
def generate_review(tool_name, tool_url):
    prompt = f"""
    Write a concise, SEO-optimized HTML review card for the AI tool '{tool_name}'.
    Include:
    - A one-sentence overview
    - Two pros and two cons
    - One creative real-world use case
    - A quick "Why it's trending" note
    - Link back to {tool_url}
    Wrap it in <div class="review-card"> ... </div>
    Use <h3> for title, <ul> for pros/cons.
    """
    try:
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=400
        )
        html_content = response.choices[0].message.content.strip()
        return f"\n<!-- Auto Review: {tool_name} -->\n{html_content}\n"
    except Exception as e:
        print(f"⚠️ OpenAI API error: {e}")
        return f"<div class='review-card error'>Could not generate review for {tool_name}.</div>"


# -----------------------------
# 3️⃣ Inject generated reviews into index.html
# -----------------------------
def update_index_html(new_reviews_html):
    from bs4 import BeautifulSoup
    with open(INDEX_HTML_PATH, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")

    section = soup.find(id=REVIEWS_SECTION_ID)
    if not section:
        print(f"⚠️ Section with id='{REVIEWS_SECTION_ID}' not found.")
        return

    # Remove old auto-generated reviews
    for auto in section.find_all(string=re.compile("Auto Review")):
        if auto.parent:
            auto.parent.decompose()

    # Insert new reviews
    for review_html in new_reviews_html:
        section.append(BeautifulSoup(review_html, "html.parser"))

    with open(INDEX_HTML_PATH, "w", encoding="utf-8") as f:
        f.write(str(soup.prettify()))

    print("✅ index.html updated successfully!")


# -----------------------------
# 4️⃣ Optional tweet posting
# -----------------------------
def tweet_new_tools(tools):
    if not TWITTER_ENABLED or twitter_api is None:
        print("ℹ️ Twitter integration not enabled.")
        return

    for t in tools:
        try:
            tweet_text = f"🔥 Trending AI Tool: {t['name']} — {t['url']} #AI #Automation #SideHustle"
            twitter_api.update_status(tweet_text)
            print(f"✅ Tweeted: {t['name']}")
        except Exception as e:
            print(f"⚠️ Tweet failed for {t['name']}: {e}")


# -----------------------------
# 5️⃣ Main process
# -----------------------------
def main():
    tools = fetch_ai_tools()
    generated_reviews = []

    for t in tools:
        print(f"🧠 Generating review for {t['name']} ...")
        html = generate_review(t["name"], t["url"])
        generated_reviews.append(html)

    update_index_html(generated_reviews)
    tweet_new_tools(tools)
    print(f"🏁 Completed AI Review Update at {datetime.utcnow()} UTC")


if __name__ == "__main__":
    main()
