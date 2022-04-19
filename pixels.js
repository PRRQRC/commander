// module to analyze maps, problems, priorities, etc.
const { throws } = require('assert');
const EventEmitter = require('events');
var sizeOf = require('image-size');
var Jimp = require('jimp');
const Scraper = require("pixelcanvas-scraper");
const EnumColor = require("./colors.js");

class ImportanceAnalyzer {
  constructor(heatmap, color, opts) {
    this.heatmap = heatmap;
    this.color = color;
    this.opts = opts;

    this.colored = [];
    this.pixels = [];
    this.changeRates = [];


    this.scraper = new Scraper(this.opts.fingerprint, { x: -513, y: 2780, w: 32, h: 32 });
    this.eventEmitter = new EventEmitter();

    this.importances = [];

    this.start = new Date();

    return this;
  }
  on(event, callback) {
    this.eventEmitter.on(event, callback);
  }
  once(event, callback) {
    this.eventEmitter.once(event, callback);
  }

  emit(event, data) {
    this.eventEmitter.emit(event, data);
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
  rateSorter(a, b) {
    if (a.rate < b.rate) { return -1; }
    if (a.rate > b.rate) { return 1; }
    return 0;
  }

  update(data) {
    let time = this.start.getTime() - (new Date()).getTime();
    if (!this.changeRates.find(el => el.x === data.x && el.y === data.y)) { this.changeRates.push({ time: time, x: data.x, y: data.y, changes: 1, rate: 1/time }); return;}
    let index = this.changeRates.findIndex(el => el.x === data.x && el.y === data.y);
    let changes = ++this.changeRates[index].changes;
    this.changeRates[index].rate = changes / time;
    /*if (Math.max(...this.changeRates.map(el => el.rate)) == this.changeRates[index].rate) {
      Had an idea but forgot it... left the code if it returns :>
    }*/
    this.changeRates.sort(this.rateSorter);

    // TODO: importance analysis

    
    this.eventEmitter.emit("importanceUpdate", this.importances);
    return;
  }
}

class Pixels {
  constructor(file, heatmap, data) {
    this.filePath = file;
    this.heatmap = heatmap;
    this.data = data;

    this.x = data.x;
    this.y = data.y;
    this.width = data.width;
    this.height = data.height;
    this.fingerprint = data.fingerprint;

    this.pixels = [];
    this.canvas = null;
    this.map = {};

    this.colors = new EnumColor();
    this.importances = new ImportanceAnalyzer(heatmap, { r: 255, g: 0, b: 0, a: 255}, { fingerprint: this.fingerprint });
    this.eventEmitter = new EventEmitter();
    this.scraper = new Scraper(this.fingerprint, { x: this.x, y: this.y, w: this.width, h: this.height });

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

  reload(isReconnect) {
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
              color = Jimp.intToRGBA(color);
              this.pixels.push({ coords: [i, j], absCoords: [parseInt(this.x) + parseInt(i), parseInt(this.y) + parseInt(j)], color: color, converted: this.colors.convertColor(color), importance: importance });
            }
          }

          //this.pixels = this.sortByImportance(this.pixels);

          console.log("Data processed!");
          console.log("Analyzing canvas...")
          this.syncPixelCanvas().then(() => {
            this.pixels.forEach((pixel, i) => {
              let x = pixel.absCoords[0];
              let y = pixel.absCoords[1];
              if (!this.map[x]) { this.map[x] = {}; }
              this.map[x][y] = { correct: pixel.converted, color: this.canvas.getColor(x, y), importance: pixel.importance, isWrong: this.isWrong({ coords: [x, y], color: pixel.converted }) };
            });
            console.log("Map generated!");
            res(this);
            if (isReconnect) { this.eventEmitter.emit("reload", this); }
          });
        }).catch(e => {
          console.log("Error (Heatmap): ", e);
        });
      }).catch(e => {
        console.log("Error (Size): ", e);
      });
    });
  }

  /*
  {
    coords: [x, y],
    color: Color
  }
  */
  isWrong(pixel) {
    return !pixel.color.index == this.canvas.matrix[pixel.coords[0]][pixel.coords[1]].index;
  }

  update(data) {
    this.importances.update(data);
  }
  convertColor(rgba) {
    return this.colors.convertColor(rgba);
  }

  syncPixelCanvas() {
    return new Promise((res, rej) => {
      this.scraper.get().then((canvas) => {
        this.canvas = canvas;
        this.scraper.connectEventSource();
        let isInit = true;
        this.scraper.on("connectionReady", () => {
          if (!isInit) { this.reload(true); }
          isInit = false;
          res(canvas);
        });
        this.scraper.on("connectionError", (e) => { 
          console.log("Error: ", e);
          console.warn("Connection to EventStream lost, reloading after reconnect!")
          rej(e);
        });
        this.scraper.on("update", (data) => {
          this.update(data);
        });
      });
    });
  }
}

module.exports = Pixels;
