const express = require("express");
const { URLSearchParams } = require("url");
const path = require("path");
const fetch = require("node-fetch");
const fs = require("fs");
const bodyParser = require("body-parser");

const { clientId, clientSecret, port } = require("./config.json");
const { users } = require("./authenticated.json");

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const file = fs.readFileSync("./static/index.html", "utf8");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(bodyParser.text());
function config(authtoken) {
  let data = {
    headers: {
      'authorization': `Bearer ${authtoken}`
    }
  };
  return data;
};

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
      console.log(userData);
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
      } else {
        dom.window.document.querySelector("p#message").textContent = "The account " + userData.username + "#" + userData.discriminator + " has already been signed up. Bot Token: " + users.find(el => el.id === userData.id).botToken;
      }
      return response.send(dom.serialize());
    } else {
      return response.sendFile(__dirname + "/static/error.html");
    }
  } catch (e) {
    console.log(e);
  }
});

app.get("/api/tempauth/:t", (req, res) => {
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
