// module to analyze maps, problems, priorities, etc.
const EventEmitter = require('events');
var sizeOf = require('image-size');
var Jimp = require('jimp');
const Scraper = require("pixelcanvas-scraper");
const { Worker } = require("worker_threads");
const EnumColor = require("./colors.js");
const fs = require("fs");

class TacticsManager {
  constructor(tactics) {
    this.tactics = tactics;

    this.tacticsENUM = [
      { name: "column", id: 5},
      { name: "random", id: 6}
    ]
    this.tacticsId = this.tacticsENUM.find(el => el.name == this.tactics);
    this.tacticsId = (this.tacticsId) ? this.tacticsId.id : null;
  }

  reorderByTactics(jobs) {
    if (this.tacticsId == 5 || null) return jobs;

    let groups = {};
    jobs.forEach(job => {
      if (!groups[job.id]) return groups[job.id] = [job];
      groups[job.id].push(job);
    });


  }
}

class ImportanceAnalyzer {
  constructor(heatmap, color, opts) {
    this.heatmap = heatmap;
    this.color = color;
    this.opts = opts;

    this.colored = [];
    this.pixels = [];
    this.changeRates = [];

    this.scraper = new Scraper(this.opts.fingerprint, { x: this.opts.x, y: this.opts.y, w: this.opts.w, h: this.opts.hs });
    this.eventEmitter = new EventEmitter();

    this.importances = [];

    this.start = new Date();

    setInterval(() => {
      this.rateUpdate((new Date()).getTime() - this.start.getTime());
    }, 2000);

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

  importanceSorter(a, b) { // bigger first
    if (a.importance > b.importance) { return -1; }
    if (a.importance < b.importance) { return 1; }
    return 0;
  }
  importanceSorterReversed(a, b) { // smaller first
    if (a.importance < b.importance) { return -1; }
    if (a.importance > b.importance) { return 1; }
    return 0;
  }

  getImportantByHeatmap() {
    if (!this.colored.length) { return []; }
    this.colored.forEach((pixel, i) => {
      let importance = 255 + (pixel.color / Jimp.rgbaToInt(this.color.r, this.color.g, this.color.b, 255) * 20);
      this.importances.push({ x: pixel.x, y: pixel.y, importance: importance, heatmapImp: importance });
    });
    this.importances.sort(this.importanceSorter);
    console.log(this.importances[0]);
    return this.importances;
  }
  rateSorter(a, b) {
    if (a.rate > b.rate) { return -1; }
    if (a.rate < b.rate) { return 1; }
    return 0;
  }
  rateSorterReversed(a, b) {
    if (a.rate < b.rate) { return -1; }
    if (a.rate > b.rate) { return 1; }
    return 0;
  }

  rateUpdate(time) {
    this.changeRates = this.changeRates.map(el => { el.rate = el.changes / time; el.time = time; return el; });
  }

  loadBackup(file) { // TODO: Backup start time too (rates)
    return new Promise((res, rej) => {
      fs.readFile(file, "utf8", (err, data) => {
        if (err) { rej(err); return; }
        if (JSON.parse(data).version == 1) { this.importances = JSON.parse(data).data; res(this.importances); return; }
        this.importances = (JSON.parse(data).data.importances) ? JSON.parse(data).data.importances : [];
        this.changeRates = (JSON.parse(data).data.changeRates) ? JSON.parse(data).data.changeRates : [];
        //this.eventEmitter.emit("importanceUpdate", this.importances);
        res(this.importances);
      });
    });
  }

  computeRateImportances() {
    return this.changeRates.map((el, i) => { el.importance = 0.5 * (i + 1); return el; });
  }
  update(data) {
    let time = (new Date()).getTime() - this.start.getTime();
    let x = data.x - this.opts.x;
    let y = data.y - this.opts.y;
    if (!this.changeRates.find(el => el.x === x && el.y === y)) {
      this.changeRates.push({ time: time; x: x, y: y, changes: 1, rate: 1/time });
    } else {
      let index = this.changeRates.findIndex(el => el.x === x && el.y === y);
      let changes = ++this.changeRates[index].changes;
      this.changeRates[index].rate = changes / time;
      this.this.changeRates[index].time = time;
      console.log(time, changes / time);
    }
    /*if (Math.max(...this.changeRates.map(el => el.rate)) == this.changeRates[index].rate) {
        // Had an idea but forgot it... left the code if it returns :>
    }*/
    this.changeRates.sort(this.rateSorterReversed);

    // TODO: implement more efficient update algorithm
    /*
    for example:
      - just update the rates "below" the changed rate
    */
    let rateImps = this.computeRateImportances();
    for (let i = 0; i < rateImps.length; i++) {
      let index = this.importances.findIndex(el => el.x == rateImps[i].x && el.y == rateImps[i].y);
      if (index == -1) {
        this.importances.push({ x: rateImps[i].x, y: rateImps[i].y, importance: 252 + rateImps[i].importance, rateImp: rateImps[i].importance });
        continue;
      }
      if (time - rateImps[i].time > 60 * 1000) {
        this.changeRates.splice(this.changeRates.findIndex(e => e.x == rateImpts[i].x && e.y == rateImps[i].y));
        this.importances[index].importance -= this.importances[index].rateImp;
        this.importances[index].rateImp = 0;
        continue;
      }
      if (!this.importances[index].rateImp) this.importances[index].rateImp = 0;
      let oldRateImp = this.importances[index].rateImp;
      this.importances[index].rateImp = rateImps[i].importance;
      this.importances[index].importance -= oldRateImp;
      this.importances[index].importance += rateImps[i].importance;
    };

    this.eventEmitter.emit("importanceUpdate", this.importances);
    return;
  }
}

class Pixels {
  constructor(files, data) {
    let file = files.file;
    let heatmap = files.heatmap;
    let saves = files.backupFile;

    this.files = files;
    this.filePath = file;
    this.heatmap = heatmap;
    this.data = data;
    this.save = saves;

    this.x = data.x;
    this.y = data.y;
    this.width = data.width;
    this.height = data.height;
    this.fingerprint = data.fingerprint;
    this.tactics = data.tactics;

    this.pixels = [];
    this.jobs = [];
    this.processing = [];
    this.canvas = null;
    this.map = {};

    this.lastReload = new Date();
    this.reloading = false;
    this.scheduledReload = false;

    this.colors = new EnumColor();
    this.importances = new ImportanceAnalyzer(heatmap, { r: 255, g: 0, b: 0, a: 255}, { fingerprint: this.fingerprint, x: this.x, y: this.y, w: this.width, h: this.height });
    this.eventEmitter = new EventEmitter();
    this.scraper = new Scraper(this.fingerprint, { x: this.x, y: this.y, w: this.width, h: this.height });
    this.worker = new Worker("./worker/backupData.js", {});
    this.worker.onmessage = (e) => {
      console.log("An error occured while saving the data:", e);
    };

    this.importances.eventEmitter.on("importanceUpdate", (importances) => {
      importances.forEach(importance => {
        let x = importance.x;
        let y = importance.y;

        let pixel = this.pixels.findIndex(el => el.coords[0] === x && el.coords[1] === y);
        if (pixel === -1) { console.log("Something fishy is going on! <importances.on('importanceUpdate') in class Pixels>"); return; }
        this.pixels[pixel].importance = importance.importance;
        this.map[this.x + x][this.y + y].importance = importance.importance;
      });
      this.jobs = this.pixels.slice().sort(this.importances.importanceSorter);//.filter(el => this.map[el.absCoords[0]][el.absCoords[1]].isWrong);
      this.worker.postMessage({ backup: { version: 2, data: { importances: importances, rates: this.importances.changeRates } }, path: this.save }); // save to file using a worker
    });

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

  reload(isReconnect) {
    this.reloading = true;
    return new Promise(async (res, rej) => {
      this.pixels = [];
      this.processing = [];
      this.map = {};
      console.log("Loading image...");
      Jimp.read(this.filePath, (err, image) => {
        if (err) { rej(err); return; }

        this.width = image.bitmap.width;
        this.height = image.bitmap.height;

        this.image = image;

        console.log("Image loaded.");
        console.log("Loading heatmap...");

        this.importances.reload().then(() => {
          //this.pixels = this.sortByImportance(this.pixels);

          console.log("Loading importance backup...");
          this.importances.loadBackup(this.save).then(() => {
            console.log("Importance backup loaded!");

            console.log("Analyzing heatmap...");
            this.important = this.importances.getImportantByHeatmap();
            console.log("heatmap analyzed!");
            console.log("Processing importances...")

            for (let i = 0; i < this.width; i++) {
              console.log("Processed " + (((i + 1) / this.width) * 100) + "%");
              for (let j = 0; j < this.height; j++) {
                let color = this.image.getPixelColor(i, j);
                var importance = this.importances.importances.find(el => el.x === i && el.y === j);
                importance = (importance) ? importance.importance : 255;
                color = Jimp.intToRGBA(color);
                this.pixels.push({ coords: [i, j], absCoords: [parseInt(this.x) + parseInt(i), parseInt(this.y) + parseInt(j)], color: color, converted: this.colors.convertColor(color), importance: importance });
              }
            }

            console.log("Data processed!");
            console.log("Analyzing canvas...")
            this.syncPixelCanvas(isReconnect).then(() => {
              this.pixels.forEach((pixel, i) => {
                let x = pixel.absCoords[0];
                let y = pixel.absCoords[1];
                if (!this.map[x]) { this.map[x] = {}; }
                this.map[x][y] = { correct: pixel.converted, color: this.canvas.getColor(x, y), importance: pixel.importance, isWrong: this.isWrong({ coords: [x, y], color: pixel.converted }) };
              });
              console.log("Map generated!");

              //console.log(this.isWrong({ coords: [], color: }))

              this.jobs = this.pixels.slice().sort(this.importances.importanceSorter);//.filter(el => this.map[el.absCoords[0]][el.absCoords[1]].isWrong);
              console.log(this.jobs[0]);

              /*this.update(JSON.parse('{"x":-511,"y":2782,"color":{"index":0,"name":"white","rgb":[255,255,255,255]}}'));
              this.update(JSON.parse('{"x":-511,"y":2782,"color":{"index":0,"name":"white","rgb":[255,255,255,255]}}')); // Testing purposes
              this.update(JSON.parse('{"x":-511,"y":2783,"color":{"index":0,"name":"white","rgb":[255,255,255,255]}}'));*/

              res(this);
              this.reloading = false;
              this.lastReload = new Date();
              if (this.scheduledReload) {
                this.scheduledReload = false;
                this.reload(true);
              }
              if (isReconnect) { this.eventEmitter.emit("reload", this); }
            });
          }).catch((err) => console.log(err));
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
    return pixel.color.index !== this.canvas.getColor(...pixel.coords).index;
  }
  getUniqueID() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
  }

  nextJob() {
    if (this.jobs.length === 0 || this.jobs.filter(el => this.map[el.absCoords[0]][el.absCoords[1]].isWrong).length == 0) { return null; }
    let job = this.jobs.slice().filter(el => this.map[el.absCoords[0]][el.absCoords[1]].isWrong).shift();
    this.jobs.splice(this.jobs.indexOf(this.jobs.find(el => el.coords[0] == job.coords[0] && el.coords[1] == job.coords[1])), 1);
    job.id = this.getUniqueID();
    this.processing.push(job);
    setTimeout(() => {
      if (!this.map[job.absCoords[0]][job.absCoords[1]].isWrong) return;
      this.processing.splice(this.processing.indexOf(job), 1);
      this.jobs.push(job);
      this.jobs.sort(this.importances.importanceSorter);
    }, 4000);
    return job;
  }
  finish(data) {
    if (this.processing.findIndex(el => el.absCoords[0] === data.x && el.absCoords[1] === data.y) === -1) { return; }
    let finished = this.processing.filter((el) => {return el.absCoords[0] === data.x && el.absCoords[1] === data.y});
    finished.forEach(el => {
      this.processing.splice(this.processing.indexOf(el), 1);
    });
  }

  update(data) {
    let isWrong = this.isWrong({ coords: [data.x, data.y], color: data.color });
    this.map[data.x][data.y].isWrong = isWrong;
    let job = this.jobs.findIndex(el => el.absCoords[0] === data.x && el.absCoords[1] === data.y)
    let wrong = (job === -1) ? false : this.jobs[job].isWrong;
    if (job !== -1) this.jobs[job].isWrong = isWrong;
    this.jobs = this.jobs.filter(el => el.isWrong == true || el.isWrong == undefined);
    this.importances.update(data);
    if (wrong != isWrong && isWrong == true) this.eventEmitter.emit("update", this.jobs[job]);
    if (!isWrong) this.finish(data);
  }
  convertColor(rgba) {
    return this.colors.convertColor(rgba);
  }
  importanceSorter(a, b) { // bigger first
    if (a.importance > b.importance) { return -1; }
    if (a.importance < b.importance) { return 1; }
    return 0;
  }

  syncPixelCanvas(recon) {
    if (recon) return new Promise((res, rej) => res());
    return new Promise((res, rej) => {
      this.scraper.get().then((canvas) => {
        this.canvas = canvas;
        if (recon) return; // only fetch canvas on reconnect
        this.scraper.connectEventSource();
        let isInit = true;
        this.scraper.on("connectionReady", () => {
          if (!isInit) {
            if (this.reloading) {
              this.scheduledReload = true;
              return;
            }
            if (this.lastReload.getTime() + 1000 < (new Date()).getTime() && !this.scheduledReload && !this.reloading) {
              (async () => {
                this.scheduledReload = true;
                setTimeout(() => {
                  this.reload(true);
                }, 2000);
              })();
            }
          }
          isInit = false;
          res(canvas);
        });
        this.scraper.on("connectionError", (e) => {
          console.log("Error: ", e);
          console.warn("Connection to EventStream lost, scheduling reload after reconnect!")
          rej(e);
        });
        this.scraper.on("update", (data) => {
          //console.log("Canvas updated: ", data);

          this.update(data);
        });
      }).catch((e) => {

      });
    });
  }
}

module.exports = Pixels;
