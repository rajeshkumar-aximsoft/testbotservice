// Import Botkit's core features
const { Botkit } = require("botkit");
const cors = require("cors");
const express = require("express");
const axios = require("axios");
var CronJob = require("cron").CronJob;
// Load process.env values from .env file
require("dotenv").config();

// Import a platform-specific adapter for web.

// const { WebAdapter } = require("botbuilder-adapter-web");
const { ReplybotWebAdapter } = require("./src/config/plugins/webAdapter");

const { BotkitCMSHelper } = require("./src/config/plugins/botkitCMS");

const { MongoDbStorage } = require("botbuilder-storage-mongodb");
const { DBStorage } = require("./src/config/plugins/dbStorage");

const { FileStorage } = require("./src/config/plugins/fileStorage");

const { validateCollection } = require("./src/helper");
const { authorizeApi, validateClientSecret } = require("./src/helper/api")();

const webAccessTokens = process.env.ACCESS_TOKENS
  ? process.env.ACCESS_TOKENS.split(/\s+/)
  : [];

let storage = null;
if (process.env.MONGO_URI) {
  storage = mongoStorage = new MongoDbStorage({
    url: process.env.MONGO_URI,
  });
}

const adapter = new ReplybotWebAdapter({});

adapter.useMessage((socket, message) => {
  if (message.action === "authenticate") {
    const { payload = {} } = message;
    socket.isAuthenticated = validateClientSecret(payload.clientSecret);
    socket.send(JSON.stringify({ isAuthenticated: socket.isAuthenticated }));
    prompt1 = "";
    return false;
  }

  return socket.isAuthenticated;
});

const controller = new Botkit({
  debug: true,
  webhook_uri: "/api/messages",
  webserver_middlewares: [cors(), express.static("public"), authorizeApi],

  adapter: adapter,

  storage,
});

if (process.env.MONGO_URI) {
  controller.usePlugin(
    new DBStorage({
      mongoUri: process.env.MONGO_URI,
      tables: ["chatHistory"],
    })
  );
}

if (
  process.env.BUCKET_NAME &&
  process.env.IAM_USER_KEY &&
  process.env.IAM_USER_SECRET
) {
  controller.usePlugin(
    new FileStorage({
      bucketName: process.env.BUCKET_NAME,
      userKey: process.env.IAM_USER_KEY,
      userSecret: process.env.IAM_USER_SECRET,
    })
  );
}

if (process.env.CMS_URI) {
  controller.usePlugin(
    new BotkitCMSHelper({
      cms_uri: process.env.CMS_URI,
      uri: process.env.CMS_URI,
      token: process.env.CMS_TOKEN,
    })
  );
}

controller.ready(() => {
  // make public/index.html available as localhost/index.html
  // by making the /public folder a static/public asset
  controller.publicFolder("/", __dirname + "/src/web-client/public");

  console.log("Chat with me: http://localhost:" + (process.env.PORT || 3000));

  controller.loadModules(__dirname + "/src/features");
  /* catch-all that uses the CMS to trigger dialogs */

  controller.on("message,direct_message", async (bot, message) => {
    let results = false;
    if (process.env.CMS_URI) {
      results = await controller.plugins.cms.testTrigger(bot, message);
    }
    bot.reply(message, results);
    if (results !== false) {
      // do not continue middleware!
      return false;
    }
    cmsStatusMessage = "";
    return;
  });
});

controller.webserver.get("/", async (req, res) => {
  res.send(`Reply bot running on the port ${process.env.PORT}`);
});

controller.webserver.post("/saveconversation", async (req, res) => {
  try {
    const data = req.body;
    const dbStorage = controller.plugins.botDB;
    if (data["user"] && dbStorage) {
      const resp = await dbStorage.storage.chatHistory.save(data);
      res.send("Message saved successfully");
    } else {
      res.send("Unable to save data");
    }
  } catch (err) {
    res.status(500);
    res.send(err.message);
  }
});

controller.webserver.post("/getconversation", async (req, res) => {
  try {
    const { channelId, user } = req.body;
    let chat = [];

    const dbStorage = controller.plugins.botDB;
    if (dbStorage) {
      const chatHistory = await dbStorage.storage.chatHistory.find({
        user,
        channelId,
      });

      if (validateCollection(chatHistory)) {
        chat = chatHistory.reduce((chats, val) => {
          chats = chats.concat(val.chat);
          return chats;
        }, []);
      }
    }
    res.json(chat);
  } catch (err) {
    res.status(500);
    res.send(err);
  }
});

controller.webserver.post("/uploadFile", async function (req, res) {
  try {
    const fileStoragePlugin = controller.plugins.botFileStorage;
    if (!fileStoragePlugin) throw new Error("Failed to upload");
    const responseData = await fileStoragePlugin.uploadToS3(req);
    const params = responseData.Location.split("/");
    return res.status(200).send({
      fileUrl: responseData.Location,
      fileName: params[params.length - 1],
      authenticate: true,
      fileStorage: "aws/s3bucket",
    });
  } catch (ex) {
    console.log("ex --> ", ex);
    res.status(500);
    res.send(ex);
  }
});

controller.webserver.get("/fileAccess", async function (req, res) {
  try {
    const fileStoragePlugin = controller.plugins.botFileStorage;
    const url = req.query.url;
    const pathname = (new URL(url).pathname || "").substring(1);
    const file = await fileStoragePlugin.getFile(pathname);
    res.write(file.Body);
    res.end();
  } catch (ex) {
    res.status(500);
    res.send(ex);
  }
});
