'use strict';

$(document).ready(function() {
  $('#users').select2({
    disabled: true
  });

  for(var tag of tags) {
    var newOption = new Option(tag.text, tag.id, false, false);
    $('#users').append(newOption).trigger('change');
    $('#users').val(tag.id);
  }

});

const hotSettings = {
  licenseKey: key,
  readOnly: true,
  data: data,
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
