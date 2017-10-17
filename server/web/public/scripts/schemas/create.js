'use strict';

const schema = Joi.object().keys({
  name: Joi.string().required(),
  description: Joi.string().required(),
  users: Joi.string().required()
});
joiToForm('formFields',schema);

const hotSettings = {
  licenseKey: key,
  data: [
    ['Column Header',''],
    ['Column Type',''],
    ['Example Row',''],
  ],
  stretchH: 'last',
  colHeaders: true,
  filters: true,
  dropdownMenu: true,
  manualColumnMove: true,
  manualColumnResize: true,
  cells: function(row, column) {
    var cellMeta = {};
    if (column !== 0 && row === 1) {
      cellMeta.type = 'dropdown';
      cellMeta.source = ['Text', 'Numeric', 'Checkbox', 'Date', 'Time'];
    }
    if(column === 0) {
      cellMeta.readOnly = true;
    }
    return cellMeta;
  }
};
var hotElement = document.querySelector('#hot');
var hot = new Handsontable(hotElement, hotSettings);

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
