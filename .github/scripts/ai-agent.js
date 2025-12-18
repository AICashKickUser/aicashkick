// .github/scripts/ai-agent.js

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// --- Configuration ---
const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
const branch = 'main'; // or 'master'
const reviewsDir = 'reviews';

// Ensure the reviews directory exists
if (!fs.existsSync(reviewsDir)) {
  fs.mkdirSync(reviewsDir, { recursive: true });
}

// --- Main Logic ---

async function runAgent() {
  console.log("🚀 Starting AI Agent (Web Scraper Edition)...");
  const today = new Date().toISOString().split('T')[0];
  const fileName = `ai-tools-${today}.html`;
  const filePath = path.join(reviewsDir, fileName);

  try {
    // 1. Scrape the latest AI tools from Product Hunt
    console.log("🔍 Scraping latest AI tools from Product Hunt...");
    const productHuntUrl = 'https://www.producthunt.com/topics/ai';

    // Using Node.js's built-in fetch instead of axios
    const response = await fetch(productHuntUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const tools = [];

    // Product Hunt lists tools in specific HTML tags. We'll find them.
    // Note: This selector might change if Product Hunt updates their website.
    $('li[data-test="post-item"]').each((index, element) => {
      if (index < 5) { // Let's get the top 5 tools
        const toolName = $(element).find('h3').first().text().trim();
        const toolTagline = $(element).find('[data-test="post-tagline"]').first().text().trim();
        const toolUrl = `https://www.producthunt.com${$(element).find('a').first().attr('href')}`;
        
        if (toolName) {
          tools.push({
            name: toolName,
            tagline: toolTagline,
            url: toolUrl
          });
        }
      }
    });

    console.log(`✅ Found ${tools.length} tools.`);

    // 2. Format the scraped data into HTML
    console.log("📝 Formatting reviews into HTML...");
    let toolsHtml = '';
    for (const tool of tools) {
      toolsHtml += `
        <div class="ai-review">
          <h2>${tool.name}</h2>
          <p><strong>Description:</strong> ${tool.tagline}</p>
          <p><strong>Pros:</strong> Newly discovered on Product Hunt, likely innovative and community-vetted.</p>
          <p><strong>Cons:</strong> May be very new, so unproven and could have limited features.</p>
          <p><strong>Rating:</strong> New Release!</p>
          <p><strong>Source:</strong> <a href="${tool.url}" target="_blank">View on Product Hunt</a></p>
        </div>
        <hr>
      `;
    }

    const fullHtml = `
      <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Latest AI Tools - ${today}</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:auto;padding:20px}.ai-review{margin-bottom:30px;padding:20px;border:1px solid #ddd;border-radius:5px}h1,h2{color:#333}a{color:#0066cc}hr{border:none;border-top:1px solid #ddd;margin:30px 0}</style></head><body><h1>Latest AI Tools from Product Hunt</h1><p><em>Updated on ${new Date().toLocaleDateString()}</em></p>${toolsHtml}</body></html>
    `;

    // 3. Save the HTML file
    fs.writeFileSync(filePath, fullHtml);
    console.log(`💾 Saved review to ${filePath}`);

    // 4. Commit and Push to GitHub
    console.log("📤 Committing and pushing to GitHub...");
    const { execSync } = require('child_process');
    
    execSync(`git config --global user.name "GitHub Actions Bot"`);
    execSync(`git config --global user.email "actions@github.com"`);
    execSync(`git add ${filePath}`);
    execSync(`git commit -m "Add daily AI tools review: ${fileName}"`);
    execSync(`git push https://${process.env.PERSONAL_ACCESS_TOKEN}@github.com/${owner}/${repo}.git ${branch}`);

    console.log("✅ Workflow complete!");

  } catch (error) {
    console.error("❌ An error occurred:", error.message);
    process.exit(1);
  }
}

runAgent();
