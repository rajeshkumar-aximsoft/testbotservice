
const fs = require("fs");
const AWS = require("aws-sdk");
const FileType = require('file-type');
const multiparty = require('multiparty');

exports.FileStorage = class FileStorage {
  constructor(config) {
    this.name = 'Bot File Storage';
    if (!config || !config.bucketName || !config.userKey || !config.userSecret) {
      throw new Error('Need to provide aws credentials.');
    }
    this._config = config;
    this.bucketName = config.bucketName;
    this.s3bucket = new AWS.S3({
      accessKeyId: config.userKey,
      secretAccessKey: config.userSecret
    });
  }

  init(botkit) {
    this._controller = botkit;
    this._controller.addDep('botFileStorage');

    // Extend the controller object with controller.plugins.cms
    botkit.addPluginExtension('botFileStorage', this);

    this._controller.completeDep('botFileStorage');
  }

  uploadFile(buffer, name, type) {
    const params = {
      // ACL: 'public-read',
      ACL: 'private',
      Body: buffer,
      Bucket: this.bucketName,
      ContentType: type.mime,
      Key: `${name}.${type.ext}`,
    };
    return this.s3bucket.upload(params).promise();
  };


  getFile(key) {
    return this.s3bucket.getObject({
      Bucket: this.bucketName,
      Key: key
    }).promise();
  };


  getSignedUrl(key) {
    return this.s3bucket.getSignedUrl('getObject', {
      Bucket: this.bucketName,
      Key: key
    });
  };

  async uploadToS3(request) {
    return new Promise((resolve, reject) => {
      const form = new multiparty.Form();
      form.parse(request, async (error, fields, files) => {
        if (error) {
          reject(error);
        };
        try {
          const path = files.file[0].path;
          const buffer = fs.readFileSync(path);
          const type = await FileType.fromBuffer(buffer);
          const fileName = `files/file_${Date.now().toString()}`;
          const data = await this.uploadFile(buffer, fileName, type);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}
