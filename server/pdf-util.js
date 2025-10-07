const puppeteer = require('puppeteer');

async function htmlToPdfBuffer(html) {
  // Launch headless chrome to generate a PDF buffer
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  return pdf;
}

module.exports = { htmlToPdfBuffer };
