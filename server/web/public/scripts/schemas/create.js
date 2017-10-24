'use strict';

$(document).ready(function() {
  $('#users').select2({
    ajax: {
      delay: 250,
      url: '/api/select2/users',
      dataType: 'json',
      processResults: function (data) {
        var results = [];
        for(var i = 0; i < data.results.length; i++) {
          results.push({
            id: data.results[i]._id,
            text: data.results[i].name
          })
        }
        data.results = results;
        return data;
      },
      cache: true
    },
    placeholder: 'Search for a user by name or email',
    minimumInputLength: 1,
  });
});

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
  rowHeaders: ['Column Header','Column Type','Allow Blank','Example Data'],
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
  event.preventDefault();
  const values = {};
  $.each($('#form').serializeArray(), (i, field) => {
    values[field.name] = field.value;
  });
  values.users = $('#users').val();
  values.columns = hot.getData();
  $.ajax({
    type: 'POST',
    url: '../api/schemas',
    data: JSON.stringify(values),
    contentType: 'application/json',
    success: function (result) {
      window.location = '../schemas'
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    }
  });
});
