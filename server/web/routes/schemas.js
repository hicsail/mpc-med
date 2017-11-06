'use strict';
const internals = {};
const Config = require('../../../config');
const Env = require('dotenv');
const MongoModels = require('mongo-models');
const User = require('../../models/user');

internals.applyRoutes = function (server, next) {

  server.route({
    method: 'GET',
    path: '/schemas',
    config: {
      auth: {
        strategy: 'session'
      }
    },
    handler: function (request, reply) {

      return reply.view('schemas/index', {
        user: request.auth.credentials.user,
        projectName: Config.get('/projectName')
      });
    }
  });

  server.route({
    method: 'GET',
    path: '/schemas/create',
    config: {
      auth: {
        strategy: 'session'
      }
    },
    handler: function (request, reply) {

      return reply.view('schemas/create', {
        user: request.auth.credentials.user,
        projectName: Config.get('/projectName'),
        handsontable: Env.config().parsed.HANDSONTABLE
      });
    }
  });

  server.route({
    method: 'GET',
    path: '/schemas/{id}',
    config: {
      auth: {
        strategy: 'session'
      },
      pre: [{
        assign: 'access',
        method: function (request, reply) {

          const req = {
            method: 'GET',
            url: '/api/schemas/' + request.params.id,
            credentials: request.auth.credentials
          };

          server.inject(req, (res) => {

            reply(res);
          });
        }
      }, {
        assign: 'users',
        method: function (request, reply) {

          const objectIDs = [];

          for (const id of request.pre.access.result.users) {
            objectIDs.push(MongoModels.ObjectID(id));
          }

          User.find({
            _id: { $in: objectIDs }
          }, (err, users) => {

            if (err) {
              return reply(err);
            }

            reply(users);
          });
        }
      }]
    },
    handler: function (request, reply) {

      const document = request.pre.access.result;
      document.tags = [];

      for (const user of request.pre.users) {
        document.tags.push({
          id: user._id.toString(),
          text: user.name
        });
      }

      return reply.view('schemas/view', {
        user: request.auth.credentials.user,
        projectName: Config.get('/projectName'),
        document
      });
    }
  });

  next();
};


exports.register = function (server, options, next) {

  server.dependency(['auth'], internals.applyRoutes);

  next();
};

exports.register.attributes = {
  name: 'schemasList',
  dependencies: 'visionary'
};
