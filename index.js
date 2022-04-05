// main file with maybe website?
// but also combining the modules (sorry, I like it the oop way)

const Pixels = require('./pixels.js');
const Router = require('./router.js');

const map = new Pixels('./data/map.png', './data/heatmap.png');

map.on("ready", (data) => {
  console.log(data);
});
