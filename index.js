const { chromium } = require("playwright");
const validPageTypes = ['newest', 'front', 'newcomments', 'ask', 'show', 'jobs'];

async function saveHackerNewsArticles(pageType) {
  // Validate user input
  if (!validPageTypes.includes(pageType)) {
    throw new Error(`Invalid page type. Choose one of: ${validPageTypes.join(', ')}`);
  }

  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Go to Hacker News page based on user choice
  await page.goto(`https://news.ycombinator.com/${pageType}`);

  // Extract the timestamps of the first 100 articles
  const articles = await page.$$eval('.athing', (nodes) => {
    return nodes.slice(0, 100).map(node => {
      const subtext = node.nextElementSibling.querySelector('.subtext');
      const time = subtext ? subtext.querySelector('span.age').getAttribute('title') : null;
      return time;
    });
  });

  // Convert timestamps to Date objects
  const dates = articles.map(time => new Date(time)).filter(date => !isNaN(date));

  // Check if dates are sorted from newest to oldest
  let sorted = true;
  for (let i = 1; i < dates.length; i++) {
    if (dates[i] > dates[i - 1]) {
      sorted = false;
      break;
    }
  }

  // Inject styled message element
  await page.evaluate((sorted) => {
    const message = createStyledMessage(sorted);
    document.body.appendChild(message);

    function createStyledMessage(sorted) {
      const container = document.createElement('div');
      container.id = 'messageContainer';
      Object.assign(container.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '20px',
        border: '2px solid #333',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        textAlign: 'center',
      });

      const messageText = document.createElement('p');
      messageText.innerText = sorted
        ? "The first 100 articles are sorted from newest to oldest."
        : "The first 100 articles are NOT sorted from newest to oldest.";
      messageText.style.marginBottom = '10px';

      const closeButton = document.createElement('button');
      closeButton.innerText = 'Close';
      Object.assign(closeButton.style, {
        padding: '5px 10px',
        backgroundColor: '#333',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      });
      closeButton.addEventListener('click', () => {
        container.remove();
      });

      container.appendChild(messageText);
      container.appendChild(closeButton);

      return container;
    }
  }, sorted);

  // Keep the browser open to allow time for the message to be read
  await page.waitForTimeout(60000); // Wait for 60 seconds

  // Close browser
  await browser.close();
}

async function choosePageType(validPageTypes) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    readline.question(`Choose a Hacker News page type (${validPageTypes.join(', ')}): `, (pageType) => {
      readline.close();
      resolve(pageType);
    });
  });
}

(async () => {
  const chosenPageType = await choosePageType(validPageTypes);

  if (!validPageTypes.includes(chosenPageType)) {
    console.error(`Invalid page type. Please choose one of: ${validPageTypes.join(', ')}`);
    return;
  }

  await saveHackerNewsArticles(chosenPageType);
})();
