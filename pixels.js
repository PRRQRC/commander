// module to analyze maps, problems, priorities, etc.
const EventEmitter = require('events');
var sizeOf = require('image-size');
var Jimp = require('jimp');
const Scraper = require("pixelcanvas-scraper");

class ImportanceAnalyzer {
  constructor(heatmap, color) {
    this.heatmap = heatmap;
    this.color = color;

    this.colored = [];
    this.pixels = [];

    this.scraper = new Scraper("57406ac14592dae5e720e0e68d0f4583", { x: -513, y: 2780, w: 32, h: 32 });

    this.importances = [];

    return this;
  }

  reload() {
    return new Promise((res, rej) => {
      this.pixels = [];
      this.colored = [];
      this.importances = [];

      Jimp.read(this.heatmap, (err, image) => {
        if (err) { rej(err); return; }
        this.map = image;
        sizeOf(this.heatmap, (err, dimensions) => {
          if (err) { rej(err); return; }
          this.width = dimensions.width;
          this.height = dimensions.height;

          for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
              let color = this.map.getPixelColor(i, j);
              this.pixels.push({ x: i, y: j, color: color });
              if (!color) { continue; }
              this.colored.push({ x: i, y: j, color: color });
            }
          }

          res(image);
        });
      });
    });
  }
  sortByImportance(arr) {
    return (arr.length <= 1) ? arr : [...this.sortByImportance(arr.slice(1).filter((el) => el.importance <= arr[0].importance)), arr[0], ...this.sortByImportance(arr.slice(1).filter(el => el.importance > arr[0].importance))];
  }
  getImportant() {
    if (!this.colored.length) { return []; }
    this.colored.forEach((pixel, i) => {
      let color = Jimp.intToRGBA(pixel.color);
      let importance = Math.abs(color.r - this.color.r) + Math.abs(color.g - this.color.g) + Math.abs(color.b - this.color.b);
      this.importances.push({ x: pixel.x, y: pixel.y, importance: importance });
    });
    this.importances = this.sortByImportance(this.importances);
    return this.importances;
  }

  update() {
    
  }
}

class Pixels {
  constructor(file, heatmap) {
    this.filePath = file;
    this.heatmap = heatmap;

    this.pixels = [];

    this.importances = new ImportanceAnalyzer(heatmap, { r: 255, g: 0, b: 0, a: 255});
    this.eventEmitter = new EventEmitter();

    return this;
  }

  on(event, callback) {
    this.eventEmitter.on(event, callback);
  }
  once(event, callback) {
    this.eventEmitter.once(event, callback);
  }

  getSize(file) {
    return new Promise((res, rej) => {
      sizeOf(file, (err, dimensions) => {
        if (err) { rej(err); return; }
        res(dimensions);
      });
    });
  }

  sortByImportance(arr) {
    return (arr.length <= 1) ? arr : [...this.sortByImportance(arr.slice(1).filter((el) => el.importance <= arr[0].importance)), arr[0], ...this.sortByImportance(arr.slice(1).filter(el => el.importance > arr[0].importance))];
  }

  reload() {
    return new Promise(async (res, rej) => {
      this.pixels = [];
      console.log("Loading image...");
      Jimp.read(this.filePath, (err, image) => {
        if (err) { rej(err); return; }

        this.width = image.bitmap.width;
        this.height = image.bitmap.height;
        
        this.image = image;

        console.log("Image loaded.");
        console.log("Loading + analyzing heatmap...");

        this.importances.reload().then(() => {
          console.log("heatmap analyzed! Processing...");
          this.important = this.importances.getImportant();

          for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
              let color = this.image.getPixelColor(i, j);
              var importance = this.importances.importances.find(el => el.x === i && el.y === j);
              importance = (importance) ? importance.importance : 255;
              this.pixels.push({ coords: [i, j], color: Jimp.intToRGBA(color), importance: importance });
            }
          }

          this.pixels = this.sortByImportance(this.pixels);

          console.log("Data processed!");
          res(this);
        }).catch(e => {
          console.log("Error (Heatmap): ", e);
        });
      }).catch(e => {
        console.log("Error (Size): ", e);
      });
    });
  }

  update(data) {
    this.importances.update(data);
  }

  syncPixelCanvas() {
    return new Promise((res, rej) => {
      this.scraper.get().then(() => {
        this.scraper.connectEventSource();
        this.scraper.on("connectionReady", () => {
          res(true);
        });
        this.scraper.on("connectionError", (e) => { rej(e); });
        this.scraper.on("update", (data) => {
          this.update(data);
        });
      });
    });
  }
}

module.exports = Pixels;
