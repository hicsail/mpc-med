'use strict';

const schema = Joi.object().keys({
  name: Joi.string().required(),
  description: Joi.string().required(),
  users: Joi.string().required()
});
joiToForm('formFields',schema);

$('#create').click((event) => {
  event.preventDefault();
  const values = {};
  $.each($('#form').serializeArray(), (i, field) => {
    values[field.name] = field.value;
  });
  $.ajax({
    type: 'POST',
    url: '../api/schemas',
    data: values,
    success: function (result) {
      window.location = '../schemas'
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    }
  });
});
