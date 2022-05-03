const expressWs = require('express-ws');
const express = require("express");
const { URLSearchParams } = require("url");
const path = require("path");
const fetch = require("node-fetch");
const fs = require("fs");
const bodyParser = require("body-parser");
const WebSocket = require("ws");

const { clientId, clientSecret } = require("./config.json");
const { users } = require("./authenticated.json");

const mainPort = (process.argv[2]) ? process.argv[2] : 3000;
const mainSocket = require("./config.json").mainSocket.replace(/(%{port})/gi, mainPort);

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const file = fs.readFileSync("./static/index.html", "utf8");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(bodyParser.text());

const sockets = [];
 
const Token = "|,JDF%:tgi^?opX2`:2zAUTv8J8u@=";
const mainServer = new WebSocket(mainSocket, {
  headers: {
    token: Buffer.from(Token).toString("base64")
  }
});
mainServer.on("message", (data) => {
  try {
    data = JSON.parse(data);
  } catch (e) {
    socket.send(JSON.stringify({ type: "error", error: "Invalid JSON" }));
    return;
  }
  
  const socket = sockets.find(el => el.id == data.id);
  switch (data.type.toLowerCase()) {
    case "pong":
      if (socket) socket.send(JSON.stringify({ type: "pong", message: "Reply to ping.", source: "commander-astley" }));
    break;
    case "error":
      if (socket) socket.send(JSON.stringify({ type: "error", error: data.message, source: "commander-astley" }));
    break;
    case "intentional-error":
      if (socket) socket.send(JSON.stringify({ type: "intentional-error", errorCode: data.errorId, message: genErrorMessage(data.errorId), source: "commander-astley" }));
    break;
    case "nextpixel":
      if (socket) socket.send(JSON.stringify({ type: "pixel", pixel: data.job, source: "commander-astley" }));
    break;
    default:
      console.log("Invalid message type: ", data);
    break;
  }
});
mainServer.on("open", () => {
  console.log("Connection to Commander Astley established!");
});
mainServer.on("close", (e) => {
  console.log("Connection lost!", e);
})

function genErrorMessage(code) {
  switch (code) {
    case 10:
      return "There are currently no pixels to paint.";
    break;
    default:
      return "unknown problem";
    break;
  }
}

function getUniqueID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return s4() + s4() + '-' + s4();
}

expressWs(app);
app.ws("/api/ws/:t", (socket, req) => {
  // req.params.t; alternative to middle-ware
  const auth = req.params.t;
  if (users.findIndex(el => el.botToken == auth) === -1 || sockets.findIndex(el => el.token == auth) !== -1) {
    socket.send(JSON.stringify({ type: "error", error: "Token invalid or already in use!" }));
    socket.close();
    setTimeout(() => {
      if ([socket.OPEN, socket.CLOSING].includes(socket.readyState)) {
        socket.terminate();
      }
    }, 10000);
    return;
  }
  socket.id = getUniqueID();
  socket.token = auth;
  sockets.push(socket);

  socket.on("message", (data) => {
    try {
      data = JSON.parse(data);
    } catch (e) {
      socket.send(JSON.stringify({ type: "error", error: "Invalid JSON" }));
      return;
    }

    switch (data.action.toLowerCase()) {
      case "ping":
        mainServer.send(JSON.stringify({ action: "ping", socketId: socket.id }));
      break;
      case "nextpixel":
        mainServer.send(JSON.stringify({ action: "nextPixel", socketId: socket.id }));
      break;
      default:
        socket.send(JSON.stringify({ type: "error", error: "Invalid action" }));
      break;
    }
  });
  socket.on("close", () => {
    sockets.splice(sockets.indexOf(socket), 1);
  });
});



app.get("/panel", (req, res) => {
  res.sendFile(__dirname + "/static/panel.html");
});

app.on("upgrade", () => {
  console.log("upgrade");
});

function getUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return s4() + s4() + '-' + s4();
};

const tempIds = new Map();

app.get('/auth', async ({ query }, response) => {
  const { code } = query;
  try {
    const oauthResult = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `http://localhost:3000/auth`,
        scope: 'identify',
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const oauthData = await oauthResult.json();
    if (!oauthData.error) {
      const userResult = await fetch('https://discord.com/api/users/@me', {
        headers: {
          authorization: `${oauthData.token_type} ${oauthData.access_token}`,
        },
      });

      const userData = await userResult.json();
      const dom = new JSDOM(file);
      dom.window.document.querySelector("a#login-link").style = "display: none";
      if (users.findIndex(el => el.id === userData.id) === -1) {
        const token = getUUID();
        users.push({
          id: userData.id,
          username: userData.username,
          discriminator: userData.discriminator,
          avatar: userData.avatar,
          token: oauthData.access_token,
          botToken: token
        });
        saveUsers();

        dom.window.document.querySelector("p#message").textContent = "Succesfully registered your account " + userData.username + "#" + userData.discriminator + "! Bot token: " + token;
        dom.window.document.querySelector("span#token").textContent = users.find(el => el.id === userData.id).botToken;
      } else {
        dom.window.document.querySelector("p#message").textContent = "The account " + userData.username + "#" + userData.discriminator + " has already been signed up. Bot Token: " + users.find(el => el.id === userData.id).botToken;
        dom.window.document.querySelector("span#token").textContent = users.find(el => el.id === userData.id).botToken;
      }
      return response.send(dom.serialize());
    } else {
      return response.sendFile(__dirname + "/static/error.html");
    }
  } catch (e) {
    console.log(e);
  }
});

app.get("/api/tempauth/:t", (req, res) => { // just ignore it pls for now
  const permaToken = req.params.t;
  const index = users.findIndex(el => el.botToken === permaToken);
  if (index === -1) return res.send(JSON.stringify({ botToken: permaToken, error: "invalid token" }));
  if (tempIds.has(permaToken)) {
    return res.send(JSON.stringify({ botToken: permaToken, token: tempIds.get(permaToken) }));
  } else {
    const token = getUUID();
    tempIds.set(permaToken, token);
    return res.send(JSON.stringify({ botToken: permaToken, token: token }));
  }
});



app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/static/index.html'))
})

app.listen(3000, function () {
  console.log('App listening! Link: http://localhost:3000/');
});

function saveUsers() {
  const data = JSON.stringify({ users: users });
  fs.writeFile('./authenticated.json', data, (err) => {
    if (err) console.log("There was an error storing the user data: ", err);
  });
}
