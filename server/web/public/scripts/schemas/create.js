var DropSheet = function DropSheet(opts) {
  if (!opts) {
    opts = {};
  }
  var nullfunc = function () {
  };
  if (!opts.errors) {
    opts.errors = {};
  }
  if (!opts.handle_file) {
    opts.handle_file = handleFile;
  }
  if (!opts.errors.badfile) {
    opts.errors.badfile = nullfunc;
  }
  if (!opts.errors.pending) {
    opts.errors.pending = nullfunc;
  }
  if (!opts.errors.failed) {
    opts.errors.failed = nullfunc;
  }
  if (!opts.errors.large) {
    opts.errors.large = nullfunc;
  }
  if (!opts.on) {
    opts.on = {};
  }
  if (!opts.on.workstart) {
    opts.on.workstart = nullfunc;
  }
  if (!opts.on.workend) {
    opts.on.workend = nullfunc;
  }
  if (!opts.on.sheet) {
    opts.on.sheet = nullfunc;
  }
  if (!opts.on.wb) {
    opts.on.wb = nullfunc;
  }

  var rABS = typeof FileReader !== 'undefined' && typeof FileReader.prototype !== 'undefined' && typeof FileReader.prototype.readAsBinaryString !== 'undefined';
  // var useworker = typeof Worker !== 'undefined';
  var pending = false;

  // Various functions for reading in, parsing.
  function readFile(files) {

    var i, f;
    for (i = 0; i !== files.length; ++i) {
      f = files[i];
      var reader = new FileReader();

      reader.onload = function (e) {
        var data = e.target.result;

        var wb, arr = false;
        var readtype = {type: rABS ? 'binary' : 'base64'};
        if (!rABS) {
          arr = fixData(data);
          data = btoa(arr);
        }

        function doit() {
          try {
            opts.on.workstart();

            wb = XLSX.read(data, readtype);
            opts.on.workend(processWB(wb, 'XLSX'));
          } catch (e) {
            opts.errors.failed(e);
          }
        }

        if (e.target.result.length > 500000) {
          opts.errors.large(e.target.result.length, function (e) {
            if (e) {
              doit();
            }
          });
        } else {
          doit();
        }
      };
      if (rABS) {
        reader.readAsBinaryString(f);
      } else {
        reader.readAsArrayBuffer(f);
      }
    }
  }

  // Helper method for array buffer read-in.
  function fixData(data) {
    var o = '', l = 0, w = 10240;
    for (; l < data.byteLength / w; ++l) {
      o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w, l * w + w)));
    }
    o += String.fromCharCode.apply(null, new Uint8Array(data.slice(o.length)));
    return o;
  }


  // Parses workbook for relevant cells.
  function processWB(wb, type) {

    // Process first worksheet only by default.

    /* TODO: find better way to differentiate workbook types - ie BU format vs other format? */

    var processed_data = new Object();

    // Tables all on one sheet.
    if (wb.SheetNames.length < 3) {
      processed_data = processWSOnly(wb.Sheets[wb.SheetNames[0]]);

      console.log(processed_data);

    } else {

      // Otherwise this is a multisheet workbook.
      for (var sheetidx = 0; sheetidx < wb.SheetNames.length; sheetidx++) {
        var current_sheet = wb.Sheets[wb.SheetNames[sheetidx]];

        var sheet_name = wb.SheetNames[sheetidx];

        var sheet_output = processWSMultiSheet(current_sheet, sheet_name, []);
        if (!sheet_output) {
          continue;
        }

        processed_data[sheet_name] = sheet_output;

      }
    }

    //console.log(processed_data);

    const cols = ['Location', 'Identifier', 'Analyte', 'Value'];

    opts.on.sheet(processed_data, cols);

    return false;
  }

  /*
  Main function called for each sheet.
   **/

  function processWSOnly(ws) {

    const sheet_arr = XLSX.utils.sheet_to_json(ws, {header: 1});

    var row_info = new Object();

    row_info = findTypeRowsUsingTitles(sheet_arr, row_info);

    row_info = findMiscHeaders(sheet_arr, row_info);

    row_info = findWellRows(sheet_arr, row_info);

    //row_info = findAnalyteRows(sheet_arr, row_info);

    // Names of special columns on the spreadsheet.
    const well_header_name = 'Location';
    const analyte_header_name = 'Sample';

    // Build up object.

    var formatted_data = new Object();
    var entry;

    // Process each table.

    for (var r = 0; r < row_info.table_rows.length; r++) {

      // Row/column for identifier.
      var identifier_coordinates = row_info['table_rows'][r]['identifier_coordinates'];

      var table_type = row_info['table_rows'][r]['type'];


      // For each table, loop through rows.

      var table_object = [];

      // Table does not have identifier column; this table will not be output and can be ignored.
      if (!identifier_coordinates) {
        continue;
      }


      for (var i = row_info['table_rows'][r].start; i <= row_info['table_rows'][r].end; i++) {

        // Ignore blank rows.
        if (numEntries(sheet_arr[i]) === 0) {
          continue;
        }

        // Ignore the header row.
        if (identifier_coordinates['r'] === i) {
          continue;
        }


        // Row of table may contain well coordinates.
        var row_well_coordinates = getWellCoordinates(row_info['well_coordinates'], i);


        // Obtain list of possibly valid analytes for the table, ignoring certain words that are blacklisted.
        var blacklist = ['Location', 'Sample', 'TotalEvents', 'Total Events', 'Reagent', 'Analyte', 'Analyte:', 'UserId', 'Location', 'Date', 'Status', 'Message', 'DilutionFactor', 'Dilution Factor'];
        var analyte_list = new Object();

        analyte_list = getAnalyteList(sheet_arr, analyte_list, identifier_coordinates['r'], blacklist);

        // Table does not have analyte-based info; this table will not be output and can be ignored.
        if (analyte_list === undefined || analyte_list['analyte_list'] === undefined || analyte_list['analyte_list'].length === 0) {
          continue;
        }

        for (var j = 0; j < analyte_list['analyte_list'].length; j++) {
          var analyte_name = analyte_list['analyte_list'][j].analyte;
          var analyte_col = analyte_list['analyte_list'][j].c;

          entry = new Object();
          entry['Analyte'] = analyte_name;
          var cell_val = sheet_arr[i][analyte_col];


          entry['Value'] = convertValue(cell_val);

          if (row_well_coordinates.r !== -1) {
            entry['Location'] = sheet_arr[i][row_well_coordinates.c];
          }

          if (identifier_coordinates !== null) {
            entry['Identifier'] = sheet_arr[i][identifier_coordinates['c']];
          }

          table_object.push(entry);

        }

      }

      formatted_data[table_type] = table_object;
    }

    return formatted_data;
  }

  function processWSMultiSheet(ws, sheet_name, formatted_data) {

    const sheet_arr = XLSX.utils.sheet_to_json(ws, {header: 1});

    var row_info = new Object();

    // Look for sheet name in the sheet to define it as a valid sheet for parsing.
    // If not, return early.
    if (!checkSheet(sheet_arr, sheet_name)) {
      return false;
    }

    // Then look for wells to define the table header row (row w/o analyte names, but has other header labels).


    row_info = findWellRowsMS(sheet_arr, row_info);

    // Go two rows above to look for the row for the analytes.

    const table_body_start = row_info['well_coordinates'][0]['r'];
    row_info = getAnalyteList(sheet_arr, row_info, table_body_start - 2, []);

    // Get identifier names from 'Type' column.
    const identifier_col_name = 'Type';
    const identifier_col_ind = findColumnOf(sheet_arr, identifier_col_name);


    // Columns determined by analyte list.
    // Relevant rows determined by well list.

    var cell_val;
    var cell_val_r;
    var cell_val_c;
    var entry;

    for (var i = 0; i < row_info['well_coordinates'].length; i++) {
      for (var j = 0; j < row_info['analyte_list'].length; j++) {
        cell_val_r = row_info['well_coordinates'][i].r;
        cell_val_c = row_info['analyte_list'][j].c;
        cell_val = sheet_arr[cell_val_r][cell_val_c];

        entry = new Object();

        entry['Value'] = convertValue(cell_val);

        entry['Identifier'] = sheet_arr[cell_val_r][identifier_col_ind];
        entry['Location'] = row_info['well_coordinates'][i].well;

        entry['Analyte'] = row_info['analyte_list'][j].analyte;

        formatted_data.push(entry);
        //console.log(entry);

      }
    }

    //console.log(formatted_data);

    return formatted_data;

  }

  /* Helper functions common to single and multisheet parsing. */

  function arrayMax(array) {
    return array.reduce((a, b) => Math.max(a, b));
  }

  function arrayMin(array) {
    return array.reduce((a, b) => Math.min(a, b));
  }

  function numEntries(array) {
    return array.reduce(
      function (a, b) {
        if (b !== '' && b !== null) {
          return a + 1;
        } else {
          return a;
        }
      }, -1);
  }



  // Convert value of a cell as needed.

  function convertValue(cell_val) {

    var pattern = /(<|>)\s*[0-9]+.[0-9]+/i;
    var new_val;

    // Convert type of value as needed.
    if (cell_val === '') {
      new_val = '';
    } else if (cell_val === undefined) {
      new_val = '';
    } else if (!isNaN(cell_val)) {
      // Value of cell is numeric.
      new_val = new Object({'val': Number(cell_val), 'sign': '='});

    } else if (pattern.exec(cell_val)) {
      // Value of cell has a > or < component.
      var val = cell_val.split(/<|>/)[1].trim();
      if (!isNaN(val)) {
        var sign = cell_val.indexOf('<') !== -1 ? '<' : '>';

        new_val = new Object({'val': Number(val), 'sign': sign});
      }

    } else {
      new_val = cell_val;
    }

    return new_val;

  }


  /*
   Helper functions for single sheet parsing.
    */

  function getType(row) {
    const types = [
      'Median',
      'Net MFI',
      'Count',
      'Result',
      'Range',
      'Avg Net MFI',
      'Avg Result',
      'Avg Range',
      '% CV Replicates',
      '% Recovery',
      'Comments',
      'Units',
      'Standard Expected Concentration',
      'Control Expected Concentration',
      'Control Range - Low',
      'Control Range - High',
      'Per Bead Count',
      'Analysis Types',
      'Analysis Coefficients',
      'R^2'
    ];


    for (var t = 0; t < types.length; t++) {
      for (var i = 0; i < row.length; i++) {
        if (row[i].toUpperCase() === types[t].toUpperCase()) {
          return types[t];
        }
      }
    }

    return null;
  }

  // Looks for rows containing data type of interest using known table types.
  function findTypeRowsUsingTitles(sheet_arr, row_info) {
    var table_rows = [];

    // Could hard-code search for table types if they are consistently named.

    const types = [
      'Median',
      'Net MFI',
      'Count',
      'Result',
      'Range',
      'Avg Net MFI',
      'Avg Result',
      'Avg Range',
      '% CV Replicates',
      '% Recovery',
      'Comments',
      'Units',
      'Standard Expected Concentration',
      'Control Expected Concentration',
      'Control Range - Low',
      'Control Range - High',
      'Per Bead Count',
      'Analysis Types',
      'Analysis Coefficients',
      'R^2'
    ];

    for (var i = 0; i < sheet_arr.length; i++) {
      for (var j = 0; j < sheet_arr[i].length; j++) {
        if (!sheet_arr[i][j] || sheet_arr[i][j] === '') {
          continue;
        }

        for (var t = 0; t < types.length; t++) {
          if (sheet_arr[i][j].toUpperCase() === types[t].toUpperCase()) {
            table_rows.push(i);
          }
        }
      }
    }

    // Define start and end of each table.
    var table_row_boundaries = [];

    for (var i = 0; i < table_rows.length - 1; i++) {
      //table_row_boundaries.push({ start: table_rows[i] + 1, end: table_rows[i + 1] - 1, type: sheet_arr[table_rows[i]].join().replace(/,/g, '').trim()});
      table_row_boundaries.push({
        start: table_rows[i] + 1,
        end: table_rows[i + 1] - 1,
        type: getType(sheet_arr[table_rows[i]])
      });
    }

    //table_row_boundaries.push({start: table_rows[table_rows.length - 1] + 1, end: sheet_arr.length - 1, type: sheet_arr[table_rows[table_rows.length - 1]].join().replace(/,/g, '').trim()});
    table_row_boundaries.push({
      start: table_rows[table_rows.length - 1] + 1,
      end: sheet_arr.length - 1,
      type: getType(sheet_arr[table_rows.length - 1])
    });

    row_info['table_rows'] = table_row_boundaries;

    return row_info;
  }


  // Looks for rows with table headers / table types.
  function findTypeRows(sheet_arr, row_info) {
    var table_rows = [];

    // For now, assume that having 2 non-empty entries in a row, and containing 'DataType' in a cell is valid.

    for (var i = 0; i < sheet_arr.length; i++) {
      if (numEntries(sheet_arr[i]) === 2 && sheet_arr[i].indexOf('DataType:') !== -1) {
        table_rows.push(i);
      }
    }

    // Define start and end of each table.
    var table_row_boundaries = [];

    for (var i = 0; i < table_rows.length - 1; i++) {
      table_row_boundaries.push({
        start: table_rows[i] + 1,
        end: table_rows[i + 1] - 1,
        type: sheet_arr[table_rows[i]].join().replace(/,/g, '').trim()
      });
    }

    table_row_boundaries.push({
      start: table_rows[table_rows.length - 1] + 1,
      end: sheet_arr.length - 1,
      type: sheet_arr[table_rows[table_rows.length - 1]].join().replace(/,/g, '').trim()
    });

    row_info['table_rows'] = table_row_boundaries;

    return row_info;
  }


  // Find indices of rows with well locations, and changes some table boundaries based on where well locations end.

  function findWellRows(sheet_arr, row_info) {
    var well_coordinates = [];
    var cell_val;

    for (var r = 0; r < row_info['table_rows'].length; r++) {

      var table_end = row_info['table_rows'][r].start;

      // Goes through a hypothetical 'table' and finds the new end for it.

      for (var i = row_info['table_rows'][r].start; i <= row_info['table_rows'][r].end; i++) {
        for (var j = 0; j < sheet_arr[i].length; j++) {
          cell_val = sheet_arr[i][j];
          // Check for regex match with well coordinates.
          var pattern = /\([0-9]+,[a-z][0-9]+\)/i;
          if (pattern.exec(cell_val)) {
            well_coordinates.push({r: i, c: j});
            table_end = i;
          }
        }
      }

      // If relevant, find new end for table as defined by where well coordinates appear.
      if (table_end !== row_info['table_rows'][r].start) {
        row_info['table_rows'][r].end = table_end;
      }
    }

    row_info.well_coordinates = well_coordinates;

    return row_info;
  }

  // Helper function that determines if a particular row contains valid well location.
  function getWellCoordinates(well_coordinates, row_index) {
    for (var i = 0; i < well_coordinates.length; i++) {
      if (well_coordinates[i].r === row_index) {
        return (well_coordinates[i]);
      }
    }
    return {r: -1, c: -1};
  }

  // Find rows with analytes.
  function findAnalyteRows(sheet_arr, row_info) {
    var analyte_rows_set = new Set();

    // Preset list of analytes.

    const analytes = [
      'IL-17F',
      'GM-CSF',
      'IFNg',
      'IL-10',
      'CCL20/MIP3a',
      'IL-12p70',
      'IL-13',
      'IL-15',
      'IL-17A',
      'IL-22',
      'IL-9',
      'IL-1B',
      'IL-33',
      'IL-2',
      'IL-21',
      'IL-4',
      'IL-23',
      'IL-5',
      'IL-6',
      'IL-17E/IL-25',
      'IL-27',
      'IL-31',
      'TNFa',
      'TNFb',
      'IL-28A'
    ];

    // Names of special columns on the spreadsheet.
    const well_header_name = 'Location';
    const identifier_header_name = 'Sample';

    var cell_val;

    for (var r = 0; r < row_info['table_rows'].length; r++) {

      for (var i = row_info['table_rows'][r].start; i <= row_info['table_rows'][r].end; i++) {

        for (var j = 0; j < sheet_arr[i].length; j++) {

          cell_val = sheet_arr[i][j];

          if (!cell_val || cell_val === '') {
            continue;
          }

          if (typeof cell_val === 'string') {
            cell_val = cell_val.toUpperCase().trim();
          }

          for (var b = 0; b < analytes.length; b++) {

            if (cell_val === analytes[b].toUpperCase() && (sheet_arr[i].indexOf(identifier_header_name) !== -1 || sheet_arr[i].indexOf(identifier_header_name.toUpperCase()) !== -1)) {

              analyte_rows_set.add(i);
              row_info['table_rows'][r].start = i;

              // Map analytes to col indices.
              if (!row_info['table_rows'][r]['analyte_cols']) {
                row_info['table_rows'][r]['analyte_cols'] = [];
              }

              row_info['table_rows'][r]['analyte_cols'].push({'analyte': analytes[b], 'c': j});


              // Header row index.
              row_info['table_rows'][r]['header_row'] = i;
            }
          }
        }
      }
    }

    var analyte_rows = Array.from(analyte_rows_set);
    analyte_rows.sort(function (a, b) {
      return a - b;
    });

    row_info.analyte_rows = analyte_rows;

    return row_info;
  }


  // Look for headers, such as sample, reagent etc.
  function findMiscHeaders(sheet_arr, row_info) {

    // Header names of interest.

    const well_header_name = 'Location';
    const identifier_header_name = 'Sample';

    for (var r = 0; r < row_info['table_rows'].length; r++) {
      for (var i = row_info['table_rows'][r].start; i <= row_info['table_rows'][r].end; i++) {


        for (var j = 0; j < sheet_arr[i].length; j++) {
          if (sheet_arr[i][j].trim() === identifier_header_name.trim()) {
            row_info['table_rows'][r]['identifier_coordinates'] = {r: i, c: j};
          }
        }

      }
    }

    return row_info;
  }



  /*

  Helper functions for multisheet parsing

   */


  // Function checks if sheet name is contained within sheet itself.
  function checkSheet(sheet_arr, sheet_name) {

    for (var i = 0; i < sheet_arr.length; i++) {
      if (sheet_arr[i].indexOf(sheet_name) !== -1) {
        return true;
      }
    }
    return false;
  }

  // Function that looks for row/column values of well locations.
  function findWellRowsMS(sheet_arr, row_info) {


    var well_coordinates = [];
    var cell_val;

    for (var i = 0; i < sheet_arr.length; i++) {
      for (var j = 0; j < sheet_arr[i].length; j++) {

        var pattern = /[a-z][0-9]+,[a-z][0-9]+/i;
        cell_val = sheet_arr[i][j];

        if (pattern.exec(cell_val)) {
          well_coordinates.push({r: i, c: j, well: cell_val});
        }
      }
    }

    row_info.well_coordinates = well_coordinates;

    return row_info;
  }

  // Get list of analytes and coordinates.
  // blacklist - list of cell values that should be ignored.
  function getAnalyteList(sheet_arr, row_info, row_num, blacklist) {

    var analyte_list = [];

    var cell_val;

    // Loop through analytes and strip analyte name of certain special chars.

    for (var j = 0; j < sheet_arr[row_num].length; j++) {

      cell_val = sheet_arr[row_num][j];

      if (cell_val === undefined || cell_val === '') {
        continue;
      } else {
        cell_val = cell_val.slice().trim();
      }

      var isBlacklisted = false;

      // Do not consider certain cell values to be analytes in the row.
      if (blacklist && blacklist.length > 0) {
        for (var v = 0; v < blacklist.length; v++) {

          if (cell_val === blacklist[v].trim()) {
            isBlacklisted = true;
          }
        }
      }

      if (isBlacklisted) {
        continue;
      } else {
        cell_val = cell_val.replace(/\([0-9]*\)/g, '').replace(/\s/i, '').replace(/[^a-zA-Z0-9\/]/g, '');

        analyte_list.push({analyte: cell_val, r: row_num, c: j});
      }


    }

    row_info['analyte_list'] = analyte_list;

    return row_info;
  }


  // General function to find the column index of a 'search term'.
  function findColumnOf(arr, term) {
    for (var i = 0; i < arr.length; i++) {
      for (var j = 0; j < arr[i].length; j++) {
        if (arr[i][j] && arr[i][j].trim() === term.trim()) {
          return j;
        }
      }
    }

    return -1;
  }

  // For drag-and-drop.

  function handleDrop(e) {

    if (typeof jQuery !== 'undefined') {
      e.stopPropagation();
      e.preventDefault();
      if (pending) {
        return opts.errors.pending();
      }
      // var files = e.dataTransfer.files;
      $('#drop-area').removeClass('dragenter');
      // readFile(files);
      opts.handle_file(e);
    } else {
      alertify.alert('<img src=\'/images/cancel.png\' alt=\'Error\'>Error!', 'Drag and drop not supported. Please use the \'Choose File\' button or copy-and-paste data.');
    }

  }

  function handleDragover(e) {

    if (typeof jQuery !== 'undefined') {
      e.stopPropagation();
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      $('#drop-area').removeClass('dragdefault');
      $('#drop-area').addClass('dragenter');
    } else {
      alertify.alert('<img src=\'/images/cancel.png\' alt=\'Error\'>Error!', 'Drag and drop not supported. Please use the \'Choose File\' button or copy-and-paste data.');
    }
  }

  function handleDragleave(e) {
    if (typeof jQuery !== 'undefined') {
      $('#drop-area').removeClass('dragenter');
    } else {
      alertify.alert('<img src=\'/images/cancel.png\' alt=\'Error\'>Error!', 'Drag and drop not supported. Please use the \'Choose File\' button or copy-and-paste data.');
    }
  }

  function handleClick(e) {
    if (typeof jQuery !== 'undefined') {
      $('#choose-file').click();
    } else {
      alertify.alert('<img src=\'/images/cancel.png\' alt=\'Error\'>Error!', 'Drag and drop not supported. Please use the \'Choose File\' button or copy-and-paste data.');
    }
  }

  if (opts.drop.addEventListener) {
    opts.drop.addEventListener('dragenter', handleDragover, false);
    opts.drop.addEventListener('dragleave', handleDragleave);
    opts.drop.addEventListener('dragover', handleDragover, false);
    opts.drop.addEventListener('drop', handleDrop, false);
    opts.choose.addEventListener('click', handleClick, false);
  }

  // For choosing a file using <input> (ie Choose File button).

  function handleFile(e) {
    var files;

    if (e.type === 'drop') {
      files = e.dataTransfer.files
    } else if (e.type === 'change') {
      files = e.target.files;
    }

    if (window.FileReader) {
      // FileReader is supported.
      readFile(files);
    } else {
      alertify.alert('<img src=\'/images/cancel.png\' alt=\'Error\'>Error!', 'FileReader is not supported in this browser.');
    }
  }

  if (opts.choose.addEventListener) {
    if (typeof jQuery !== 'undefined') {
      $('#choose-file').change(opts.handle_file);
    }
  }
};
