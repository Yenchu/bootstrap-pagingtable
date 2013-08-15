# bootstrap-pagingtable.js

bootstrap-pagingtable.js is a jQuery plugin for Twitter Bootstrap that renders data in a table with paging, sorting and editing.

## Requirements

* [jQuery](http://jquery.com/) v 1.8+
* [Bootstrap](http://twitter.github.com/bootstrap/index.html) v 2.2+

## Demo

[Demo site](http://samples-yenchu.rhcloud.com/pagingtable)

## Usage

Include required css and js files:

    <link href="//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.0/css/bootstrap-combined.min.css" rel="stylesheet">
    <script src="//ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min.js"></script>
    <script src="//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.0/js/bootstrap.min.js"></script>

Include pagingtable css and js files:

    <link href="bootstrap-pagingtable.css" rel="stylesheet">
    <script src="bootstrap-pagingtable.js"></script>

Create a place holder in your HTML page:

    <div><table id="sample-table" class="table table-striped table-bordered"></table></div>

Configure your table:

    var options = {
        colModels: [
            {name:'name', header:'Name', key:true, sortable:true},
            {name:'price', header:'Price', sortable:true},
            {name:'quantity', header:'Quantity', sortable:true}
        ],
        localData: {'records':[{'name':'orange', 'price':1.2, 'quantity':10}
            , {'name':'apple', 'price':2.0, 'quantity':8}
            , {'name':'banana', 'price':0.8, 'quantity':15}
            , {'name':'grape', 'price':0.4, 'quantity':30}
            , {'name':'strawberry', 'price':0.5, 'quantity':24}]},
        isPageable: true
    };

    $(function() {
        $('#sample-table').pagingtable(options);
    });

## Json Data Format

{page:0, pageSize:10, totalRecords:500, records:[{`your data`}]}

## Options

**Name**                |**Type**    |**Default**     |**Description**
------------------------|------------|----------------|---------------
colModels               |array       |null            |To configure how the table displays data and functionalities of columns.
inlineEditing           |boolean     |false           |To enable inline editing.
isMultiSelect           |boolean     |false           |To select multi-rows.
isPageable              |boolean     |false           |To make the table pageable.
loadOnce                |boolean     |false           |If `true`, data will be loaded from remote only once.
localData               |object      |null            |To load local data to table, not from remote.
pageSizeOptions         |array       |10, 20, 50      |To set how many records should be displayed in the table.
pagerLocation           |string      |bottom          |To set pager location (`top` or `bottom`).
paramNames              |object      |                |Parameter names which are used to send to remote server.
remote                  |object      |null            |Settings related to remote server.

### paramNames

`paramNames` can be changed to fix your need, default is:
{page:'page', pageSize:'pageSize', records:'records', totalRecords:'totalRecords', sort:'sort', sortDir:'sortDir'}

### colModels

**Name**                |**Type**           |**Default**     |**Description**
------------------------|-------------------|----------------|---------------
editable                |boolean            |false           |To make column editable.
editor                  |string / function  |null            |To set edit type of column.
formHidden              |boolean            |false           |To hide this column in form-editing, not used in inline-editing.
formatter               |function           |null            |To custom content of column.
header                  |string             |null            |The table header for this column.
hidden                  |boolean            |false           |To hide this column.
isHiddenField           |boolean            |false           |To use a hidden field to keep column value and send back to server after editing.
key                     |boolean            |false           |To be used as unique row id if no `name` property is `id` in data. 
name                    |string             |null            |The `name` property in data.
options                 |object             |null            |To be used to display label when column type is select, radio or checkbox.
optionsUrl              |string             |null            |Using ajax to load data to be used to display label when column type is select, radio or checkbox.
sortable                |boolean            |false           |To make this column sortable.
sorter                  |function           |null            |To custom sorting logic.
width                   |string             |null            |To set column width.

### remote

**Name**                |**Type**    |**Default**     |**Description**
------------------------|------------|----------------|---------------
url                     |string      |null            |To be used to get data from server.
params                  |string      |null            |To be used to send extra data to server.
method                  |string      |null            |To set HTTP method for `url`.
editUrl                 |string      |null            |The URL for updating data.
deleteUrl               |string      |null            |The URL for deleting data.
isRest                  |boolean     |false           |The `editUrl` and `deleteUrl` are Rest style based on `url`. It will disable `isMultiSelect`.

## Methods

.pagingtable('getSelectedRowId')

.pagingtable('getSelectedRowIds')

.pagingtable('getRowData', rowId)

.pagingtable('reload')

.pagingtable('addRow')

.pagingtable('updateRow', rowId)

.pagingtable('deleteRow', {id:'id or key column', displayColName:'column to display in confirm modal', separator:'to separate multiple IDs, default is `,`'})

## Events

**Event**               |**Parameters**     |**Description**
------------------------|-------------------|-----------------------
created                 |                   |After table is created(include header and pager).
localLoaded             |                   |Before loading data to table.
remoteLoad              |                   |Before remote loading data.
remoteLoaded            |response           |After remote loading data but before loading data to table. `response` is the response from remote server.
remoteLoadError         |jqXHR              |Remote loading failed. `response` is the response from remote server.
load                    |rowDataSet         |Before loading data to table (sorting and paging will trigger this event). `rowDataSet` is the row data array.
loaded                  |                   |After loading data to table.
clickRow                |rowId              |Click a row. `rowId` is the id of the clicked row.
dblclickRow             |rowId              |Double click a row.
contextmenuRow          |rowId              |Right click a row.
blur                    |                   |Click out of table.
add                     |form               |Before sending added row data to remote server. `form` is a jQuery object containing added data.
added                   |response           |After sending added row data to remote server. `response` is the response from remote server.
addError                |jqXHR              |Adding row failed. `response` is the response from remote server.
update                  |form               |Before sending updated row data to remote server. `form` is a jQuery object containing updated data.
updated                 |rowId, response    |After sending updated row data to remote server. `rowId` is the id of the updated row.
updateError             |rowId, jqXHR       |Updating row failed. `rowId` is the id of the updated row.
delete                  |rowId              |Before sending deleted row id to remote server. `rowId` is the id of the deleted row. If `isMultiSelect` is enabled, rowIds are joined as a string with `,` as a separator.
deleted                 |rowId, response    |After sending deleted row id to remote server.
deleteError             |rowId, jqXHR       |Deleting row failed.

=======
