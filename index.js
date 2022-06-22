// main file with maybe website?
// but also combining the modules (sorry, I like it the oop way)

const Pixels = require('./pixels.js');
const Router = require('./router.js');
const port = (process.argv[2]) ? process.argv[2] : 3000;

const Colors = require("./colors.js");
const colors = new Colors();

const fs = require("fs");

const config = require("./config.json");//{ x: -513, y: 2780, width: 33, height: 33, fingerprint: "57406ac14592dae5e720e0e68d0f4583" };
const map = new Pixels({ file: './data/qrqrcode.png', heatmap: './data/qrqrheatmap.png', backupFile: './data/backup.json' }, config);

map.reload().then((data) => {
  const router = new Router(data, map, { map: "./data/qr.png", heatmap: "./data/heatmap.png", backups: "./data/backup.json" }, port);
  var data = { imageData: data.pixels };
  fs.writeFile("./data/generated/pixelData.json", JSON.stringify(data), (err) => {
    if (err) console.error(err);
  });
  var importances = { imageData: map.pixels.slice().map(el => {return {coords: el.coords, importance: el.importance }}) };
  fs.writeFile("./data/generated/heatMapData.json", JSON.stringify(importances), (err) => {
    if (err) console.error(err);
  });
});
map.on("reload", (map) => { // occurs when the map is reloaded due to a reconnect of the eventStream
  // TODO: Update router
  // TODO: Maybe update files...
});
