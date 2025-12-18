#!/usr/bin/env node

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Product Hunt AI Tools Web Scraper
 * Scrapes Product Hunt for AI tools, parses HTML, generates reviews, and commits to repository
 */

const CONFIG = {
  productHuntUrl: 'https://www.producthunt.com/topics/artificial-intelligence',
  outputDir: './ai-tools-reviews',
  reviewsDir: './ai-tools-reviews/reviews',
  maxRetries: 3,
  retryDelay: 2000,
};

/**
 * Initialize directories for storing scraped data
 */
function initializeDirectories() {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log(`✓ Created output directory: ${CONFIG.outputDir}`);
  }

  if (!fs.existsSync(CONFIG.reviewsDir)) {
    fs.mkdirSync(CONFIG.reviewsDir, { recursive: true });
    console.log(`✓ Created reviews directory: ${CONFIG.reviewsDir}`);
  }
}

/**
 * Fetch webpage with retry logic
 */
async function fetchWithRetry(url, retries = CONFIG.maxRetries) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (retries > 0) {
      console.log(`⚠ Retry attempt ${CONFIG.maxRetries - retries + 1}/${CONFIG.maxRetries}...`);
      await new Promise((resolve) => setTimeout(resolve, CONFIG.retryDelay));
      return fetchWithRetry(url, retries - 1);
    }
    throw new Error(`Failed to fetch ${url} after ${CONFIG.maxRetries} retries: ${error.message}`);
  }
}

/**
 * Parse Product Hunt page and extract AI tools
 */
