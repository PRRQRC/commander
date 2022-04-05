// module to analyze maps, problems, priorities, etc.
var Jimp = require('jimp');
const EventEmitter = require('events');

class ImportanceAnalyzer {
  constructor(heatmap) {
    this.heatmap = heatmap;

    return this;
  }
}

class Pixels {
  constructor(file, heatmap) {
    this.filePath = file;
    this.heatmap = heatmap;

    this.importances = new ImportanceAnalyzer(heatmap);

    console.log("Loading image...");
    Jimp.read(file, (err, image) => {
      this.image = image;
      console.log("Image loaded.");
      console.log("Loading heatmap...");
      Jimp.read(heatmap, (err, heatmapImage) => {
        this.heatmapImage = heatmapImage;
        console.log("Heatmap loaded.");
        this.ready();
      });
    });

    this.eventEmitter = new EventEmitter();

    return this;
  }

  on(event, callback) {
    this.eventEmitter.on(event, callback);
  }
  once(event, callback) {
    this.eventEmitter.once(event, callback);
  }

  ready() {
    
    this.eventEmitter.emit("ready", this);
  }
}

module.exports = Pixels;
