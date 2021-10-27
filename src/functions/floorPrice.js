// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/**
 * Scrapes the actual floor price from the opensea website
 * mode is either "headless" (default) or "debug"
 * => run in debug mode to show browser interaction (no headless mode)
 *    and avoid closing browser when the function ends
 */
const floorPrice = async (slug, mode = "headless") => {
  const url = `https://opensea.io/collection/${slug}?search[sortAscending]=true&search[sortBy]=PRICE&search[toggles][0]=BUY_NOW`;
  return await floorPriceByUrl(url, mode);
}

/**
 * use custom url to scrape floorPrice
 */
const floorPriceByUrl = async (url, mode = "headless") => {
  const browser = await puppeteer.launch({
    headless: mode === "debug" ? false : true,
    args: ['--start-maximized'],
  });
  const page = await browser.newPage();
  await page.goto(url);

  // ...🚧 waiting for cloudflare to resolve
  await page.waitForSelector('.cf-browser-verification', {hidden: true});

  const floorPrice = await page.evaluate(() => {
    const cardsNodeList = document.querySelectorAll(".Asset--anchor .AssetCardFooter--price-amount");
    const cardsArray = Array.prototype.slice.call(cardsNodeList); // you cannot use .map on a nodeList, we need to transform it to an array
    const floorPrices = cardsArray.map(card => {
      try {
        // only fetch price in ETH
        if (!card.querySelector(".Price--eth-icon")) {
          return undefined;
        }
        const priceStr = card.querySelector(".Price--amount").textContent;
        return Number(priceStr.split(",").join("."));
      } catch(err) {
        return undefined;
      }
    }).filter(val => val); // filter out invalid (undefined) values
    // if no ETH price is found, return undefined
    if (floorPrices.length === 0) {
      return undefined;
    }
    // sometimes the order of elements is not accurate on Opensea,
    // thats why we need to minimize get the lowest value
    // REMARK: do not remove spread operator, see explenation here: https://dev.to/thebronxsystem/math-min-array-needs-spread-operator-1oe7
    const floorPrice = Math.min(...floorPrices);
    return {
      amount: floorPrice,
      currency: "ETH",
    }
  });

  if (mode !== "debug") {
    await browser.close();
  }
  return floorPrice;
}

/**
 * Extracts an array of the lowest prices for a given collection. Some remarks:
 * - returns an array of floorPrice objects
 * - only considers ETH values (ignoring other currency)
 * - returns maximum 32 objects
 * - fetches the data not from the card, but from the __wired__ variable
 * - is an alternative way of getting the same info
 */
const floorPrices = async (slug, mode = "headless") => {
  const browser = await puppeteer.launch({
    headless: mode === "debug" ? false : true,
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();
  const url = `https://opensea.io/collection/${slug}?search[sortAscending]=true&search[sortBy]=PRICE&search[toggles][0]=BUY_NOW`;
  await page.goto(url);

  // ...🚧 waiting for cloudflare to resolve
  await page.waitForSelector('.cf-browser-verification', {hidden: true});

  // extract floor prices from __wired__ variable
  return await page.evaluate(() => {
    try {
      return Object.values(__wired__.records)
        .filter(o => o.__typename === "AssetQuantityType")
        .filter(o => o.quantityInEth)
        .map(o => {
          return {
            amount: o.quantity / 1000000000000000000,
            currency: "ETH",
          }
        });
    } catch (err) {
      console.log(err);
      return undefined;
    }
  })
};

module.exports = {
  floorPrice,
  floorPriceByUrl,
  floorPrices
}
