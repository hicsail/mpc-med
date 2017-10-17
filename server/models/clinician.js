'use strict';
const Joi = require('joi');

class Clinician {

  static create(userAccess) {

    return { userAccess };
  }
}


Clinician.schema = Joi.object().keys({
  userAccess: Joi.array().items(Joi.string()).required()
});


module.exports = Clinician;
