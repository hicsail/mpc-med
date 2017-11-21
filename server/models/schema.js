'use strict';
const Joi = require('joi');
const MongoModels = require('hicsail-mongo-models');

class Schema extends MongoModels {

  static create(name, description, userId, users, columns, callback) {

    const document = {
      name,
      description,
      userId,
      users,
      columns,
      comments: [],
      approved: [],
      data: [],
      status: 0,
      time: new Date()
    };

    this.insertOne(document, (err, docs) => {

      if (err) {
        return callback(err);
      }

      callback(null, docs[0]);
    });
  }
}


Schema.collection = 'schemas';


Schema.schema = Joi.object().keys({
  _id: Joi.object(),
  name: Joi.string().required(),
  description: Joi.string().required(),
  userId: Joi.boolean().required(),
  users: Joi.array().required(),
  comments: Joi.array().required(),
  columns: Joi.array().required(),
  approved: Joi.array().required(),
  data: Joi.array().required(),
  status: Joi.number().required()
});

Schema.payload = Joi.object().keys({
  name: Joi.string().required(),
  description: Joi.string().required(),
  users: Joi.array().required(),
  columns: Joi.array().required()
});



Schema.indexes = [
  { key: { name: 1 } },
  { key: { userId: 1 } }
];


module.exports = Schema;
