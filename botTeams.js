const axios = require("axios");

// This is the main file for the mybot bot.
const { Botkit, TeamsInvokeMiddleware } = require("botkit");
const { BotkitCMSHelper } = require("./src/config/plugins/botkitCMS");

const { MongoDbStorage } = require("botbuilder-storage-mongodb");
const { DBStorage } = require("./src/config/plugins/dbStorage");

// Load process.env values from .env file
require("dotenv").config();

let storage = null;
if (process.env.MONGO_URI) {
  storage = new MongoDbStorage({
    url: process.env.MONGO_URI,
  });
}

const controller = new Botkit({
  webhook_uri: "/api/messages",
  adapterConfig: {
    appId: process.env.APP_ID,
    appPassword: process.env.APP_PASSWORD,
  },
  storage,
});

let credentialsData;
async function callTeamApi() {
  try {
    credentialsData = await axios.get(
      `${process.env.CMS_URI}api/channel/template/get/channel/credentials`,
      {
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI3Y3phcmgyM2dkbDV1eTc1cTMiLCJpYXQiOjE2NzA4MjY1ODIsImV4cCI6MTY3MTQzMTM4Mn0.7L1pp1KIMVPXI3SS-h-l9NFdpfkdtbuAlp6xMZF275s",
        },
      }
    );
    return await credentialsData.data.data[0].credentials;
  } catch (err) {
    console.log("err===============", err);
  }
}

callTeamApi();

if (process.env.MONGO_URI) {
  controller.usePlugin(
    new DBStorage({
      mongoUri: process.env.MONGO_URI,
    })
  );
}

controller.adapter.use(new TeamsInvokeMiddleware());

if (process.env.CMS_URI) {
  controller.usePlugin(
    new BotkitCMSHelper({
      cms_uri: process.env.CMS_URI,
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
    controller.on("message,direct_message", async (bot, message) => {
      try {
        const results = await controller.plugins.cms.testTrigger(bot, message);
        if (results != false) {
          return false;
        }
      } catch (ex) {
        console.log("exception in CMS trigger event --> ", ex);
      }
    });
  }
});
