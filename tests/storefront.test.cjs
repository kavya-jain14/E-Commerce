const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {readFile} = require('node:fs/promises');
const {resolve, extname} = require('node:path');
const {chromium} = require('playwright');

let server, browser, origin;
before(async () => {
  const root = resolve(__dirname, '..');
  server = createServer(async (request, response) => {
    const path = resolve(root, `.${new URL(request.url, 'http://localhost').pathname.replace(/\/$/, '/index.html')}`);
    if (!path.startsWith(`${root}/`)) {response.writeHead(403).end(); return;}
    try {
      const body = await readFile(path);
      response.setHeader('Content-Type', {'.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml'}[extname(path)] || 'application/octet-stream');
      response.end(body);
    } catch {response.writeHead(404).end();}
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({executablePath: process.env.CHROMIUM_EXECUTABLE || undefined});
});
after(async () => {await browser?.close(); await new Promise(done => server?.close(done));});

test('the header brand remains visible and named without third-party assets', async () => {
  const page = await browser.newPage({viewport: {width: 375, height: 900}});
  try {
    await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
    await page.goto(origin);
    const brand = page.getByRole('img', {name: 'Amazon', exact: true});
    assert.equal(await brand.count(), 1, 'the brand needs an accessible name');
    assert.equal(await brand.evaluate(element => getComputedStyle(element).backgroundImage.includes('/images/amazon-logo.svg')), true);
    assert.equal(await page.evaluate(async () => {
      const image = new Image();
      image.src = 'images/amazon-logo.svg';
      await image.decode();
      return image.naturalWidth > 0;
    }), true);
  } finally {await page.close();}
});

for (const width of [320, 375, 768, 1440]) {
test(`unavailable product photographs use a readable local fallback at ${width}px`, async () => {
  const page = await browser.newPage({viewport: {width, height: 900}});
  try {
    await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
    await page.goto(origin);
    const photos = page.locator('.card-nested img, .today_deals_product_item img');
    assert.equal(await photos.count(), 37);
    await page.waitForFunction(() => [...document.querySelectorAll('.card-nested img, .today_deals_product_item img')].every(image => image.complete && image.naturalWidth > 0), null, {timeout: 2000});
    assert.equal(await photos.evaluateAll(images => images.every(image => image.src.endsWith('/images/product-unavailable.svg') && image.alt.includes('image unavailable'))), true);
    assert.equal(await page.locator('.card-product:visible').count(), 8);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  } finally {await page.close();}
});
}

test('available product photographs retain their original sources and product names', async () => {
  const page = await browser.newPage();
  try {
    await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.fulfill({contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="green"/></svg>'}));
    await page.goto(origin);
    const photos = page.locator('.card-nested img, .today_deals_product_item img');
    assert.equal(await photos.evaluateAll(images => images.every(image => image.naturalWidth > 0 && image.src.startsWith('https://') && image.alt === image.parentElement.querySelector('p').textContent.trim())), true);
  } finally {await page.close();}
});

for (const width of [320, 375, 768, 1440]) {
  test(`search and menu remain usable at ${width}px`, async () => {
    const page = await browser.newPage({viewport: {width, height: 900}});
    try {
      // Geometry and behavior must work even when third-party assets are unavailable.
      await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
      await page.goto(origin);
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(await overflow(), false, 'page must not scroll horizontally');
      const search = page.getByRole('searchbox');
      const searchIcon = page.getByRole('button', {name: 'Search', exact: true}).locator('svg');
      assert.equal(await searchIcon.isVisible(), true, 'search icon must render without the external font');
      assert.ok((await searchIcon.evaluate(icon => icon.getBBox().width)) > 0);
      const searchBox = await search.boundingBox();
      assert.ok(searchBox.width >= 140 && searchBox.x >= 0 && searchBox.x + searchBox.width <= width, 'search must fit the viewport');
      await search.fill('clothing');
      assert.equal(await page.locator('.card-product:visible').count(), 1);
      await search.fill('no-such-product');
      assert.equal(await page.locator('.card-product:visible').count(), 0);
      assert.equal(await page.getByRole('status').textContent(), '0 matching product sections');
      await search.fill('');
      assert.equal(await page.locator('.card-product:visible').count(), 8);
      await page.locator('#open-nav-sidebar').press('Enter');
      const closer = page.getByRole('button', {name: 'Close menu'});
      assert.equal(await closer.locator('svg').isVisible(), true, 'menu close icon must render without the external font');
      assert.ok((await closer.locator('svg').evaluate(icon => icon.getBBox().width)) > 0);
      await page.waitForFunction(() => document.activeElement.id === 'sidebar-navigation-close');
      await page.waitForFunction(() => Math.abs(document.getElementById('sidebar-container-navigation-id').getBoundingClientRect().left) < 0.5);
      const closeBox = await closer.boundingBox();
      assert.ok(closeBox.x >= 0 && closeBox.x + closeBox.width <= width, 'close menu must fit the viewport');
      await closer.press('Tab');
      assert.equal(await closer.evaluate(element => element === document.activeElement), true);
      await closer.press('Escape');
      assert.equal(await page.locator('#open-nav-sidebar').getAttribute('aria-expanded'), 'false');
      assert.equal(await page.locator('#open-nav-sidebar').evaluate(element => element === document.activeElement), true);
      assert.equal(await overflow(), false);
    } finally {await page.close();}
  });
}
