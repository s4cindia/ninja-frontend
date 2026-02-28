import { chromium } from 'playwright';

const E2E_EMAIL = process.env.E2E_EMAIL;
const E2E_PASSWORD = process.env.E2E_PASSWORD;
if (!E2E_EMAIL || !E2E_PASSWORD) {
  console.error('Missing required env vars: E2E_EMAIL and E2E_PASSWORD');
  process.exit(1);
}

const MAX_SCREENSHOTS = 35;

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Step 1: Navigate to login page
  console.log('Navigating to login page...');
  await page.goto('http://localhost:5000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Take screenshot of login page
  await page.screenshot({ path: '/tmp/citation-editor-login.png', fullPage: false });
  console.log('Login page screenshot saved.');

  // Step 2: Fill in login credentials
  console.log('Logging in...');

  // Try to find email input
  const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="Email" i]').first();
  await emailInput.fill(E2E_EMAIL);

  const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
  await passwordInput.fill(E2E_PASSWORD);

  // Click login button
  const loginButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")').first();
  await loginButton.click();

  // Wait for navigation after login
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle');

  console.log('Current URL after login:', page.url());
  await page.screenshot({ path: '/tmp/citation-editor-after-login.png', fullPage: false });
  console.log('After login screenshot saved.');

  // Step 3: Navigate to citation editor
  console.log('Navigating to citation editor...');
  await page.goto('http://localhost:5000/citation/editor/3472785c-2a11-4596-aebf-f8fabe8e0190', {
    waitUntil: 'networkidle',
    timeout: 60000
  });
  await page.waitForTimeout(5000);

  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());

  // Step 4: Take screenshots while scrolling through the entire page
  let screenshotIndex = 1;

  // First screenshot at top
  await page.screenshot({ path: `/tmp/citation-editor-${screenshotIndex}.png`, fullPage: false });
  console.log(`Screenshot ${screenshotIndex} saved (top of page).`);
  screenshotIndex++;

  // Get the total scrollable height
  const totalHeight = await page.evaluate(() => {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
  });
  const viewportHeight = 1080;
  const scrollStep = 800;

  console.log(`Total page height: ${totalHeight}, viewport: ${viewportHeight}`);

  // Scroll and take screenshots
  let currentScroll = 0;
  while (currentScroll + viewportHeight < totalHeight) {
    currentScroll += scrollStep;
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), currentScroll);
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `/tmp/citation-editor-${screenshotIndex}.png`, fullPage: false });
    console.log(`Screenshot ${screenshotIndex} saved (scroll position: ${currentScroll}px).`);
    screenshotIndex++;

    // Safety limit
    if (screenshotIndex > MAX_SCREENSHOTS) {
      console.log(`Reached screenshot limit of ${MAX_SCREENSHOTS}.`);
      break;
    }
  }

  // Step 5: Now check for specific elements inside the page
  // Look for scrollable containers (the editor might use internal scrolling)
  console.log('\n--- Checking for internal scrollable containers ---');

  // Scroll back to top first
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);

  // Check for scrollable panels/containers within the page
  const scrollableContainers = await page.evaluate(() => {
    const allElements = document.querySelectorAll('*');
    const scrollable = [];
    for (const el of allElements) {
      const style = window.getComputedStyle(el);
      if ((style.overflow === 'auto' || style.overflow === 'scroll' ||
           style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight + 50) {
        scrollable.push({
          tag: el.tagName,
          className: el.className.substring(0, 100),
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          id: el.id
        });
      }
    }
    return scrollable;
  });

  console.log('Scrollable containers found:', JSON.stringify(scrollableContainers, null, 2));

  // If there are scrollable containers, scroll through the main content area
  if (scrollableContainers.length > 0) {
    console.log('\n--- Scrolling through internal containers ---');

    for (let i = 0; i < scrollableContainers.length; i++) {
      const container = scrollableContainers[i];
      console.log(`\nScrolling container ${i}: ${container.tag}.${container.className.substring(0, 50)}`);

      // Build a selector for this container
      let selector = container.tag.toLowerCase();
      if (container.id) {
        selector = `#${container.id}`;
      } else if (container.className) {
        const firstClass = container.className.split(' ')[0];
        if (firstClass) {
          selector = `${container.tag.toLowerCase()}.${firstClass}`;
        }
      }

      try {
        const containerEl = page.locator(selector).first();
        const containerScrollHeight = container.scrollHeight;
        const containerClientHeight = container.clientHeight;

        let containerScroll = 0;
        let containerScreenshotIndex = 1;

        while (containerScroll < containerScrollHeight - containerClientHeight) {
          containerScroll += 600;
          await page.evaluate(({ sel, scrollY }) => {
            const el = document.querySelector(sel);
            if (el) el.scrollTop = scrollY;
          }, { sel: selector, scrollY: containerScroll });

          await page.waitForTimeout(1000);
          await page.screenshot({ path: `/tmp/citation-editor-${screenshotIndex}.png`, fullPage: false });
          console.log(`Screenshot ${screenshotIndex} saved (container ${i} scroll: ${containerScroll}px).`);
          screenshotIndex++;

          if (screenshotIndex > 30) break;
        }
      } catch (e) {
        console.log(`Could not scroll container: ${e.message}`);
      }
    }
  }

  // Step 6: Check for tab elements (like "In-Text Citations", "Reference List")
  console.log('\n--- Checking for tabs ---');
  const tabs = await page.evaluate(() => {
    const tabElements = document.querySelectorAll('[role="tab"], button[class*="tab" i], a[class*="tab" i], div[class*="tab" i] > button');
    return Array.from(tabElements).map(el => ({
      text: el.textContent?.trim().substring(0, 50),
      tag: el.tagName,
      className: el.className.substring(0, 80)
    }));
  });
  console.log('Tabs found:', JSON.stringify(tabs, null, 2));

  // Click on tabs if found and take screenshots
  const tabTexts = ['In-Text Citations', 'Reference', 'References', 'Reference List', 'Citations'];
  for (const tabText of tabTexts) {
    try {
      const tab = page.locator(`text="${tabText}"`).first();
      if (await tab.isVisible({ timeout: 2000 })) {
        console.log(`\nClicking tab: ${tabText}`);
        await tab.click();
        await page.waitForTimeout(2000);

        await page.screenshot({ path: `/tmp/citation-editor-${screenshotIndex}.png`, fullPage: false });
        console.log(`Screenshot ${screenshotIndex} saved (after clicking "${tabText}" tab).`);
        screenshotIndex++;

        // Scroll this tab's content too
        const innerScroll = await page.evaluate(() => {
          const scrollables = document.querySelectorAll('[role="tabpanel"], div[class*="panel"]');
          for (const el of scrollables) {
            if (el.scrollHeight > el.clientHeight + 50) {
              return { found: true, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
            }
          }
          return { found: false };
        });

        if (innerScroll.found) {
          let tabScroll = 0;
          while (tabScroll < innerScroll.scrollHeight - innerScroll.clientHeight) {
            tabScroll += 600;
            await page.evaluate((scrollY) => {
              const scrollables = document.querySelectorAll('[role="tabpanel"], div[class*="panel"]');
              for (const el of scrollables) {
                if (el.scrollHeight > el.clientHeight + 50) {
                  el.scrollTop = scrollY;
                  break;
                }
              }
            }, tabScroll);
            await page.waitForTimeout(1000);
            await page.screenshot({ path: `/tmp/citation-editor-${screenshotIndex}.png`, fullPage: false });
            console.log(`Screenshot ${screenshotIndex} saved (tab "${tabText}" scroll: ${tabScroll}px).`);
            screenshotIndex++;
            if (screenshotIndex > MAX_SCREENSHOTS) break;
          }
        }
      }
    } catch (e) {
      console.warn(`Tab interaction skipped: ${e.message}`);
    }
  }

  // Step 7: Check for citation links specifically
  console.log('\n--- Checking for citation links ---');
  const citationLinks = await page.evaluate(() => {
    // Look for elements that might be citation references
    const links = document.querySelectorAll('a[href*="cite"], a[href*="ref"], a[class*="citation"], span[class*="citation"], sup a, .reference-link, [data-citation]');
    return Array.from(links).slice(0, 20).map(el => ({
      text: el.textContent?.trim().substring(0, 50),
      tag: el.tagName,
      href: el.getAttribute('href')?.substring(0, 80),
      className: el.className?.substring(0, 80)
    }));
  });
  console.log('Citation links found:', JSON.stringify(citationLinks, null, 2));

  // Also check for parenthetical citation patterns in text
  const citationPatterns = await page.evaluate(() => {
    const body = document.body.innerText;
    const matches = body.match(/\(\d+(?:,\s*\d+)*\)/g);
    return matches ? matches.slice(0, 20) : [];
  });
  console.log('Citation patterns in text:', citationPatterns);

  console.log(`\nTotal screenshots taken: ${screenshotIndex - 1}`);

  console.log('Done!');
  } finally {
    await browser.close();
  }
})();
