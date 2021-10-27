const basicInfo = require("./functions/basicInfo.js");
const { floorPrice, floorPriceByUrl, floorPrices } = require("./functions/floorPrice.js");
const { offers, offersByUrl } = require("./functions/offers.js");
const rankings = require("./functions/rankings.js");

const OpenseaScraper = {
  basicInfo,
  floorPrice,
  floorPriceByUrl,
  floorPrices,
  rankings,
  offers,
  offersByUrl,
};

module.exports = OpenseaScraper;

