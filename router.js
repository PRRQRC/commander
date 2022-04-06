const ws = require("ws");
const express = require("express");
const fs = require("fs");

// the router module to handle requests, assign jobs, etc.

class Router {
  constructor(imageData) {
    this.app = express();

    this.processing = [];

    this.imageData = imageData;
    this.pixels = imageData.pixels;

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
        // TODO: Reassign jobs
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
            if (pixel) this.processing.push({ start: new Date(), data: pixel, id: socket.id });
            socket.send(JSON.stringify({ type: "job", data: pixel }));
          break;
        }
      });
    });

    this.app.get("/", (req, res) => {
      res.send(fs.readFileSync("./static/index.html", "utf8"));
    });

    return this;
  }
}

module.exports = Router;
