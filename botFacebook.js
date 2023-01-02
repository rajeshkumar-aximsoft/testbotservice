// This is the main file for the mybot bot.
const { Botkit } = require('botkit');
const { BotkitCMSHelper } = require('./src/config/plugins/botkitCMS');

const { FacebookAdapter, FacebookEventTypeMiddleware } = require('botbuilder-adapter-facebook');
const { MongoDbStorage } = require('botbuilder-storage-mongodb');
const { DBStorage } = require('./src/config/plugins/dbStorage');

// Load process.env values from .env file
require('dotenv').config();

let storage = null;
if (process.env.MONGO_URI) {
  storage = new MongoDbStorage({
    url: process.env.MONGO_URI,
  });
}

const adapter = new FacebookAdapter({
  verify_token: process.env.FACEBOOK_VERIFY_TOKEN,
  app_secret: process.env.FACEBOOK_APP_SECRET,
  access_token: process.env.FACEBOOK_ACCESS_TOKEN
});

// emit events based on the type of facebook event being received
adapter.use(new FacebookEventTypeMiddleware());

const controller = new Botkit({
  webhook_uri: '/api/messages',
  adapter: adapter,
  storage,
});

if (process.env.MONGO_URI) {
  controller.usePlugin(new DBStorage({
    mongoUri: process.env.MONGO_URI,
  }));
}

if (process.env.CMS_URI) {
  controller.usePlugin(new BotkitCMSHelper({
    cms_uri: process.env.CMS_URI,
    uri: process.env.CMS_URI,
    token: process.env.CMS_TOKEN,
  }));
}

controller.middleware.receive.use((bot, message, next) => {
  !['message_delivered', 'message_read'].includes(message.type) && next();
});

// Once the bot has booted up its internal services, you can use them to do stuff.
controller.ready(() => {

  // load traditional developer-created local custom feature modules
  // controller.loadModules(__dirname + '/src/features');

  /* catch-all that uses the CMS to trigger dialogs */
  if (controller.plugins.cms) {
      controller.on('message,direct_message,facebook_postback', async (bot, message) => {
          let results = false;
          results = await controller.plugins.cms.testTrigger(bot, message);

          if (results !== false) {
              // do not continue middleware!
              return false;
          }
      });
  }

});

controller.webserver.get('/', (req, res) => {
  res.send(`This app is running Botkit ${ controller.version }.`);
});

