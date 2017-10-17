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
    [''],
    [''],
    [false],
    [''],
  ],
  colHeaders: true,
  stretchH: 'all',
  rowHeaders: ['Column Header','Column Type','Allow Blank','Example Row'],
  manualColumnMove: true,
  comments: true,
  rowHeaderWidth: 200,
  contextMenu: ['col_left', 'col_right', 'remove_col','undo','redo','commentsAddEdit','commentsRemove'],
  cells: function(row, column) {
    var cellMeta = {};
    if (row === 1) {
      cellMeta.type = 'dropdown';
      cellMeta.source = ['Text', 'Numeric', 'Checkbox', 'Date', 'Time'];
    }
    if (row === 2) {
      cellMeta.type = 'checkbox';
    }
    cellMeta.allowEmpty = false;
    return cellMeta;
  }
};
var hotElement = document.querySelector('#hot');
var hot = new Handsontable(hotElement, hotSettings);

$('#create').click((event) => {
  event.preventDefault()
  const values = {};
  values.columns = hot.getDataAtRow(0);
  values.columns.shift();
  $.each($('#form').serializeArray(), (i, field) => {
    values[field.name] = field.value;
  });
  console.log(values);
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
