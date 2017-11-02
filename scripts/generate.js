'use strict';
const Generate = {
  Template: {
    name: 'Template',
    pluralName: 'Templates',
    schema: 'Joi.object({\n' +
      '  _id: Joi.object(),\n' +
      '  name: Joi.string().required(),\n' +
      '  userId: Joi.boolean().required(),\n' +
      '  time: Joi.date().required()\n' +
    '});',
    payload: 'Joi.object({\n' +
    '  name: Joi.string().required()\n' +
    '});',
    defaultValues: {
      time: 'new Date()'
    },
    indexes: '[\n' +
    '  { key: { name: 1 } },\n' +
    '  { key: { userId: 1 } }\n' +
    '];',
    user: true,
    exampleCreate: [
      'name',
      'userId'
    ],
    tableVars: 'user.username user.name user.studyID name',
    tableFields: 'username name name time studyID userId',
    tableHeaders: ['Username', 'Name', 'Study ID','Template Name'],
    searchField: 'name',
    joiFormValue: [
      'joiFormValue(\'name\', \'{{document.name}}\');'
    ]
  },
  Schema: {
    name: 'Schema',
    pluralName: 'Schemas',
    schema: 'Joi.object().keys({\n' +
    '  _id: Joi.object(),\n' +
    '  name: Joi.string().required(),\n' +
    '  description: Joi.string().required(),\n' +
    '  userId: Joi.boolean().required(),\n' +
    '  users: Joi.array().required(),\n' +
    '  comments: Joi.array().required(),\n' +
    '  columns: Joi.array().required(),\n' +
    '  approved: Joi.array().required(),\n' +
    '  data: Joi.array().required(),\n' +
    '  status: Joi.number().required()\n' +
    '});',
    payload: 'Joi.object().keys({\n' +
    '  name: Joi.string().required(),\n' +
    '  description: Joi.string().required(),\n' +
    '  users: Joi.array().required()\n' +
    '});',
    defaultValues: {
      time: 'new Date()',
      comments: '[]',
      approved: '[]',
      data: '[]',
      status: '0'
    },
    indexes: '[\n' +
    '  { key: { name: 1 } },\n' +
    '  { key: { userId: 1 } }\n' +
    '];',
    user: true,
    exampleCreate: [
      'name',
      'description',
      'userId',
      'users'
    ],
    tableVars: 'user.username user.name name description status',
    tableFields: 'username name time userId description status',
    tableHeaders: ['Username', 'Name','Schema Name', 'Schema Description', 'Schema Status'],
    searchField: 'name',
    joiFormValue: [
      'joiFormValue(\'name\', \'{{document.name}}\');',
      'joiFormValue(\'description\', \'{{document.description}}\');'
    ]
  }
};

module.exports = Generate;
