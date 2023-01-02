const monk = require('monk');

/**
 * botkit-storage-mongo - MongoDB driver for Botkit
 *
 * @param  {Object} config Must contain a mongoUri property and May contain a mongoOptions
 *  object containing mongo options (auth,db,server,...).
 * @return {Object} A storage object conforming to the Botkit storage interface
 */
exports.DBStorage = class DBStorage {
  constructor(config) {
    /**
     * Example mongoUri is:
     * 'mongodb://test:test@ds037145.mongolab.com:37145/slack-bot-test'
     * or
     * 'localhost/mydb,192.168.1.1'
     */
    this.name = 'Bot DB Storage';
    if (!config || !config.mongoUri) {
      throw new Error('Need to provide mongo address.');
    }
    this._config = config;
    this.storage = {};
    this.databaseName = config.databaseName || 'botkit-storage';

    this._db = monk(`${config.mongoUri}/${this.databaseName}`, config.mongoOptions);

    this._db.catch(function (err) {
      throw new Error(err)
    });

  }

  init(botkit) {
    this._controller = botkit;
    this._controller.addDep('botDB');

    // Extend the controller object with controller.plugins.cms
    botkit.addPluginExtension('botDB', this);


    const tables = ['teams', 'channels', 'users'];
    // if config.tables, add to the default tables
    this._config.tables && this._config.tables.forEach(function (table) {
      if (typeof table === 'string') tables.push(table);
    });
    tables.forEach(zone => {
      this.storage[zone] = this.getStorage(this._db, zone);
    });
    this._controller.completeDep('botDB');
  }

  /**
   * Creates a storage object for a given "zone", i.e, teams, channels, or users
   *
   * @param {Object} db A reference to the MongoDB instance
   * @param {String} zone The table to query in the database
   * @returns {{get: get, save: save, all: all, find: find}}
   */
  getStorage(db, zone) {
    const table = db.get(zone);

    return {
      get: function (id, cb) {
        return table.findOne({ id: id }, cb);
      },
      save: function (data, cb) {
        return table.findOne({ email: data.email }).then(object => {
          if (object) {
            return table.findOneAndUpdate({
              email: data.email
            }, data, {
              upsert: true,
              returnNewDocument: true
            }, cb);
          } else {
            return table.insert(data, {}, cb);
          }
        });
      },
      all: function (cb) {
        return table.find({}, cb);
      },
      find: function (data, cb) {
        return table.find(data, cb);
      }
    };
  }
}
