'use strict';

const schema = Joi.object().keys({
  name: Joi.string().required(),
  description: Joi.string().required(),
  users: Joi.string().required()
});
joiToForm('formFields',schema);

$('#update').click((event) => {
  const documentID = window.location.pathname.split('/').pop();
  event.preventDefault();
  const values = {};
  $.each($('#form').serializeArray(), (i, field) => {
    values[field.name] = field.value;
  });
  $.ajax({
    type: 'PUT',
    url: '../api/schemas/' + documentID,
    data: values,
    success: function (result) {
      window.location = '../schemas'
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    }
  });
});
