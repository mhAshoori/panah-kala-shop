const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

  // --- Sign-in mode toggle ---
  await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1000));
  const tabInfo = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const tab = btns.find(
      (b) => b.textContent.includes('کد پیامکی') || b.textContent.includes('SMS Code')
    );
    return tab
      ? { found: true, rect: (() => { const r = tab.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })() }
      : { found: false };
  });
  console.log('sign-in tab found:', tabInfo.found, JSON.stringify(tabInfo.rect || {}));
  if (tabInfo.found) {
    await page.touchscreen.tap(tabInfo.rect.x + tabInfo.rect.w / 2, tabInfo.rect.y + tabInfo.rect.h / 2);
    await new Promise((r) => setTimeout(r, 600));
    const phoneVisible = await page.evaluate(() => {
      const el = document.getElementById('phone');
      return !!el && el.getBoundingClientRect().height > 0;
    });
    console.log('SIGN-IN phone tab visible after tap:', phoneVisible);
  }

  // --- PDP thumbnail tap ---
  await page.goto('http://localhost:3000/product/iphone-15-pro', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1000));
  const gal = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter((b) =>
      b.querySelector('img')
    );
    return btns.slice(0, 4).map((b) => {
      const r = b.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, aria: b.getAttribute('aria-label') };
    });
  });
  console.log('gallery buttons:', JSON.stringify(gal));
  if (gal.length > 1) {
    const mainBefore = await page.evaluate(
      () => document.querySelector('main img')?.getAttribute('src')
    );
    await page.touchscreen.tap(gal[1].x + gal[1].w / 2, gal[1].y + gal[1].h / 2);
    await new Promise((r) => setTimeout(r, 600));
    const mainAfter = await page.evaluate(
      () => document.querySelector('main img')?.getAttribute('src')
    );
    console.log('thumbnail tap -> main image changed:', mainBefore !== mainAfter);
  }

  await browser.close();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
