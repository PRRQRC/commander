const ws = require("ws");
const express = require("express");
const fs = require("fs");

// the router module to handle requests, assign jobs, etc.

class Router {
  constructor(imageData) {
    this.app = express();

    this.processing = [];

    this.imageData = imageData;
    this.pixels = this.sortByImportance(imageData.pixels.slice());

    this.server = this.app.listen(process.env.PORT || 3000);
    this.wsServer = new ws.Server({ server: this.server, path: '/api/ws' });

    this.wsServer.getUniqueID = function () {
      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
      }
      return s4() + s4() + '-' + s4();
    };

    this.wsServer.on('connection', (socket) => {
      console.log("New socket connected");

      socket.id = this.wsServer.getUniqueID();

      socket.on("close", () => {
        console.log("Client disconnected; Reassigning jobs...");
        this.handleDisconnect(socket);
      });

      socket.on("message", (msg) => {
        var data;
        try {
          data = JSON.parse(msg);
        } catch (e) {
          socket.send(JSON.stringify({ type: "error", error: "Invalid JSON" }));
          return;
        }

        switch (data.type.toLowerCase()) {
          case "getjob":
            const pixel = this.pixels.shift();
            const id = this.wsServer.getUniqueID();
            if (pixel) this.processing.push({ start: new Date(), data: pixel, id: socket.id, jobId: id });
            socket.send(JSON.stringify({ type: "job", data: { pixel: pixel, jobId: id } }));
          break;
          case "finishedJob":
            const job = data.jobId;
            this.finish(job);
          break;
          default:
            console.log("Suspicious case...", data);
          break;
        }
      });
    });

    this.cleanUpInterval = setInterval(() => {
      this.cleanUp();
    }, 20000);

    this.app.get("/", (req, res) => {
      res.send(fs.readFileSync("./static/index.html", "utf8"));
    });

    return this;
  }

  sortByImportance(arr) {
    return (arr.length <= 1) ? arr : [...this.sortByImportance(arr.slice(1).filter((el) => el.importance <= arr[0].importance)), arr[0], ...this.sortByImportance(arr.slice(1).filter(el => el.importance > arr[0].importance))];
  }

  finish(jobId) {
    const job = this.processing.find((job) => job.jobId === jobId);
    if (!job) return;
    this.pixels.push(job.data);
    this.processing.splice(this.processing.indexOf(job), 1);
    this.pixels = this.sortByImportance(this.pixels);
  }
  cleanUp() {
    const unfinished = this.processing.filter((job) => {
      return (new Date() - job.start) < 60000 * 6; // 60000 == 1 minute; remove every job that has been running for more than 6 minutes without completing
    });

    console.log("Checking " + unfinished.length + " unfinished jobs...");

    unfinished.forEach((job) => {
      this.pixels.push(job.data);
      this.processing.splice(this.processing.indexOf(job), 1);
    });
  }

  handleDisconnect(socket) {
    if (!socket.id) return;

    const jobs = this.processing.filter((job) => job.id === socket.id);
    jobs.forEach((job, i) => {
      this.pixels.push(job.data);
      this.processing.splice(i, 1);
    });

    this.pixels = this.sortByImportance(this.pixels);
  }
}

module.exports = Router;
