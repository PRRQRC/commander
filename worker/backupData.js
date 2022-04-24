const { parentPort } = require("worker_threads");
const fs = require("fs");

parentPort.on("message", (workerData) => {
  fs.writeFile(workerData.path, JSON.stringify(workerData.backup), (err) => {
    if (err) parentPort.postMessage(err);
  });
});

