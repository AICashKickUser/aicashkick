"""
AI Cash Kick – Automated AI Review Updater
-----------------------------------------
This script:
1. Finds new AI tools online.
2. Writes SEO-optimized reviews using OpenAI.
3. Updates index.html with new reviews.
4. Posts promotional tweets on X (Twitter).
"""

import os, requests, openai, tweepy
from datetime import datetime

# Load API Keys from GitHub Secrets
openai.api_key = os.getenv("OPENAI_API_KEY")

TWITTER_API_KEY = os.getenv("TWITTER_API_KEY")
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
TWITTER_ACCESS_SECRET = os.getenv("TWITTER_ACCESS_SECRET")

# Initialize Twitter client
auth = tweepy.OAuth1UserHandler(
    TWITTER_API_KEY, TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
)
twitter_api = tweepy.API(auth)

# 1️⃣ Discover new AI tools (using FutureTools as example)
def find_new_ai_tools():
    print("🔍 Searching for new AI tools...")
    try:
        response = requests.get("https://www.futuretools.io/api/tools")
        tools = response.json()
        return tools[:3]  # Only latest 3 for each run
    except Exception as e:
        print(f"Error fetching tools: {e}")
        return []

# 2️⃣ Create AI Review
def create_review(tool):
    name = tool.get("name", "Unknown AI Tool")
    url = tool.get("url", "#")
    desc = tool.get("description", "No description available.")
    prompt = f"""
    Write a 200-word SEO-optimized, unbiased review of {name}.
    Include sections for: Overview, Key Features, Pros, Cons, and Ideal Users.
    Include at least 3 SEO keywords naturally.
    End with a short call-to-action like 'Try it now' or 'Learn more'.
    Tool details:
    Name: {name}
    Description: {desc}
    URL: {url}
    """

    print(f"🧠 Generating review for {name}...")
    try:
        completion = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error creating review: {e}")
        return f"<p>Review unavailable for {name}.</p>"

# 3️⃣ Save to HTML
def save_to_html(tool_name, review_content):
    print(f"💾 Saving review for {tool_name} to HTML...")
    try:
        with open("index.html", "r", encoding="utf-8") as f:
            html = f.read()

        new_card = f"""
        <div class='review-card'>
            <h3>{tool_name}</h3>
            <p>{review_content}</p>
        </div>
        """

        marker = "<!-- Automation will inject new review cards here -->"
        html = html.replace(marker, new_card + "\n" + marker)

        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html)
    except Exception as e:
        print(f"Error updating HTML: {e}")

# 4️⃣ Post to Twitter
def post_to_twitter(tool_name, tool_url):
    try:
        tweet = f"🚀 New AI Review: {tool_name}\nRead full review at aicashkick.com\n{tool_url}\n#AI #Automation #AICashKick"
        twitter_api.update_status(tweet)
        print(f"✅ Tweet posted for {tool_name}")
    except Exception as e:
        print(f"Error posting tweet: {e}")

# 5️⃣ MAIN EXECUTION
def main():
    print("🤖 Starting AI Cash Kick auto-update...")
    tools = find_new_ai_tools()
    for tool in tools:
        name = tool.get("name", "AI Tool")
        url = tool.get("url", "#")
        review = create_review(tool)
        save_to_html(name, review)
        post_to_twitter(name, url)
    print("🎉 All updates complete!")

if __name__ == "__main__":
    main()
