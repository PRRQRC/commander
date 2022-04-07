// main file with maybe website?
// but also combining the modules (sorry, I like it the oop way)

const Pixels = require('./pixels.js');
const Router = require('./router.js');

const Colors = require("./colors.js");
const colors = new Colors();
console.log(colors.convertColor({ a: 255, r: 255, g: 0, b: 0}));

const fs = require("fs");

const map = new Pixels('./data/map.png', './data/heatmap.png');

map.reload().then((map) => {
  const router = new Router(map, { map: "./data/map.png", heatmap: "./data/heatmap.png" });
  var data = { imageData: map.pixels };
  fs.writeFile("./data/generated/pixelData.json", JSON.stringify(data), (err) => {
    if (err) console.error(err);
  });
  var importances = { imageData: map.pixels.slice().map(el => {return {coords: el.coords, importance: el.importance }}) };
  fs.writeFile("./data/generated/heatMapData.json", JSON.stringify(importances), (err) => {
    if (err) console.error(err);
  });
});

