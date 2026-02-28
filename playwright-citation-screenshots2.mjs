import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Step 1: Login
  console.log('Navigating to login page...');
  await page.goto('http://localhost:5000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  await emailInput.fill('sakthi@qbend.com');

  const passwordInput = await page.locator('input[type="password"]').first();
  await passwordInput.fill('Qbend#123');

  const loginButton = await page.locator('button[type="submit"]').first();
  await loginButton.click();

  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle');
  console.log('Logged in. URL:', page.url());

  // Step 2: Navigate to citation editor
  console.log('Navigating to citation editor...');
  await page.goto('http://localhost:5000/citation/editor/3472785c-2a11-4596-aebf-f8fabe8e0190', {
    waitUntil: 'networkidle',
    timeout: 60000
  });
  await page.waitForTimeout(5000);
  console.log('Citation editor loaded. URL:', page.url());

  // Step 3: Dismiss the "Got it!" modal if present
  try {
    const gotItButton = page.locator('button:has-text("Got it")').first();
    if (await gotItButton.isVisible({ timeout: 3000 })) {
      console.log('Dismissing "Got it!" modal...');
      await gotItButton.click();
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    console.log('No modal to dismiss.');
  }

  let screenshotIndex = 1;

  // === DOCUMENT PREVIEW TAB ===
  console.log('\n=== DOCUMENT PREVIEW TAB ===');

  // Take screenshot at top after modal dismissed
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `/tmp/citation-editor-${screenshotIndex}.png`, fullPage: false });
  console.log(`Screenshot ${screenshotIndex}: Document Preview - Top of page`);
  screenshotIndex++;

  // Scroll down through the page
  const totalHeight = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
  console.log(`Total page height: ${totalHeight}px`);

  let currentScroll = 0;
  while (currentScroll + 1080 < totalHeight) {
    currentScroll += 800;
    await page.evaluate((y) => window.scrollTo(0, y), currentScroll);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `/tmp/citation-editor-${screenshotIndex}.png`, fullPage: false });
    console.log(`Screenshot ${screenshotIndex}: Document Preview - Scroll ${currentScroll}px`);
    screenshotIndex++;
    if (screenshotIndex > 15) break;
  }

  // === Now look for the document content area and scroll it separately ===
  console.log('\n=== Checking document content area for internal scrolling ===');

  // Look at all visible text to understand the document structure
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  console.log('Page text (first 3000 chars):\n', pageText);

  // Find the document preview content area
  const contentAreas = await page.evaluate(() => {
    const results = [];
    // Check for any element with overflow that's scrollable
    document.querySelectorAll('div, section, main, article').forEach(el => {
      const style = window.getComputedStyle(el);
      if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 20) {
        results.push({
          tag: el.tagName,
          className: (el.className || '').toString().substring(0, 150),
          id: el.id,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          textSnippet: el.textContent?.substring(0, 100)
        });
      }
    });
    return results;
  });
  console.log('\nScrollable content areas:', JSON.stringify(contentAreas, null, 2));

  // === SHOW CITATIONS BUTTON ===
  console.log('\n=== Checking for "Show Citations" button ===');
  try {
    const showCitationsBtn = page.locator('button:has-text("Show Citations")').first();
    if (await showCitationsBtn.isVisible({ timeout: 3000 })) {
      console.log('Found "Show Citations" button - clicking it...');
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      await showCitationsBtn.click();
      await page.waitForTimeout(3000);

      await page.screenshot({ path: `/tmp/citation-editor-${screenshotIndex}.png`, fullPage: false });
      console.log(`Screenshot ${screenshotIndex}: After clicking "Show Citations"`);
      screenshotIndex++;

      // Scroll down after showing citations
      currentScroll = 0;
      const newHeight = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
      while (currentScroll + 1080 < newHeight) {
        currentScroll += 800;
        await page.evaluate((y) => window.scrollTo(0, y), currentScroll);
        await page.waitForTimeout(800);
        await page.screenshot({ path: `/tmp/citation-editor-${screenshotIndex}.png`, fullPage: false });
        console.log(`Screenshot ${screenshotIndex}: Show Citations view - Scroll ${currentScroll}px`);
        screenshotIndex++;
        if (screenshotIndex > 20) break;
      }
    }
  } catch (e) {
    console.log('Show Citations button not found or not clickable');
  }

  // === REFERENCE LIST TAB ===
  console.log('\n=== REFERENCE LIST TAB ===');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  try {
    // Look for "Reference List" tab - it might have a count like "Reference List (6)"
    const refListTab = page.locator('text=/Reference List/i').first();
    if (await refListTab.isVisible({ timeout: 3000 })) {
      console.log('Found Reference List tab - clicking...');
      await refListTab.click();
      await page.waitForTimeout(3000);

      await page.screenshot({ path: `/tmp/citation-editor-${screenshotIndex}.png`, fullPage: false });
      console.log(`Screenshot ${screenshotIndex}: Reference List tab - Top`);
      screenshotIndex++;

      // Scroll down
      currentScroll = 0;
      const refHeight = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
      while (currentScroll + 1080 < refHeight) {
        currentScroll += 800;
        await page.evaluate((y) => window.scrollTo(0, y), currentScroll);
        await page.waitForTimeout(800);
        await page.screenshot({ path: `/tmp/citation-editor-${screenshotIndex}.png`, fullPage: false });
        console.log(`Screenshot ${screenshotIndex}: Reference List tab - Scroll ${currentScroll}px`);
        screenshotIndex++;
        if (screenshotIndex > 25) break;
      }

      // Check for scrollable container inside Reference List
      const refScrollable = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('div, section').forEach(el => {
          const style = window.getComputedStyle(el);
          if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 20) {
            results.push({
              className: (el.className || '').toString().substring(0, 150),
              scrollHeight: el.scrollHeight,
              clientHeight: el.clientHeight
            });
          }
        });
        return results;
      });
      console.log('Scrollable areas in Reference List:', JSON.stringify(refScrollable, null, 2));
    }
  } catch (e) {
    console.log('Reference List tab not found');
  }

  // === IN-TEXT CITATIONS PANEL ===
  console.log('\n=== IN-TEXT CITATIONS PANEL ===');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // Check for In-Text Citations section
  try {
    const inTextBtn = page.locator('button:has-text("Show Citations"), text=/In-Text Citations/i').first();
    if (await inTextBtn.isVisible({ timeout: 2000 })) {
      console.log('Found In-Text Citations element');
      await inTextBtn.click();
      await page.waitForTimeout(3000);

      await page.screenshot({ path: `/tmp/citation-editor-${screenshotIndex}.png`, fullPage: false });
      console.log(`Screenshot ${screenshotIndex}: In-Text Citations panel`);
      screenshotIndex++;
    }
  } catch (e) {
    console.log('In-Text Citations not directly clickable');
  }

  // === CHECK SEQUENCE BUTTON ===
  console.log('\n=== CHECK SEQUENCE ===');
  try {
    const checkSeqBtn = page.locator('button:has-text("Check Sequence")').first();
    if (await checkSeqBtn.isVisible({ timeout: 2000 })) {
      console.log('Found Check Sequence button');
    }
  } catch (e) {
    console.log('Check Sequence not found');
  }

  // === Detailed analysis of citation display in document ===
  console.log('\n=== CITATION DISPLAY ANALYSIS ===');

  // Switch back to Document Preview
  try {
    const docPreviewTab = page.locator('text=/Document Preview/i').first();
    if (await docPreviewTab.isVisible({ timeout: 2000 })) {
      await docPreviewTab.click();
      await page.waitForTimeout(2000);
    }
  } catch (e) {}

  // Analyze how citations appear in the document
  const citationAnalysis = await page.evaluate(() => {
    const results = {
      superscriptElements: [],
      bracketedNumbers: [],
      anchorElements: [],
      clickableElements: []
    };

    // Check for superscript elements containing numbers
    document.querySelectorAll('sup').forEach(el => {
      if (el.textContent?.match(/\d/)) {
        results.superscriptElements.push({
          text: el.textContent.trim(),
          hasLink: !!el.querySelector('a'),
          parentTag: el.parentElement?.tagName
        });
      }
    });

    // Check for bracketed citation numbers like [1,2] or [3-5]
    const allText = document.body.innerHTML;
    const bracketMatches = allText.match(/\[\d+(?:[,\-–]\s*\d+)*\]/g);
    if (bracketMatches) {
      results.bracketedNumbers = bracketMatches.slice(0, 20);
    }

    // Check for anchor elements that might be citation links
    document.querySelectorAll('a').forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.match(/^\d/) && text.length < 20) {
        results.anchorElements.push({
          text: text,
          href: el.getAttribute('href'),
          className: el.className?.substring(0, 80)
        });
      }
    });

    // Check for any clickable elements with citation-like content
    document.querySelectorAll('[onclick], [data-citation], .citation, .reference, [role="link"]').forEach(el => {
      results.clickableElements.push({
        text: el.textContent?.trim().substring(0, 50),
        tag: el.tagName,
        className: el.className?.substring(0, 80)
      });
    });

    return results;
  });
  console.log('Citation display analysis:', JSON.stringify(citationAnalysis, null, 2));

  // Get the HTML of the document content area to see how citations are rendered
  const docContentHtml = await page.evaluate(() => {
    // Look for the main document content div
    const contentEls = document.querySelectorAll('.document-preview, .document-content, [class*="preview"], [class*="content"]');
    for (const el of contentEls) {
      if (el.innerHTML.length > 200) {
        return el.innerHTML.substring(0, 5000);
      }
    }
    // Fallback: get the main content area
    const main = document.querySelector('main') || document.querySelector('[class*="main"]');
    if (main) return main.innerHTML.substring(0, 5000);
    return '';
  });
  console.log('\nDocument content HTML (first 5000 chars):\n', docContentHtml);

  console.log(`\nTotal screenshots taken: ${screenshotIndex - 1}`);
  await browser.close();
  console.log('Done!');
})();
