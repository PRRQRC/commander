const ws = require("ws");
const express = require("express");

// the router module to handle requests, assign jobs, etc.

class Router {
  constructor() {
    this.app = express();

    this.server = this.app.listen(process.env.PORT || 3987);
    this.wsServer = new ws.Server({ server: this.server, path: '/api/ws' });

    this.wsServer.on('connection', (socket) => {
      
    });

    return this;
  }
}

module.exports = Router;
