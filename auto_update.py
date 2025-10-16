import os
from openai import OpenAI

# Create OpenAI client (no proxies param)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


AI_SOURCES = [
    {"name": "ChatGPT", "url": "https://chat.openai.com"},
    {"name": "Claude", "url": "https://claude.ai"},
    {"name": "Perplexity", "url": "https://www.perplexity.ai"},
]

def generate_review(name, url):
    prompt = f"Write a 200-word SEO-optimized review for {name} including features, pros, cons, and an affiliate-style call to action."
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": "You are an expert AI reviewer."},
                  {"role": "user", "content": prompt}],
        temperature=0.7
    )
    text = completion.choices[0].message.content.strip()
    return f"""
    <div class="review-card">
        <h3>{name}</h3>
        <p>{text}</p>
        <a href="{url}" target="_blank" class="btn">Try {name}</a>
    </div>
    """

def inject_reviews():
    with open("index.html", "r", encoding="utf-8") as f:
        html = f.read()

    soup = BeautifulSoup(html, "html.parser")
    grid = soup.find("div", {"id": "reviews-grid"})
    if not grid:
        print("Error: <div id='reviews-grid'> not found.")
        return

    grid.clear()
    for tool in AI_SOURCES:
        grid.append(BeautifulSoup(generate_review(tool["name"], tool["url"]), "html.parser"))

    with open("index.html", "w", encoding="utf-8") as f:
        f.write(str(soup))
    print("✅ Reviews injected into index.html")

def main():
    inject_reviews()

if __name__ == "__main__":
    main()
