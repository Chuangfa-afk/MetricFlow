// pages/sitemap.xml.js
import fs from 'fs';
import path from 'path';

const EXTERNAL_DATA_URL = 'https://ronkaequity.com'; // Your real domain

function generateSiteMap(stocks) {
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>${EXTERNAL_DATA_URL}</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <changefreq>daily</changefreq>
       <priority>1.0</priority>
     </url>
     <url>
       <loc>${EXTERNAL_DATA_URL}/about</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <changefreq>monthly</changefreq>
       <priority>0.8</priority>
     </url>

     ${stocks
       .map(({ symbol }) => {
         return `
       <url>
           <loc>${EXTERNAL_DATA_URL}/stock/${symbol}</loc>
           <lastmod>${new Date().toISOString()}</lastmod>
           <changefreq>daily</changefreq>
           <priority>0.9</priority>
       </url>
     `;
       })
       .join('')}
   </urlset>
 `;
}

export async function getServerSideProps({ res }) {
  // 1. Read your Stock Data file
  const filePath = path.join(process.cwd(), 'stock_data.json');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const stocks = JSON.parse(fileContents);

  // 2. Generate the XML with the data
  const sitemap = generateSiteMap(stocks);

  // 3. Send it to the browser as an XML file (not a webpage)
  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
}

export default function SiteMap() {
  // This page renders nothing visually, the work is done in getServerSideProps
}