async function scrapeProductHunt() {
  console.log(`\n🔍 Scraping Product Hunt: ${CONFIG.productHuntUrl}`);

  try {
    const html = await fetchWithRetry(CONFIG.productHuntUrl);
    const $ = cheerio.load(html);

    const tools = [];

    // Parse product listings - adjust selectors based on actual HTML structure
    $('[data-test="products-list"] [data-test="product-card"]').each((index, element) => {
      try {
        const $element = $(element);

        const name = $element.find('[data-test="product-name"]').text().trim();
        const tagline = $element.find('[data-test="product-tagline"]').text().trim();
        const url = $element.find('a').attr('href') || '';
        const votes = $element.find('[data-test="vote-button"]').text().trim();

        if (name) {
          tools.push({
            id: `tool-${index}`,
            name: name || 'Unknown',
            tagline: tagline || 'No description',
            url: `https://www.producthunt.com${url}`,
            votes: parseInt(votes) || 0,
            scraped_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.warn(`⚠ Error parsing product element: ${error.message}`);
      }
    });

    console.log(`✓ Successfully scraped ${tools.length} AI tools from Product Hunt`);
    return tools;
  } catch (error) {
    console.error(`✗ Error scraping Product Hunt: ${error.message}`);
    return [];
  }
}

/**
 * Generate HTML review for an AI tool
 */
function generateReviewHTML(tool, index) {
  const reviewHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tool.name} - AI Tool Review</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .header .tagline {
            font-size: 1.1em;
            opacity: 0.95;
        }
        .content {
            padding: 30px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .info-item {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .info-item label {
            font-weight: bold;
            color: #667eea;
            display: block;
            margin-bottom: 5px;
        }
        .info-item value {
            display: block;
            word-break: break-all;
        }
        .votes {
            font-size: 1.3em;
            color: #764ba2;
        }
        .link-section {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
        }
        .product-link {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            transition: background 0.3s ease;
        }
        .product-link:hover {
            background: #764ba2;
        }
        .metadata {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            font-size: 0.9em;
            color: #999;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${tool.name}</h1>
            <p class="tagline">${tool.tagline}</p>
        </div>
        <div class="content">
            <div class="info-grid">
                <div class="info-item">
                    <label>Tool ID</label>
                    <value>${tool.id}</value>
                </div>
                <div class="info-item">
                    <label>Product Hunt Votes</label>
                    <value class="votes">👍 ${tool.votes.toLocaleString()}</value>
                </div>
            </div>

            <div class="info-item" style="grid-column: 1 / -1;">
                <label>About This Tool</label>
                <value>${tool.tagline}</value>
            </div>

            <div class="link-section">
                <a href="${tool.url}" class="product-link" target="_blank">🚀 View on Product Hunt</a>
            </div>

            <div class="metadata">
                <strong>Metadata:</strong><br>
                Scraped: ${new Date(tool.scraped_at).toLocaleString()}<br>
                Source: Product Hunt AI Tools<br>
                Review #: ${index}
            </div>
        </div>
        <div class="footer">
            <p>🤖 AI Tool Review - Auto-generated by AI Agent Scraper</p>
            <p>© ${new Date().getFullYear()} AICashKick. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

  return reviewHTML;
}

/**
 * Save tool data and generate review HTML
 */
async function saveToolReviews(tools) {
  console.log(`\n💾 Generating and saving reviews for ${tools.length} tools...`);

  // Save tools index as JSON
  const toolsIndexPath = path.join(CONFIG.outputDir, 'tools-index.json');
  fs.writeFileSync(toolsIndexPath, JSON.stringify(tools, null, 2));
  console.log(`✓ Saved tools index: ${toolsIndexPath}`);

  // Generate HTML reviews for each tool
  const savedReviews = [];
  tools.forEach((tool, index) => {
    const reviewHTML = generateReviewHTML(tool, index + 1);
    const reviewFileName = `${tool.id}-review.html`;
    const reviewPath = path.join(CONFIG.reviewsDir, reviewFileName);

    fs.writeFileSync(reviewPath, reviewHTML);
    savedReviews.push(reviewFileName);
    console.log(`✓ Generated review: ${reviewFileName}`);
  });

  // Save reviews manifest
  const manifestPath = path.join(CONFIG.outputDir, 'reviews-manifest.json');
  const manifest = {
    total_reviews: savedReviews.length,
    generated_at: new Date().toISOString(),
    reviews: savedReviews,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✓ Saved reviews manifest: ${manifestPath}`);

  return savedReviews;
}

/**
 * Commit changes to git repository
 */
function commitToRepository() {
  console.log('\n📝 Committing changes to repository...');

  try {
    // Stage all changes
    execSync('git add .', { stdio: 'inherit' });
    console.log('✓ Staged all changes');

    // Check if there are changes to commit
    const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();

    if (status.length === 0) {
      console.log('ℹ No changes to commit');
      return false;
    }

    // Commit changes
    const commitMessage = `[AI Agent] Scrape and generate AI tool reviews - ${new Date().toISOString()}`;
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    console.log(`✓ Committed with message: ${commitMessage}`);

    // Push changes
    execSync('git push origin main', { stdio: 'inherit' });
    console.log('✓ Pushed changes to remote repository');

    return true;
  } catch (error) {
    console.error(`✗ Error during git operations: ${error.message}`);
    return false;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🤖 AI Agent Scraper - Product Hunt AI Tools');
  console.log('='.repeat(50));

  try {
    // Initialize directories
    initializeDirectories();

    // Scrape Product Hunt
    const tools = await scrapeProductHunt();

    if (tools.length === 0) {
      console.log('⚠ No tools found. Exiting.');
      process.exit(0);
    }

    // Save reviews
    const reviews = await saveToolReviews(tools);
    console.log(`\n✓ Successfully generated ${reviews.length} reviews`);

    // Commit to repository
    const committed = commitToRepository();

    if (committed) {
      console.log('\n✅ Pipeline completed successfully!');
      console.log(`📊 Summary: Scraped ${tools.length} tools, generated ${reviews.length} reviews`);
    } else {
      console.log('\n⚠ Pipeline completed with warnings');
    }
  } catch (error) {
    console.error('\n❌ Pipeline failed:', error.message);
    process.exit(1);
  }
}

// Execute main function
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
