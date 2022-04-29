const ws = require("ws");
const express = require("express");
const fs = require("fs");
var WebSocketServer = ws.Server;
const http = require("http");

const Pixels = require("./pixels.js");

// the router module to handle requests, assign jobs, etc.

class Router {
  constructor(imageData, paths) {
    this.app = express();

    this.processing = [];
    this.clients = {};

    this.imageData = imageData;
    this.pixels = this.sortByImportance(imageData.pixels.slice());
    this.jobs = [];

    this.paths = paths;
    this.imageAnalyzer = new Pixels({ file: paths.map, heatmap: paths.heatmap, backupFile: paths.backups }, { x: -513, y: 2780, width: 33, height: 33, fingerprint: "57406ac14592dae5e720e0e68d0f4583" });
    this.imageAnalyzer.on("update", (job) => {
      console.log("Wrong pixel placed!");
    });
    
    this.connectionToken = "|,JDF%:tgi^?opX2`:2zAUTv8J8u@=";

    this.server = this.app.listen(process.env.PORT || 3000); // TODO: return to 3000
    this.wsServer = new WebSocketServer({
      server: this.server,
      path: "/api/ws",
      verifyClient: (info, cb) => {
        var token = Buffer.from(info.req.headers.token, "base64").toString();
        if (this.connectionToken !== token) {cb(false, 401, "Unauthorized"); return;}
        cb(true);
      }
    });

    this.wsServer.on("connection", (socket) => {
      console.log("Private rick connected!");
      socket.on("close", () => {
        console.log("Private rick disconnected!");
      });

      socket.on("message", (data) => {
        this.processActions(socket, data);
      });
    });

    this.app.get("/", (req, res) => {
      res.sendFile(__dirname + "/static/index.html");
    })
    
    return this;
  }
  getUniqueID() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
  }
 
  processActions(socket, data) {
    try {
      data = JSON.parse(data);
    } catch (e) {
      socket.send(JSON.stringify({ type: "error", error: "Invalid JSON" }));
      return;
    }

    switch (data.action.toLowerCase()) {
      case "getjob":
        console.log("Client requested a job");
      break;
      case "ping":
        socket.send(JSON.stringify({ type: "pong", id: data.socketId }));
      break;
      default:
        socket.send(JSON.stringify({ type: "error", error: "Invalid action" }));
      break;
    }
  }

  sortByTime(arr) {
    return (arr.length <= 1) ? arr : [...this.sortByTime(arr.slice(1).filter((el) => el.start.getTime() >= arr[0].start.getTime())), arr[0], ...this.sortByTime(arr.slice(1).filter(el => el.start.getTime() < arr[0].start.getTime()))];
  }
  sortByImportance(arr) {
    return (arr.length <= 1) ? arr : [...this.sortByImportance(arr.slice(1).filter((el) => el.importance >= arr[0].importance)), arr[0], ...this.sortByImportance(arr.slice(1).filter(el => el.importance < arr[0].importance))];
  }

  finish(jobId) {
    const job = this.processing.find((job) => job.jobId === jobId);
    if (!job) return;
    this.pixels.push(job.data);
    this.processing.splice(this.processing.indexOf(job), 1);
    this.pixels = this.sortByImportance(this.pixels);
  }
  cleanUp() {
    console.log("Checking " + this.processing.length + " unfinished jobs...");

    const unfinished = this.processing.filter((job) => {
      return (new Date() - job.start) < 60000; // 60000 == 1 minute; remove every job that has been running for more than 6 minutes without completing
    });


    unfinished.forEach((job) => {
      this.pixels.push(job.data);
      this.processing.splice(this.processing.indexOf(job), 1);
    });

    this.processing = this.sortByTime(this.processing);
  }

  handleDisconnect(socket) {
    if (!socket.id) return;

    const jobs = this.processing.filter((job) => job.id === socket.id);
    jobs.forEach((job, i) => {
      this.pixels.push(job.data);
      this.processing.splice(i, 1);
    });

    this.pixels = this.sortByImportance(this.pixels);
    this.processing = this.sortByTime(this.processing);
  }
}

module.exports = Router;
