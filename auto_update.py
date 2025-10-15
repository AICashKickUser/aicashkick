# auto_update.py

import requests, os, openai, tweepy
from datetime import datetime

# Load API keys (from GitHub secrets)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TWITTER_API_KEY = os.getenv("TWITTER_API_KEY")
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
TWITTER_ACCESS_SECRET = os.getenv("TWITTER_ACCESS_SECRET")

# Step 1. Discover new AI tools
def find_new_ai_tools():
    response = requests.get("https://www.futuretools.io/api/tools")  # Example source
    tools = response.json()
    return tools[:3]  # limit to 3 latest

# Step 2. Generate AI review
def create_review(tool):
    prompt = f"Write a 200-word SEO-optimized review of {tool['name']}. Include pros, cons, example use case."
    review = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[{"role":"user","content":prompt}]
    )
    return review.choices[0].message.content

# Step 3. Post to Twitter
def post_to_twitter(text):
    auth = tweepy.OAuth1UserHandler(
        TWITTER_API_KEY, TWITTER_API_SECRET,
        TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
    )
    api = tweepy.API(auth)
    api.update_status(text)

# Step 4. Save to HTML
def save_to_html(content):
    with open("index.html", "r") as f:
        html = f.read()
    html = html.replace("<!-- Automation will inject new review cards here -->",
                        content + "\n<!-- Automation will inject new review cards here -->")
    with open("index.html", "w") as f:
        f.write(html)

def main():
    tools = find_new_ai_tools()
    for tool in tools:
        review = create_review(tool)
        save_to_html(f"<div class='review-card'><h3>{tool['name']}</h3><p>{review}</p></div>")
        post_to_twitter(f"🔥 New AI tool review: {tool['name']} — {tool['url']}\n\nRead full review: aicashkick.com")

if __name__ == "__main__":
    main()
