'use strict';
const Schema = require('../../../server/models/schema');
const Code = require('code');
const Config = require('../../../config');
const Lab = require('lab');


const lab = exports.lab = Lab.script();
const mongoUri = Config.get('/hapiMongoModels/mongodb/uri');
const mongoOptions = Config.get('/hapiMongoModels/mongodb/options');


lab.experiment('Schema Class Methods', () => {

  lab.before((done) => {

    Schema.connect(mongoUri, mongoOptions, (err, db) => {

      done(err);
    });
  });


  lab.after((done) => {

    Schema.deleteMany({}, (err, count) => {

      Schema.disconnect();

      done(err);
    });
  });


  lab.test('it returns a new instance when create succeeds', (done) => {

    Schema.create(
      'name',
      'description',
      'userId',
      'users',
      (err, result) => {

        Code.expect(err).to.not.exist();
        Code.expect(result).to.be.an.instanceOf(Schema);

        done();
      });
  });


  lab.test('it returns an error when create fails', (done) => {

    const realInsertOne = Schema.insertOne;
    Schema.insertOne = function () {

      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();

      callback(Error('insert failed'));
    };

    Schema.create(
      'name',
      'description',
      'userId',
      'users',
      (err, result) => {

        Code.expect(err).to.be.an.object();
        Code.expect(result).to.not.exist();

        Schema.insertOne = realInsertOne;

        done();
      });
  });
});
