'use strict';
const internals = {};
const Config = require('../../../config');
const Schema = require('../../models/schema');

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
        projectName: Config.get('/projectName')
      });
    }
  });

  server.route({
    method: 'GET',
    path: '/schemas/{id}',
    config: {
      auth: {
        strategy: 'session',
        scope: ['root','admin']
      }
    },
    handler: function (request, reply) {

      Schema.findById(request.params.id, (err, document) => {

        if (err) {
          return reply(err);
        }

        return reply.view('schemas/edit', {
          user: request.auth.credentials.user,
          projectName: Config.get('/projectName'),
          document
        });
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
