
module.exports = {
  validateCollection: (data) => !!data && data.length > 0,
  asyncCall: async function (message, bot, callback) {
    try {
      let channelId = (message.incoming_message || {}).channelId;
      if (!channelId) channelId = (message.activity || {}).channelId;
      if (channelId === 'slack') {
        if (bot) await bot.changeContext(message.reference); // important or you will get a proxy error
        callback(channelId);
      } else {
        await callback(channelId);
      }
      return;
    } catch (ex) {
      console.log('exception in controller --> ', ex);
      return;
    }
  },
  getProcessResponse: function (imgUrl) {
    const spawn = require("child_process").spawn;
    return new Promise((resolve, reject) => {
      const process = spawn('python', ["/home/ubuntu/tensorflow-image-detection-master/classify.py", imgUrl]);
      process.stdout.on('data', data => {
        resolve(data);
      });
      process.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
        reject(data);
      });
    });
  }
}