import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import translations
import translations from '../locales.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const templatePath = path.join(rootDir, 'index.html');
let template = fs.readFileSync(templatePath, 'utf-8');

// 1. Prepare Hreflang Tags (Canonical URLs)
// We assume the site is hosted at the root.
// We should define the base URL.
const BASE_URL = 'https://todays-trash.web.app';

// Generate hreflang tags for all languages
let hreflangTags = '';
Object.keys(translations).forEach(lang => {
    // For English (default), maybe we want it at root or /en/?
    // Plan said: /en/ for English content, root for redirect.
    // So all langs get a folder.
    hreflangTags += `    <link rel="alternate" hreflang="${lang}" href="${BASE_URL}/${lang}/" />\n`;
});
// Add x-default pointing to the root (redirector)
hreflangTags += `    <link rel="alternate" hreflang="x-default" href="${BASE_URL}/" />`;

// 2. Function to generate a page for a specific language
function generatePage(lang, content) {
    let html = template;

    // A. Set HTML Lang attribute
    html = html.replace('<html lang="en">', `<html lang="${lang}">`);

    // B. Inject Hreflang tags into <head>
    // We'll insert them before the stylesheets
    html = html.replace('<!-- Fonts -->', `${hreflangTags}\n\n    <!-- Fonts -->`);

    // C. Replace Content
    // We need to be careful with replacers.
    // Title
    html = html.replace(/<title>.*?<\/title>/, `<title>${content.title} - ${content.slogan.replace('<br>', ' ')}</title>`);

    // Meta Description
    const metaDesc = content.slogan.replace('<br>', ' ');
    html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${metaDesc}">`);

    // OG Title & Description
    html = html.replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${content.title}">`);
    html = html.replace(/<meta property="og:description"\s+content=".*?">/, `<meta property="og:description" content="${metaDesc}">`);

    // Twitter Title & Description
    html = html.replace(/<meta property="twitter:title" content=".*?">/, `<meta property="twitter:title" content="${content.title}">`);
    html = html.replace(/<meta property="twitter:description"\s+content=".*?">/, `<meta property="twitter:description" content="${metaDesc}">`);

    // Body Content (Direct IDs)
    // We can't just run JS, we have to string replace known IDs.
    // This assumes the HTML structure hasn't changed drastically.

    // Title & Slogan
    html = html.replace('<h1 id="app-title" class="fade-in">Today\'s Trash</h1>', `<h1 id="app-title" class="fade-in">${content.title}</h1>`);
    // Note: Slogan usually has HTML in it (<br>), so we need to be careful.
    // The template has: <p id="app-slogan" class="fade-in delay-1">Leave what you want to forget here.<br>When today ends, it all\n                disappears.</p>
    // This is hard to match exactly with regex due to newlines and attributes.
    // We will use a more robust replacement for the inner content of specific IDs if possible, 
    // or just assume the IDs are unique enough to split/join.

    // Better strategy: Use Cheerio? No, I shouldn't add dependencies if I can avoid it.
    // Let's rely on the ID markers.

    // Helper to replace content by ID
    const replaceById = (id, newContent) => {
        const regex = new RegExp(`(<[^>]+id="${id}"[^>]*>)([^<]*)(<\\/[^>]+>)`, 's');
        // This simple regex might fail if there are nested tags like <br> inside.
        // The slogan has <br>.
        // Let's try matching the opening tag and replacing until the closing tag? Too risky without a parser.

        // Alternative: Just replace the specific English strings found in index.html with the target language strings.
        // This is safe ONLY if the English string is unique.
    };

    // Let's use string replacement based on the English keys we see in index.html
    // const en = translations['en'];
    // We know what's in index.html roughly.

    // Replacements Array
    // IMPORTANT: specific/longer matches must come BEFORE general/shorter matches
    // to prevent partial replacement collisions (e.g. "Today's Trash" vs "Today's Trash clears in")
    const replacements = [
        {
            search: "Today's Trash clears in", // countdown-label (Specific)
            replace: content.countdown_label
        },
        {
            search: "Today's Trash", // Title (General)
            replace: content.title
        },
        {
            // We need to handle the slogan which might have newlines in the source file
            search: `Leave what you want to forget here.<br>When today ends, it all\n                disappears.`,
            replace: content.slogan // content.slogan often has <br> too
        },
        // Fallback for slogan if newlines differ
        {
            search: "Leave what you want to forget here.<br>When today ends, it all disappears.",
            replace: content.slogan
        },
        {
            search: `placeholder="Write it down here. (Max 300 chars)"`,
            replace: `placeholder="${content.placeholder}"`
        },
        {
            search: ">Throw away<", // button (be careful not to replace meta tags if they match)
            replace: `>${content.button_throw}<`
        },
        {
            search: "No memories thrown away yet.",
            replace: content.empty_state
        },
        {
            search: "Are you sure you want to throw this away?",
            replace: content.modal_title
        },
        {
            search: "Once thrown away, it cannot be edited or retrieved.<br>When today ends, it will disappear\n                forever.",
            replace: content.modal_body
        },
        // Fallback for modal body
        {
            search: "Once thrown away, it cannot be edited or retrieved.<br>When today ends, it will disappear forever.",
            replace: content.modal_body
        },
        {
            search: ">Cancel<",
            replace: `>${content.modal_cancel}<`
        },
        {
            search: "This service does not collect any personal data.<br>All data is stored locally on\n                your device and automatically deleted at midnight.",
            replace: content.footer_privacy
        },
        // Localized OG Image
        {
            search: "https://todays-trash.web.app/og-image.png",
            replace: `${BASE_URL}/assets/${lang.toLowerCase()}.png`
        }
    ];

    replacements.forEach(rep => {
        // Escape regex special characters if we were using regex, but replaceAll handles literals if string.
        // However, replaceAll only available in newer Node.
        // We will use split join.
        html = html.split(rep.search).join(rep.replace);
    });

    // Also replace the button with ID that might have been disabled
    const btnSearch = '<button id="btn-throw" disabled>Throw away</button>';
    const btnReplace = `<button id="btn-throw" disabled>${content.button_throw}</button>`;
    html = html.replace(btnSearch, btnReplace);

    // D. Fix Relative Paths (CSS, JS)
    // Since we are moving 1 level deep (e.g. /ko/), we prepend ../ to relative paths.
    // CSS
    html = html.replace('href="styles.css"', 'href="../styles.css"');
    // JS
    html = html.replace('src="app.js"', 'src="../app.js"');
    // Favicon & Assets
    html = html.replace('href="assets/favicon.png"', 'href="../assets/favicon.png"');

    return html;
}

// 3. Create Directories and Write Files
if (!fs.existsSync(path.join(rootDir, 'scripts'))) {
    fs.mkdirSync(path.join(rootDir, 'scripts')); // Should exist but just in case
}

Object.keys(translations).forEach(lang => {
    const langDir = path.join(rootDir, lang);
    if (!fs.existsSync(langDir)) {
        fs.mkdirSync(langDir);
    }

    const pageContent = generatePage(lang, translations[lang]);
    fs.writeFileSync(path.join(langDir, "index.html"), pageContent);
    console.log(`Generated ${lang}/index.html`);
});

// 4. Generate Sitemap
const sitemapPath = path.join(rootDir, 'sitemap.xml');
let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>`;

Object.keys(translations).forEach(lang => {
    sitemapContent += `
  <url>
    <loc>${BASE_URL}/${lang}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.8</priority>
  </url>`;
});

sitemapContent += `
  <url>
    <loc>${BASE_URL}/privacy.html</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.5</priority>
  </url>
</urlset>`;

fs.writeFileSync(sitemapPath, sitemapContent);
console.log('Generated sitemap.xml');

console.log('Static site generation complete.');
