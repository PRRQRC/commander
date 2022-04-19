// main file with maybe website?
// but also combining the modules (sorry, I like it the oop way)

const Pixels = require('./pixels.js');
const Router = require('./router.js');

const Colors = require("./colors.js");
const colors = new Colors();

const fs = require("fs");

const map = new Pixels('./data/qr.png', './data/heatmap.png', { x: -513, y: 2780, width: 33, height: 33, fingerprint: "57406ac14592dae5e720e0e68d0f4583" });

map.reload().then((map) => {
  const router = new Router(map, { map: "./data/qr.png", heatmap: "./data/heatmap.png" });
  var data = { imageData: map.pixels };
  fs.writeFile("./data/generated/pixelData.json", JSON.stringify(data), (err) => {
    if (err) console.error(err);
  });
  var importances = { imageData: map.pixels.slice().map(el => {return {coords: el.coords, importance: el.importance }}) };
  fs.writeFile("./data/generated/heatMapData.json", JSON.stringify(importances), (err) => {
    if (err) console.error(err);
  });
});
map.on("reload", (map) => {
  // TODO: Update router
  // TODO: Maybe update files...
});
