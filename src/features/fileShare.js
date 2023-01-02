const request = require("request");
const fs = require("fs");
const { asyncCall, getProcessResponse } = require("../helper");

module.exports = function (controller) {
  controller.on("file_share", async function (bot, message) {
    return await asyncCall(message, bot, async (channelId) => {
      try {
        if (channelId !== "slack") {
          await bot.reply(message, "Currently not supported");
          return;
        }
        const botToken = bot.api.token;
        //var destination_path = '/home/ubuntu/vision.bot';
        const destination_path = "/home/ubuntu/upload/" + message.files[0].name;
        console.log("Testing file share" + message.files[0].name);

        // the url to the file is in url_private. there are other fields containing image thumbnails as appropriate
        const url = message.files[0].url_private;

        const opts = {
          method: "GET",
          url: url,
          headers: {
            Authorization: "Bearer " + botToken, // Authorization header with bot's access token
          },
        };

        request(opts, function (err, res, body) {
          // body contains the content
          console.log("FILE RETRIEVE STATUS", res.statusCode);
        }).pipe(fs.createWriteStream(destination_path)); // pipe output to filesystem

        const img = "/home/ubuntu/upload/" + message.files[0].name;
        const response = await getProcessResponse(img);
        await bot.reply(message, `${response}`);
        await bot.reply(message, `Would you like to scan another image?`);
      } catch (ex) {
        await bot.reply(message, "Failed to process image information");
      }
    });
  });

  controller.on("web_file_share", async function (bot, message) {
    try {
      const fileStoragePlugin = controller.plugins.botFileStorage;
      if (!fileStoragePlugin || !message.attachments)
        throw new Error("File storage plugin disabled");
      const file = message.attachments[0];
      const { fileName, fileUrl } = file;
      const imagePath = `/home/ubuntu/upload/${fileName}`;
      if (file.authenticate) {
        const pathname = (new URL(fileUrl).pathname || "").substring(1);
        const fileResponse = await fileStoragePlugin.getFile(pathname);
        fs.writeFileSync(imagePath, fileResponse.Body);
      } else {
        request(
          {
            method: "GET",
            url: fileUrl,
          },
          function (err, res, body) {
            console.log("FILE RETRIEVE STATUS", res.statusCode);
          }
        ).pipe(fs.createWriteStream(imagePath)); // pipe output to filesystem
      }

      const response = await getProcessResponse(imagePath);
      await bot.reply(message, `${response}`);
      await bot.reply(message, `Would you like to scan another image?`);
    } catch (ex) {
      await bot.reply(message, "Failed to process image information");
    }
  });
};
