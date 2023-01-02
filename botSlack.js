// This is the main file for the starter-slack bot.
const { Botkit } = require("botkit");
const { BotkitCMSHelper } = require("./src/config/plugins/botkitCMS");

// Import a platform-specific adapter for slack.

const {
  SlackAdapter,
  SlackMessageTypeMiddleware,
  SlackEventMiddleware,
} = require("botbuilder-adapter-slack");

const { MongoDbStorage } = require("botbuilder-storage-mongodb");
const { DBStorage } = require("./src/config/plugins/dbStorage");

// Load process.env values from .env file
require("dotenv").config();

let tokenCache = {};
let userCache = {};

let storage = null;
if (process.env.MONGO_URI) {
  storage = new MongoDbStorage({
    url: process.env.MONGO_URI,
  });
}
console.log(
  "bot token 3",
  "xoxb-3240171063603-4585922425892-PM6qLSInR99i6K0jCr8xyVlc"
);

const adapter = new SlackAdapter({
  // REMOVE THIS OPTION AFTER YOU HAVE CONFIGURED YOUR APP!
  // enable_incomplete: true,

  // parameters used to secure webhook endpoint
  verificationToken: "gWTkIxXEbKNPLcZLeQR391xp",
  clientSigningSecret: "ab17de492c9705da7ffb34df761ed133",

  // auth token for a single-team app
  botToken: "xoxb-3240171063603-4585922425892-PM6qLSInR99i6K0jCr8xyVlc",

  clientId: "3240171063603.4580451420693",
  clientSecret: "7853456a7bb656c22dfabc231868f233",
  oauthVersion: "v2",

  // functions required for retrieving team-specific info
  // for use in multi-team apps
  getTokenForTeam,
  getBotUserByTeam,
});

// Use SlackEventMiddleware to emit events that match their original Slack event types.
adapter.use(new SlackEventMiddleware());

// Use SlackMessageType middleware to further classify messages as direct_message, direct_mention, or mention
adapter.use(new SlackMessageTypeMiddleware());

const controller = new Botkit({
  webhook_uri: "/api/messages",
  adapter: adapter,
  storage,
});

if (process.env.MONGO_URI) {
  controller.usePlugin(
    new DBStorage({
      mongoUri: process.env.MONGO_URI,
    })
  );
}

if (process.env.CMS_URI) {
  controller.usePlugin(
    new BotkitCMSHelper({
      uri: process.env.CMS_URI,
      token: process.env.CMS_TOKEN,
    })
  );
}

// Once the bot has booted up its internal services, you can use them to do stuff.
controller.ready(() => {
  // load traditional developer-created local custom feature modules
  controller.loadModules(__dirname + "/src/features");

  /* catch-all that uses the CMS to trigger dialogs */
  if (controller.plugins.cms) {
    controller.on(
      "message,direct_message,interactive_message",
      async (bot, message) => {
        try {
          new Promise(async () => {
            await bot.changeContext(message.reference); // important or you will get a proxy error
            return await controller.plugins.cms.testTrigger(bot, message);
          });
          return;
        } catch (ex) {
          console.log("exception in CMS trigger event --> ", ex);
        }
      }
    );
  }
});

controller.webserver.get("/", (req, res) => {
  res.send(`This app is running Botkit ${controller.version}.`);
});

controller.webserver.get("/install/auth", async (req, res) => {
  try {
    // returns access token if OAuthCode validated successfully
    const results = await controller.adapter.validateOauthCode(req.query.code);

    // Store token by team in bot state.
    tokenCache[results.team_id] = results.bot_access_token;

    // Capture team to bot id
    userCache[results.team_id] = results.bot_user_id;

    res.json("Success! Bot installed.");
  } catch (err) {
    console.error("OAUTH ERROR:", err);
    res.status(401);
    res.send(err.message);
  }
});

if (process.env.TOKENS) {
  tokenCache = JSON.parse(process.env.TOKENS);
}

if (process.env.USERS) {
  userCache = JSON.parse(process.env.USERS);
}

async function getTokenForTeam(teamId) {
  if (tokenCache[teamId]) {
    return new Promise((resolve) => {
      setTimeout(function () {
        resolve(tokenCache[teamId]);
      }, 150);
    });
  } else {
    console.error("Team not found in tokenCache: ", teamId);
  }
}

async function getBotUserByTeam(teamId) {
  if (userCache[teamId]) {
    return new Promise((resolve) => {
      setTimeout(function () {
        resolve(userCache[teamId]);
      }, 150);
    });
  } else {
    console.error("Team not found in userCache: ", teamId);
  }
}
