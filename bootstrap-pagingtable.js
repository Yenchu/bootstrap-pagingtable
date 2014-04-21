/* ===================================================
 * bootstrap-pagingtable.js v0.3.5
 * https://github.com/Yenchu/bootstrap-pagingtable
 * =================================================== */

+function($) { "use strict";

	// PAGINGTABLE PUBLIC CLASS DEFINITION
	// ===================================

	var compName = 'pagingtable';
	
	var PagingTable = function(element, options) {
		this.init(element, options);
	};
	
	PagingTable.DEFAULTS = {
		classes: {hover:'info', highlight:'success'}
	 	, selectByCheckbox: false
		, pageSizeOptions: [10, 20, 50]
		, pagerLocation: 'bottom'
		, paramNames: {page:'page', pageSize:'pageSize', records:'records', totalRecords:'totalRecords', sort:'sort', sortDir:'sortDir'}
		, sortDir: {asc:'asc', desc:'desc'}
		, texts: {
			noDataMsg:'<br/>No Data'
			, addRowTitle:'Add Record'
			, updateRowTitle:'Update Record'
			, deleteRowTitle:'Delete Record'
			, deleteRowSubject:'<span class="text-warning"><h4>Are you sure to delete the following record(s)?</h4></span>'
			, submitButton:'Submit'
			, cancelButton:'Cancel'}
		, pagerTemplate: '<span>View {{fromRecord}} - {{toRecord}} of {{totalRecords}} {{pageSize}} per page</span><span class="pull-right">{{firstButton}}{{prevButton}} Page {{currentPage}} of {{totalPages}} {{nextButton}}{{lastButton}}</span>'
		, firstButtonTemplate: '<a class="btn btn-primary btn-sm first-page"><span class="glyphicon glyphicon-fast-backward" /></a>'
		, prevButtonTemplate: '<a class="btn btn-primary btn-sm prev-page"><span class="glyphicon glyphicon-backward" /></a>'
		, nextButtonTemplate: '<a class="btn btn-primary btn-sm next-page"><span class="glyphicon glyphicon-forward" /></a>'
		, lastButtonTemplate: '<a class="btn btn-primary btn-sm last-page"><span class="glyphicon glyphicon-fast-forward" /></a>'
		, currentPageTemplate: '<input type="text" class="input-sm current-page" size="4" maxlength="4">'
		, editingModalTemplate: '<div class="modal fade editing-modal" tabindex="-1" role="dialog" aria-hidden="true"><div class="modal-dialog"><div class="modal-content">'
			+ '<div class="modal-header">'
			+ '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>'
			+ '<h4 class="modal-title editing-title"></h4></div>'
			+ '<div class="modal-body"></div>'
			+ '<div class="modal-footer">'
			+ '<button type="button" class="btn btn-default editing-cancel" data-dismiss="modal"></button>'
			+ '<button type="button" class="btn btn-primary editing-submit" data-dismiss="modal"></button>'
			+ '</div></div></div></div>'
		, loadingSpinnerTemplate: '<div class="loading-spinner" />'
	};
		
	PagingTable.prototype.init = function(element, options) {
		this.namespace = compName;
		this.headerClassName = 'table-header';
		this.pagerClassName = 'table-pager';
		this.$element = $(element);
		this.setOptions(options);
		this.rowDataSet = [], this.selRowIds = [], this.keyName, this.editedRowId, this.newRowId, this.optionsUrlCache = {};
		this.page = 0, this.pageSize = 0, this.totalPages = 0, this.totalRecords = 0, this.sortCol, this.sortDir;
		
		this.createTable();
		
		// a flag to let user load data on demand
		if (this.options.loadingDataOnInit) {
			this.loadData();
		}
	};
	
	PagingTable.prototype.destroy = function() {
		this.$element.off('.' + this.namespace).removeData(compName).empty();
	};

	PagingTable.prototype.getOptions = function() {
		return this.options;
	};

	PagingTable.prototype.setOptions = function(newOptions) {
		this.options = $.extend(true, {}, PagingTable.DEFAULTS, newOptions);
		this.colModels = this.options.colModels || [];
		this.remote = this.options.remote || {};
		this.options.loadingDataOnInit === undefined && (this.options.loadingDataOnInit = true);
		// disable multi-select when using restful api
		this.remote.isRest && (this.options.isMultiSelect = false);
	};
	
	PagingTable.prototype.enable = function() {
		this.$element.find('.btn').removeClass('disabled');
		this.addEventHandlers();
		if (this.options.isPageable) {
			this.addPagingEventHandlers();
		}
	};
	
	PagingTable.prototype.disable = function() {
		this.$element.find('.btn').addClass('disabled');
		this.$element.off('.' + this.namespace);
	};
	
	PagingTable.prototype.createTable = function() {
		this.findKeyName();
		this.createHeader();
		this.addEventHandlers();
		
		if (this.options.isPageable) {
			this.createPager();
			this.addPagingEventHandlers();
		}
		
		var e = $.Event('created');
		this.$element.trigger(e);
	};
	
	PagingTable.prototype.findKeyName = function() {
		// find key name
		var colLen = this.colModels.length;
		for (var i = 0; i < colLen; i++) {
			var colModel = this.colModels[i];
			if (colModel.key) {
				this.keyName = colModel.name;
				break;
			}
		}
		
		// if key name not found, use 'id' as key name
		if (!this.keyName) {
			for (var i = 0; i < colLen; i++) {
				var colModel = this.colModels[i];
				if (colModel.name === 'id') {
					this.keyName = colModel.name;
					break;
				}
			}
		}
	};
	
	PagingTable.prototype.createHeader = function() {
		var colLen = this.colModels.length;
		var $tr = $('<tr/>');
		if (this.options.selectByCheckbox) {
			var selAllCheckbox = this.options.isMultiSelect ? '<input type="checkbox" class="select-all">' : '';
			$tr.append('<th>' + selAllCheckbox + '</th>');
		}
		
		for (var i = 0; i < colLen; i++) {
			var colModel = this.colModels[i];
			if (colModel.hidden) {
				continue;
			}
			
			var attrs = {name: colModel.name};
			colModel.width && (attrs.width = colModel.width);
			colModel.sortable && (attrs.style = 'cursor:pointer');

			var thContent;
			var header = colModel.header;
			if (header) {
				if (typeof header === 'function') {
					thContent = header(colModel);
				} else {
					thContent = header;
				}
			} else {
				thContent = '';
			}
			var $th = $('<th/>', attrs).append(thContent);
			$tr.append($th);
		}
		$('<thead class="' + this.headerClassName + '"/>').html($tr).appendTo(this.$element);
	};
	
	PagingTable.prototype.createPager = function() {
		var pagerElemName = this.options.pagerLocation === 'top' ? 'thead' : 'tfoot';
		var $pager = $('<' + pagerElemName + ' />', {'class': this.pagerClassName});
		
		// check pager location: thead or tfoot
		var isDropup;
		if (pagerElemName === 'thead') {
			 $pager.prependTo(this.$element);
			 isDropup = false;
		} else {
			$pager.appendTo(this.$element);
			isDropup = true;
		}
		
		var colspan = 0;
		for (var i = 0, len = this.colModels.length; i < len; i++) {
			!this.colModels[i].hidden && colspan++;
		}
		this.options.selectByCheckbox && colspan++;
		
		var tr = '<tr><td colspan="' + colspan + '">' + this.getPagerContent(this.options.pagerTemplate, isDropup) + '</td></tr>';
		$pager.html(tr);
		
		this.setPageSizeElement();
	};
	
	PagingTable.prototype.getPagerContent = function(tpl, isDropup) {
		var dropup = isDropup ? ' dropup' : '';
		tpl = tpl.replace('{{fromRecord}}', '<span class="from-record"></span>');
		tpl = tpl.replace('{{toRecord}}', '<span class="to-record"></span>');
		tpl = tpl.replace('{{totalRecords}}', '<span class="total-records"></span>');
		
		tpl = tpl.replace('{{pageSize}}', ' <div class="btn-group' + dropup + '">' 
				+ '<a class="btn dropdown-toggle page-size" data-toggle="dropdown"><span class="page-size-value"></span> <span class="caret"></span></a>'
				+ '<ul class="dropdown-menu page-size-options" role="menu"></ul></div>');
	
		tpl = tpl.replace('{{firstButton}}', '<span class="btn-group">' + this.options.firstButtonTemplate);
		tpl = tpl.replace('{{prevButton}}', this.options.prevButtonTemplate + '</span>');
		
		tpl = tpl.replace('{{currentPage}}', this.options.currentPageTemplate);
		tpl = tpl.replace('{{totalPages}}', '<span class="total-pages"></span>');
		
		tpl = tpl.replace('{{nextButton}}', '<span class="btn-group">' + this.options.nextButtonTemplate);
		tpl = tpl.replace('{{lastButton}}', this.options.lastButtonTemplate + '</span>');
		return tpl;
	};
	
	PagingTable.prototype.setPageSizeElement = function() {
		var options = this.options;
		var sizeOptions = '';
		for (var i = 0, len = options.pageSizeOptions.length; i < len; i++) {
			sizeOptions += '<li><a>' + options.pageSizeOptions[i] + '</a></li>';
		}
		this.$element.find('.page-size-options').html(sizeOptions);
	};
	
	PagingTable.prototype.loadData = function() {
		var options = this.options;
		if (options.localData) {
			this.parseData(options.localData);
			var e = $.Event('localLoaded');
			this.$element.trigger(e);
		} else {
			this.loadRemoteData();
		}
	};
	
	PagingTable.prototype.loadRemoteData = function() {
		// clear cache when loading data from remote
		this.optionsUrlCache = {};
		
		var options = this.options;
		var remote = this.remote;
		var url = remote.url;
		var type = remote.method || 'GET';
		var data = remote.params || {};
		
		if (!options.loadOnce && options.isPageable) {
			var paramNames = options.paramNames;
			data[paramNames.page] = this.page || 0;
			data[paramNames.pageSize] = this.pageSize || options.pageSizeOptions[0];
			data[paramNames.sort] = this.sortCol;
			data[paramNames.sortDir] = this.sortDir;
		}
		
		var e = $.Event('remoteLoad');
		this.$element.trigger(e);
        if (e.isDefaultPrevented()) {
        	return;
        }
		
		var that = this;
		this.startLoading();
		$.ajax({
			url: url,
			data: data,
			type: type
		}).always(function() {
			that.stopLoading();
		}).done(function(resp) {
			e = $.Event('remoteLoaded');
			e.response = resp;
			that.$element.trigger(e);
			!e.isDefaultPrevented() && that.parseData(resp);
		}).fail(function(jqXHR) {
			e = $.Event('remoteLoadError');
			e.jqXHR = jqXHR;
			that.$element.trigger(e);
			$.error('Loading data from remote failed!');
		});
	};
	
	PagingTable.prototype.startLoading = function() {
		this.disable();
		var $element = this.$element, $placeholder = $element.parent() || $(document.body);
		var $loadindSpinner = $(this.options.loadingSpinnerTemplate);
		$loadindSpinner.appendTo($placeholder);

		var w = $element.width() / 2 - $loadindSpinner.width() / 2;
		var h = $element.height() / 2 - $loadindSpinner.height() / 2;
		var x = $element.offset().left + w;
		var y = $element.offset().top + h;
		$loadindSpinner.offset({top:y, left:x});
	};
	
	PagingTable.prototype.stopLoading = function() {
		var $placeholder = this.$element.parent() || $(document.body);
		$placeholder.find('.loading-spinner').remove();
		this.enable();
	};
	
	PagingTable.prototype.parseData = function(json) {
		var options = this.options;
		var paramNames = options.paramNames;
		var rowDataSet = json[paramNames.records];
		if (!rowDataSet) {
			$.error('The json data format is incorrect!');
			return;
		}
		
		if (options.isPageable) {
			this.totalRecords = json[paramNames.totalRecords] || rowDataSet.length;
			this.pageSize = json[paramNames.pageSize] || this.pageSize || options.pageSizeOptions[0];
			this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
			this.page = json[paramNames.page] || this.page || 0;
			
			if (this.page < 0) {
				this.page = 0;
			} else if (this.page > 0 && this.page >= this.totalPages) {
				this.page = this.totalPages - 1;
			}
		}
		
		this.setRowData(rowDataSet);
		this.load();
	};
	
	PagingTable.prototype.addEventHandlers = function() {
		var that = this, $element = this.$element, options = this.options, ns = this.namespace;

		$(document).off('click.' + ns).on('click.' + ns, function(e) {
			if (that.isBlur(e)) {
				// unselect rows if not selectByCheckbox enabling
				!options.selectByCheckbox && that.removeSelectedRows();
				var e = $.Event('blur');
				that.$element.trigger(e);
			}
		});
		
		$(document).off('keyup.' + ns).on('keyup.' + ns, function(e) {
			var key = e.keyCode || e.charCode;
			if (options.inlineEditing && that.editedRowId) {
				if (key === 13) { // Enter key
					that.saveRow(that.editedRowId);
				} else if (key === 27) { // Esc key
					that.restoreRow(that.editedRowId);
				}
			}
		});
		
		$element.off('click.th.' + ns).on('click.th.' + ns, 'th', function() {
			var colName = $(this).attr('name');
			if (!colName) {
				return;
			}
			
			var colModel = that.getColModel(colName);
			if (colModel.sortable) {
				that.sort(colName);
				that.labelSorted($(this));
			}
		});
		
		$element.off('click.tr.' + ns).on('click.tr.' + ns, 'tbody tr', function(e) {
			// select row if not selectByCheckbox enabling
			if (!options.selectByCheckbox) {
				var $this = $(this);
				if (!that.isSelectedRow($this)) {
					options.isMultiSelect ? that.selectRows($this, e) : that.selectRow($this);
				} else {
					that.selectRow($this);
				}
			}
			$element.trigger({type:'clickRow', rowId:that.getRowId($(this)), orignEvent:e});
		});
		
		$element.off('dblclick.tr.' + ns).on('dblclick.tr.' + ns, 'tbody tr', function(e) {
			$element.trigger({type:'dblclickRow', rowId:that.getRowId($(this)), orignEvent:e});
		});
		
		$element.off('contextmenu.tr.' + ns).on('contextmenu.tr.' + ns, 'tbody tr', function(e) {
			$element.trigger({type:'contextmenuRow', rowId:that.getRowId($(this)), orignEvent:e});
		});
		
		$element.off('mouseenter.tr.' + ns).on('mouseenter.tr.' + ns, 'tbody tr', function() {
			$(this).addClass(options.classes.hover);
		});
		$element.off('mouseleave.tr.' + ns).on('mouseleave.tr.' + ns, 'tbody tr', function() {
			$(this).removeClass(options.classes.hover);
		});
		
		if (options.selectByCheckbox) {
			if (options.isMultiSelect) {
				$element.off('change.select-all.' + ns).on('change.select-all.' + ns, '.select-all', function(e) {
					var checked = $(this).prop('checked');
					if (checked) {
						var $rows = that.getRows();
						that.addSelectedRows($rows);
					} else {
						that.removeSelectedRows();
					}
				});
			}
			$element.off('change.select-one.' + ns).on('change.select-one.' + ns, '.select-one', function(e) {
				var $tr = $(this).parents('tr');
				var checked = $(this).prop('checked');
				if (checked) {
					if (!options.isMultiSelect) {
						that.removeSelectedRows();
					}
					that.addSelectedRow($tr);
				} else {
					that.removeSelectedRow($tr);
				}
			});
		}
	};
	
	PagingTable.prototype.addPagingEventHandlers = function() {
		var that = this, $element = this.$element, ns = this.namespace;
		
		$element.off('click.first-page.' + ns).on('click.first-page.' + ns, '.first-page', function() {
			if (that.page <= 0) {
				return;
			}
			that.page = 0;
			that.reload();
		});
		$element.off('click.prev-page.' + ns).on('click.prev-page.' + ns, '.prev-page', function() {
			if (that.page <= 0) {
				return;
			}
			that.page -= 1;
			that.reload();
		});
		$element.off('click.next-page.' + ns).on('click.next-page.' + ns, '.next-page', function() {
			if (that.page >= that.totalPages - 1) {
				return;
			}
			that.page += 1;
			that.reload();
		});
		$element.off('click.last-page.' + ns).on('click.last-page.' + ns, '.last-page', function() {
			if (that.page >= that.totalPages - 1) {
				return;
			}
			that.page = that.totalPages - 1;
			that.reload();
		});
		
		$element.off('keyup.page-changed.' + ns).on('keyup.page-changed.' + ns, '.current-page', function(e) {
			e.stopPropagation();
			var key = e.charCode || e.keyCode;
			if (key === 13) {
				var pageNo = parseInt($element.find('.current-page').val());
				if (!pageNo || pageNo === that.page + 1) {
					$element.find('.current-page').val((that.page + 1));
					return;
				}
				
				pageNo = (pageNo > that.totalPages ? that.totalPages : pageNo);
				pageNo = (pageNo < 1 ? 1 : pageNo);
				that.page = pageNo - 1;
				that.reload();
			} else if (key === 27) {
				$element.find('.current-page').val((that.page + 1));
			}
		});
		
		$element.off('click.page-size-changed.' + ns).on('click.page-size-changed.' + ns, '.page-size-options li a', function() {
			var newPageSize = parseInt($(this).text());
			if (newPageSize === that.pageSize) {
				return;
			}
			
			that.pageSize = newPageSize;
			that.totalPages = Math.ceil(that.totalRecords / that.pageSize);
			that.page = 0;
			that.reload();
		});
	};
	
	PagingTable.prototype.updatePagingButtons = function() {
		var $element = this.$element, page = this.page, totalPages = this.totalPages;
		if (page <= 0) {
			$element.find('.first-page').toggleClass('disabled', true).css('cursor', 'default');
			$element.find('.prev-page').toggleClass('disabled', true).css('cursor', 'default');
		} else {
			$element.find('.first-page').removeClass('disabled').css('cursor', 'pointer');
			$element.find('.prev-page').removeClass('disabled').css('cursor', 'pointer');
		}
		if (page >= totalPages - 1) {
			$element.find('.next-page').toggleClass('disabled', true).css('cursor', 'default');
			$element.find('.last-page').toggleClass('disabled', true).css('cursor', 'default');
		} else {
			$element.find('.next-page').removeClass('disabled').css('cursor', 'pointer');
			$element.find('.last-page').removeClass('disabled').css('cursor', 'pointer');
		}
	};

	PagingTable.prototype.updatePagingElements = function() {
		var $element = this.$element, page = this.page, totalPages = this.totalPages, pageSize = this.pageSize, totalRecords = this.totalRecords;
		$element.find('.current-page').val((page + 1));
		$element.find('.total-pages').text(totalPages);
		
		var fromRecord = page * pageSize + 1;
		var toRecord = fromRecord + pageSize - 1;
		toRecord = toRecord >= totalRecords ? totalRecords : toRecord;
		$element.find('.from-record').text(fromRecord);
		$element.find('.to-record').text(toRecord);
		$element.find('.total-records').text(totalRecords);
		
		$element.find('.page-size-value').text(pageSize);
		this.updatePagingButtons();
	};
	
	PagingTable.prototype.load = function() {
		// clear ant cached selected rows
		this.removeSelectedRows();
		
		var rowDataSet = this.getAllRowData();
		var e = $.Event('load');
		e.rowDataSet = rowDataSet;
		this.$element.trigger(e);
        if (e.isDefaultPrevented()) {
        	return;
        }
		
        var tbody = this.$element.find('tbody')[0];
        
        // clear old data if existed
		var $tbody = tbody ? $(tbody).empty() : $('<tbody/>').appendTo(this.$element);
		
		var rowLen = rowDataSet.length;
		if (rowLen > 0) {
			// update pager if pageable
			var i = 0, len = rowLen;
			if (this.options.isPageable) {
				this.updatePagingElements();
				
				i = this.page * this.pageSize;
				len = i + this.pageSize;
				(i < 0 || i >= rowLen) && (i = 0);
				(len < 1 || len > rowLen) && (len = rowLen);
			}
			
			var tbodyContent = '';
			var colLen = this.colModels.length;
			for (; i < len; i++) {
				var rowData = rowDataSet[i];
				var id = rowData[this.keyName];
				
				tbodyContent += '<tr id="' + id + '">';
				if (this.options.selectByCheckbox) {
					tbodyContent += '<td><input type="checkbox" class="select-one"></td>';
				}
				
				for (var j = 0; j < colLen; j++) {
					var colModel = this.colModels[j];
					if (colModel.hidden) {
						continue;
					}
					
					var tdContent = this.getColContent(rowData, colModel);
					tbodyContent += '<td>' + tdContent + '</td>';
				}
				tbodyContent += '</tr>';
			}
			$tbody.html(tbodyContent);
			
			var $pagingBar = $('.' + this.pagerClassName);
			$pagingBar.hasClass('hide') && $pagingBar.removeClass('hide');
		} else {
			// hide pager if no any records
			$tbody.html(this.options.texts.noDataMsg);
			$('.' + this.pagerClassName).addClass('hide');
		}
		this.$element.trigger($.Event('loaded'));
	};
	
	PagingTable.prototype.reload = function() {
		if (this.options.localData || this.options.loadOnce) {
			this.load();
		} else {
			this.loadRemoteData();
		}
	};
	
	PagingTable.prototype.sort = function(sortCol, sortDir) {
		var asc = this.options.sortDir.asc, desc = this.options.sortDir.desc;
		if (this.sortCol === sortCol) {
			this.sortDir = sortDir || this.sortDir === asc ? desc : asc;
		} else {
			this.sortCol = sortCol;
			this.sortDir = sortDir || asc;
		}
		
		if (this.options.localData || this.options.loadOnce) {
			var rowDataSet = this.getAllRowData();
			this.sortRowData(rowDataSet, this.sortCol, this.sortDir);
			this.setRowData(rowDataSet);
		}
		this.reload();
	};
	
	PagingTable.prototype.sortRowData = function(rowDataSet, sortCol, sortDir) {
		var that = this;
		var colModel = this.getColModel(sortCol);
		var sortFun;
		if (colModel.sorter) {
			sortFun = colModel.sorter;
		} else {
			sortFun = function(a, b) {
				var valA = that.getColValue(a, colModel) || '', valB = that.getColValue(b, colModel) || '';
				var options = that.getColOptions(colModel);
				if (options) {
					valA = options[valA] || valA;
					valB = options[valB] || valB;
				}
				if (valA < valB) {
					return -1;
				}
				if (valA > valB) {
					return 1;
				}
				return 0;
			};
		}

		rowDataSet.sort(function(a, b) {
			return sortDir === that.options.sortDir.desc ? -sortFun(a, b) : sortFun(a, b);
		});
	};
	
	PagingTable.prototype.labelSorted = function($th) {
		$th.parent().find('span').remove();
		var sortStyle = '';
		this.sortDir === this.options.sortDir.desc && (sortStyle = ' sort-desc');
		var label = ' <span class="caret' + sortStyle + '"></span>';
		$th.append(label);
	};
	
	PagingTable.prototype.getColModel = function(colName) {
		for (var i = 0, len = this.colModels.length; i < len; i++) {
			var colModel = this.colModels[i];
			if (colModel.name === colName) {
				return colModel;
			}
		}
		return null;
	};
	
	PagingTable.prototype.getColContent = function(rowData, colModel) {
		var colVal = this.getColValue(rowData, colModel);
		if (colModel.formatter) {
			return colModel.formatter(colVal, rowData);
		}
		
		if (colVal === undefined || colVal === null) {
			return '';
		}

		// display data with select options(key:value)
		var options = this.getColOptions(colModel);
		
		if ($.isArray(colVal)) {
			if (colVal.length < 1) {
				return '';
			}
			
			// subName is used to specify the field in sub model you want to get
			// if no subName, default is 'id' for options case, otherwise, it's 'name'
			var subName = colModel['subName'] || options ? 'id' : 'name';

			var isObj = colVal[0] instanceof Object ? true : false;
			
			var rtVals = [];
			for (var i = 0, len = colVal.length; i < len; i++) {
				// if it's object, get value from its field
				var rtVal = isObj ? colVal[i][subName] : colVal[i];
				
				// if it's options, get value by key
				if (options) {
					rtVals.push(options[rtVal] || rtVal);
				} else {
					rtVals.push(rtVal);
				}
			}
			return rtVals.join('<br/>');
		}
		
		if (options) {
			return options[colVal] || colVal;
		}
		return colVal;
	};
	
	PagingTable.prototype.getColValue = function(rowData, colModel) {
		if (colModel.name.indexOf('.') >= 0) {
			var names = colModel.name.split('.'); // eg: a.b.c
			var data = rowData[names[0]]; // eg: {b:{c:'...'}}
			// get target data recursively
			for (var i = 1, len = names.length; i < len; i++) {
				data = data[names[i]];
			}
			return data;
		} else {
			return rowData[colModel.name];
		}
	};
	
	PagingTable.prototype.getColOptions = function(colModel) {
		var options = colModel.options;
		if (!options && colModel.optionsUrl) {
			var name = colModel.name;
			var cachedOptions = this.optionsUrlCache[name];
			if (cachedOptions) {
				return cachedOptions;
			}
			
			var that = this;
			$.ajax({
				url: colModel.optionsUrl,
				async: false
			}).done(function(resp) {
				options = resp;
				that.optionsUrlCache[name] = options;
			}).fail(function() {
				$.error('Loading options data from remote failed!');
			});
		}
		return options;
	};
	
	PagingTable.prototype.getHeader = function() {
		var header = this.$element.find('.' + this.headerClassName)[0];
		return $(header);
	};
	
	PagingTable.prototype.selectRow = function($selRow) {
		this.removeSelectedRows();
		this.addSelectedRow($selRow);
	};
	
	PagingTable.prototype.selectRows = function($selRow, e) {
		if (e.ctrlKey) {
			this.addSelectedRow($selRow);
		} else if (e.shiftKey) {
			var lastSelRowId = this.getSelectedRowId();
			if (!lastSelRowId) {
				this.addSelectedRow($selRow);
				return;
			}
			
			this.removeSelectedRows();
			var currSelRowId = this.getRowId($selRow);
			
			var enabledSelect = false;
			var rowElems = this.$element.find('tbody tr');
			for (var i = 0, len = rowElems.length; i < len; i++) {
				var $row = $(rowElems[i]);
				var rowId = this.getRowId($row);
				if (rowId === lastSelRowId) {
					this.addSelectedRow($row);
					if (enabledSelect) {
						break;
					} else {
						enabledSelect = true;
						continue;
					}
				}
				if (rowId === currSelRowId) {
					this.addSelectedRow($row);
					if (enabledSelect) {
						break;
					} else {
						enabledSelect = true;
						continue;
					}
				}
				if (enabledSelect) {
					this.addSelectedRow($row);
					continue;
				}
			}
		} else {
			this.removeSelectedRows();
			this.addSelectedRow($selRow);
		}
	};
	
	PagingTable.prototype.removeSelectedRows = function() {
		if (this.selRowIds.length === 0) {
			return;
		}

		if (this.options.selectByCheckbox) {
			this.options.isMultiSelect && $('.select-all').prop('checked', false);
		}
		
		for (var i = 0, len = this.selRowIds.length; i < len; i++) {
			var selRowId = this.selRowIds[i];
			var $row = $('[id="' + selRowId + '"]');
			if (this.options.selectByCheckbox) {
				$('.select-one').prop('checked', false);
			} else {
				$row.removeClass(this.options.classes.highlight);
			}
		}
		this.selRowIds = [];
	};
	
	PagingTable.prototype.removeSelectedRow = function($row) {
		if (this.selRowIds.length === 0) {
			return;
		}

		if (this.options.selectByCheckbox) {
			this.options.isMultiSelect && $('.select-all').prop('checked', false);
		}
		
		var rowId = this.getRowId($row);
		var idx = -1;
		for (var i = 0, len = this.selRowIds.length; i < len; i++) {
			var selRowId = this.selRowIds[i];
			if (selRowId === rowId) {
				idx = i;
				if (this.options.selectByCheckbox) {
					$row.find('.select-one').prop('checked', false);
				} else {
					$row.removeClass(this.options.classes.highlight);
				}
				break;
			}
		}
		if (idx >= 0) {
			this.selRowIds.splice(idx, 1);
		};
	};
	
	PagingTable.prototype.isSelectedRow = function($row) {
		var rowId = this.getRowId($row);
		return this.isSelectedRowId(rowId);
	};
	
	PagingTable.prototype.isSelectedRowId = function(rowId) {
		if (this.selRowIds.length === 0) {
			return false;
		}
		
		for (var i = 0, len = this.selRowIds.length; i < len; i++) {
			var selRowId = this.selRowIds[i];
			if (selRowId === rowId) {
				return true;
			}
		}
		return false;
	};
	
	PagingTable.prototype.addSelectedRows = function($rows) {
		for (var i = 0, len = $rows.length; i < len; i++) {
			var $row = $rows[i];
			this.addSelectedRow($row);
		}
	};
	
	PagingTable.prototype.addSelectedRow = function($row) {
		if (this.options.selectByCheckbox) {
			$row.find('.select-one').prop('checked', true);
		} else {
			this.highlightSelectedRow($row);
		}
		
		var rowId = this.getRowId($row);
		!this.isSelectedRowId(rowId) && this.selRowIds.push(rowId);
		this.$element.trigger({type:'selectRow', rowId:rowId});
	};
	
	PagingTable.prototype.highlightSelectedRow = function($row) {
		!$row.hasClass(this.options.classes.highlight) && $row.addClass(this.options.classes.highlight);
		$row.removeClass(this.options.classes.hover);
	};
	
	PagingTable.prototype.getRow = function(rowId) {
		var rowElems = this.$element.find('tbody tr');
		for (var i = 0, len = rowElems.length; i < len; i++) {
			var $row = $(rowElems[i]);
			if (this.getRowId($row) == rowId) {
				return $row;
			}
		}
		return null;
	};
	
	PagingTable.prototype.getRows = function() {
		var $rows = [];
		var rowElems = this.$element.find('tbody tr');
		for (var i = 0, len = rowElems.length; i < len; i++) {
			var $row = $(rowElems[i]);
			$rows.push($row);
		}
		return $rows;
	};
	
	PagingTable.prototype.getFirstRow = function() {
		var rowElem = this.$element.find('tbody tr:first-child');
		return $(rowElem);
	};
	
	PagingTable.prototype.getRowId = function($row) {
		return $row.attr('id');
	};
	
	PagingTable.prototype.getRowIds = function() {
		var rowIds = [];
		for (var i = 0, len = this.rowDataSet.length; i < len; i++) {
			var rowData = this.rowDataSet[i];
			var id = rowData[this.keyName];
			rowIds.push(id);
		}
		return rowIds;
	};
	
	PagingTable.prototype.getSelectedRowId = function() {
		var selRowId = this.selRowIds.length > 0 ? this.selRowIds[this.selRowIds.length - 1] : null;
		return selRowId;
	};
	
	PagingTable.prototype.getSelectedRowIds = function() {
		return this.selRowIds;
	};
	
	PagingTable.prototype.setRowData = function(rowDataSet) {
		this.rowDataSet = rowDataSet;
	};
	
	PagingTable.prototype.hasRowData = function() {
		return this.rowDataSet.length > 0 ? true : false;
	};
	
	PagingTable.prototype.addRowData = function(rowData) {
		this.rowDataSet.push(rowData);
	};
	
	PagingTable.prototype.removeRowData = function(rowId) {
		for (var i = 0, len = this.rowDataSet.length; i < len; i++) {
			var rowData = this.rowDataSet[i];
			var key = rowData[this.keyName];
			if (rowId == key) {
				this.rowDataSet.splice(i, 1);
				break;
			}
		}
	};
	
	PagingTable.prototype.getRowData = function(rowId) {
		for (var i = 0, len = this.rowDataSet.length; i < len; i++) {
			var rowData = this.rowDataSet[i];
			var key = rowData[this.keyName];
			if (rowId == key) {
				return rowData;
			}
		}
		return null;
	};
	
	PagingTable.prototype.getAllRowData = function() {
		return this.rowDataSet;
	};
	
	PagingTable.prototype.getSelectedRowData = function() {
		if (this.selRowIds.length < 1) {
			return null;
		}
		
		var rowId = this.selRowIds[this.selRowIds.length - 1];
		return this.getRowData(rowId);
	};
	
	PagingTable.prototype.getMultiSelectedRowData = function() {
		if (this.selRowIds.length < 1) {
			return null;
		}
		
		var rowDataSet = [];
		for (var i = 0, len = this.selRowIds.length; i < len; i++) {
			var rowId = this.selRowIds[i];
			var rowData = this.getRowData(rowId);
			rowDataSet.push(rowData);
		}
		return rowDataSet;
	};
	
	PagingTable.prototype.isAddingRow = function(rowId) {
		return this.newRowId == rowId ? true : false;
	};
	
	PagingTable.prototype.addRow = function(initData) {
		initData = initData || {};
		this.newRowId = initData[this.keyName] || '0'; // new record with default id '0'
		if (!this.options.inlineEditing) {
			this.enableFormEditing(this.newRowId, initData);
			return;
		}
		
		// avoid calling addRow repeatly
		if (this.isAddingRow(this.editedRowId)) {
			return;
		}
		
		this.restoreRow(this.editedRowId);
		this.editedRowId = this.newRowId;
		
		var $newRow = $('<tr id="' + this.newRowId + '"/>');
		var tbody = this.$element.find('tbody')[0];
		$(tbody).prepend($newRow);
		this.highlightSelectedRow($newRow);
		
		for (var i = 0, len = this.colModels.length; i < len; i++) {
			var colModel = this.colModels[i];
			if (colModel.hidden) {
				continue;
			}
			
			var $col = $('<td/>').appendTo($newRow);
			if (colModel.editable) {
				var colVal = initData[colModel.name] || '';
				var editor = this.getEditor(colVal, colModel);
				$col.html(editor);
			}
		}
	};
	
	PagingTable.prototype.updateRow = function(rowId) {
		if (!rowId) {
			return;
		}
		
		var rowData = this.getRowData(rowId);
		if (!this.options.inlineEditing) {
			this.enableFormEditing(rowId, rowData);
			return;
		}
		
		this.restoreRow(this.editedRowId);
		this.editedRowId = rowId;
		
		var $row = this.getRow(rowId);
		var colElems = $row.find('td');
		var colIdx = -1;
		var hiddenElems = '';
		
		for (var i = 0, len = this.colModels.length; i < len; i++) {
			var colModel = this.colModels[i];
			var colVal = this.getColValue(rowData, colModel) || '';
			
			if (colModel.hidden) {
				colModel.isHiddenField && (hiddenElems += this.getHiddenElement(colModel, colVal));
				continue;
			}
			
			colIdx++;
			if (!colModel.editable) {
				colModel.isHiddenField && (hiddenElems += this.getHiddenElement(colModel, colVal));
				continue;
			}

			var $col = $(colElems[colIdx]);
			var editor = this.getEditor(colVal, colModel);
			$col.html(editor);
		}
		
		// append hidden elements to the last column
		hiddenElems != '' && ($(colElems[colIdx]).append(hiddenElems));
	};
	
	PagingTable.prototype.restoreRow = function(rowId) {
		if (!this.options.inlineEditing) {
			return;
		}

		!rowId && (rowId = this.editedRowId);
		if (!rowId) {
			return;
		}
		this.editedRowId = null;
		
		var $row = this.getRow(rowId);
		if (!$row) {
			return;
		}
		
		if (this.isAddingRow(rowId)) {
			$row.remove();
		} else {
			this.doRestoreRow(rowId, $row);
		}
	};
	
	PagingTable.prototype.doRestoreRow = function(rowId, $row) {
		var rowData = this.getRowData(rowId);
		var colElems = $row.find('td');
		var colIdx = -1;
		for (var i = 0, len = this.colModels.length; i < len; i++) {
			var colModel = this.colModels[i];
			if (colModel.hidden) {
				continue;
			}
			
			colIdx++;
			var colContent = this.getColContent(rowData, colModel);
			$(colElems[colIdx]).html(colContent);
		}
	};
	
	PagingTable.prototype.saveRow = function(rowId) {
		if (!this.options.inlineEditing) {
			return;
		}
		
		!rowId && (rowId = this.editedRowId);
		if (!rowId) {
			return;
		}
		this.editedRowId = null;

		var $row = this.getRow(rowId);
		if (!$row) {
			return;
		}
		
		var $form = $('<form/>');
		$row.find('input, select, textarea').appendTo($form);
		$form.find('[name="' + this.keyName + '"]').length < 1 && $form.append('<input type="hidden" name="' + this.keyName + '" value="' + rowId + '" >');
		this.doSaveRow(rowId, $form);
	};
	
	PagingTable.prototype.doSaveRow = function(rowId, $form) {
		if (this.options.inlineEditing || this.options.localData) {
			var rowData = this.isAddingRow(rowId) ? {} : this.getRowData(rowId);
			for (var i = 0, len = this.colModels.length; i < len; i++) {
				var colModel = this.colModels[i];
				if (colModel.hidden) {
					continue;
				}
				
				var newVal = $form.find('[name="' + colModel.name + '"]').val();
				newVal && (rowData[colModel.name] = newVal);
			}
			this.isAddingRow(rowId) && (this.addRowData(rowData));
		}
		
		if (this.options.inlineEditing) {
			var $row = this.getRow(rowId);
			this.doRestoreRow(rowId, $row);
		}
		
		if (this.options.localData) {
			// add events for editing local data
			var e = this.isAddingRow(rowId) ? $.Event('added') : $.Event('updated');
			e.rowId = rowId;
			this.$element.trigger(e);
			!e.isDefaultPrevented() && this.load();
			return;
		}
		
		var isRest = this.remote.isRest;
		var action = this.isAddingRow(rowId) ? 'add' : 'update';
		
		var e = $.Event(action);
		e.form = $form;
		this.$element.trigger(e);
		if (e.isDefaultPrevented()) {
			this.loadRemoteData();
			return;
		}
		
		var url, type;
		if (isRest) {
			if (action == 'update') {
				url = this.addIdToUrl(this.remote.url, rowId);
				type = 'PUT';
			} else {
				url = this.remote.url;
				type = 'POST';
			}
		} else {
			url = $form.attr('action') || this.remote.editUrl;
			type = $form.attr('method') || 'POST';
		}

		var that = this;
		var data = $form.serialize();
		this.remote.params && (data += '&' + $.param(this.remote.params));
		this.startLoading();
		$.ajax({
			url: url,
			data: data,
			type: type
		}).always(function() {
			that.stopLoading();
		}).done(function(resp) {
			e = that.isAddingRow(rowId) ? $.Event('added') : $.Event('updated');
			e.rowId = rowId;
			e.response = resp;
			that.$element.trigger(e);
			!e.isDefaultPrevented() && that.loadRemoteData();
		}).fail(function(jqXHR) {
			e = $.Event(action + 'Error');
			e.rowId = rowId;
			e.jqXHR = jqXHR;
			that.$element.trigger(e);
			$.error(action + ' operation failed!');
		});
	};
	
	PagingTable.prototype.deleteRow = function(settings) {
		var rowId = settings[this.keyName];
		if (!rowId || rowId.length < 1) {
			return;
		}
		
		var rowIds = $.isArray(rowId) ? rowId : [rowId];

		var displayItems;
		if (settings.displayColName) {
			displayItems = [];
			for (var i = 0, len = rowIds.length; i < len; i++) {
				var rowData = this.getRowData(rowIds[i]);
				var colModel = this.getColModel(settings.displayColName);
				var content = this.getColContent(rowData, colModel);
				displayItems.push(content);
			}
		} else {
			displayItems = rowIds;
		}

		var content = this.options.texts.deleteRowSubject + '<br/>' + '<ul><li>' + displayItems.join('</li><li>') + '</li></ul>';
		var $modal = this.getEditingModal();
		$modal.find('.modal-header .editing-title').html(this.options.texts.deleteRowTitle);
		$modal.find('.modal-body').empty().append(content);
		$modal.modal('show');
		
		var that = this;
		$modal.find('.editing-submit').off('click').on('click', function(e) {
			that.doDeleteRow(rowIds, settings);
			$modal.modal('hide');
		});
	};
	
	PagingTable.prototype.doDeleteRow = function(rowIds, settings) {
		settings = settings || {};
		if (this.options.localData) {
			for (var i = 0, len = rowIds.length; i < len; i++) {
				var rowId = rowIds[i];
				this.removeRowData(rowId);
			}
			
			// add event for deleting local data
			var e = $.Event('deleted');
			this.options.isMultiSelect ? e.rowIds = rowIds : e.rowId = rowIds[0];
			this.$element.trigger(e);
			!e.isDefaultPrevented() && this.load();
			return;
		}
		
		var e = $.Event('delete');
		this.options.isMultiSelect ? e.rowIds = rowIds : e.rowId = rowIds[0];
		this.$element.trigger(e);
		if (e.isDefaultPrevented()) {
			this.loadRemoteData();
			return;
		}
		
		var url, type;
		var data = this.remote.params || {};
		if (this.remote.isRest) {
			url = this.addIdToUrl(this.remote.url, rowIds[0]);
			type = 'DELETE';
		} else {
			url = this.remote.deleteUrl;
			data[settings.paramName || this.keyName] = this.options.isMultiSelect ? rowIds : rowIds[0];
			type = settings.method || 'POST';
		}
		
		var that = this;
		this.startLoading();
		$.ajax({
			url: url,
			data: data,
			type: type
		}).always(function() {
			that.stopLoading();
		}).done(function(resp) {
			e = $.Event('deleted');
			that.options.isMultiSelect ? e.rowIds = rowIds : e.rowId = rowIds[0];
			e.response = resp;
			that.$element.trigger(e);
			!e.isDefaultPrevented() && that.loadRemoteData();
		}).fail(function(jqXHR) {
			e = $.Event('deleteError');
			that.options.isMultiSelect ? e.rowIds = rowIds : e.rowId = rowIds[0];
			e.jqXHR = jqXHR;
			that.$element.trigger(e);
			$.error('Delete operation failed!');
		});
	};
	
	PagingTable.prototype.addIdToUrl = function(url, id) {
		var idx = url.indexOf('?');
		if (idx > 0) {
			var qryStr = url.substring(idx + 1);
			url = url.substring(0, idx);
			url = url.charAt(url.length - 1) == '/' ? url + id : url + '/' + id;
			url += '?' + qryStr;
		} else {
			url = url.charAt(url.length - 1) == '/' ? url + id : url + '/' + id;
		}
		return url;
	};
	
	PagingTable.prototype.enableFormEditing = function(rowId, rowData) {
		var title = this.isAddingRow(rowId) ? this.options.texts.addRowTitle : this.options.texts.updateRowTitle;
		var $form = this.getEditingForm(rowData);
		var $modal = this.getEditingModal();
		$modal.find('.modal-header .editing-title').html(title);
		$modal.find('.modal-body').empty().append($form);
		$modal.modal('show');

		var that = this;
		$modal.find('.editing-submit').off('click').on('click', function(e) {
			that.doSaveRow(rowId, $form);
			$modal.modal('hide');
		});
	};
	
	PagingTable.prototype.getEditingModal = function() {
		var $placeholder = this.$element.parent() || $(document.body);
		var modals = $placeholder.find('.editing-modal');
		if (modals && modals.length > 0) {
			return $(modals[0]);
		}
		
		var modal = this.options.editingModalTemplate;
		var $modal = $(modal);
		$modal.find('.editing-submit').html(this.options.texts.submitButton);
		$modal.find('.editing-cancel').html(this.options.texts.cancelButton);
		$modal.appendTo($placeholder);
		$modal.on('hidden', function() {
			$(this).find('.modal-body').empty();
		});
		return $modal;
	};
	
	PagingTable.prototype.getEditingForm = function(rowData) {
		var form = '<form class="form-horizontal">';
		var hiddenElems = '';
		for (var i = 0, len = this.colModels.length; i < len; i++) {
			var colModel = this.colModels[i];
			var colVal = this.getColValue(rowData, colModel) || '';
			if (colModel.hidden || colModel.formHidden) {
				colModel.isHiddenField && (hiddenElems += this.getHiddenElement(colModel, colVal));
				continue;
			}
			
			var elem;
			if (colModel.editable) {
				elem = this.getEditor(colVal, colModel, true);
				form += elem;
			} else {
				elem = this.addLabel('<span class="form-control-static">' + colVal + '</span>', colModel);
				form += elem;
				colModel.isHiddenField && (hiddenElems += this.getHiddenElement(colModel, colVal));
			}
		}
		hiddenElems != '' && (form += hiddenElems);
		form += '</form>';
		
		var $form = $(form);
		$form.find('[name="' + this.keyName + '"]').length < 1 && $form.append('<input type="hidden" name="' + this.keyName + '" value="' + rowData[this.keyName] + '" >');
		return $form;
	};
	
	PagingTable.prototype.getEditor = function(colValue, colModel, withLabel) {
		var editor;
		if (colModel.editor) {
			editor = typeof colModel.editor === 'function' ? colModel.editor(colValue, colModel) : this.getElementByType(colModel.editor, colValue, colModel);
		} else {
			editor = this.getTextElement(colModel, colValue);
		}
		return withLabel ? this.addLabel(editor, colModel) : editor;
	};
	
	PagingTable.prototype.getElementByType = function(type, colValue, colModel) {
		var elem;
		switch (type) {
			case 'checkbox':
				elem = this.getCheckboxElement(colModel, colValue);
				break;
			case 'radio':
				elem = this.getRadioElement(colModel, colValue);
				break;
			case 'select':
				elem = this.getSelectElement(colModel, colValue);
				break;
			case 'multiselect':
				elem = this.getMultiSelectElement(colModel, colValue);
				break;
			case 'textarea':
				elem = this.getTextAreaElement(colModel, colValue);
				break;
			case 'password':
				elem = this.getPasswordElement(colModel, colValue);
				break;
			case 'text':
				elem = this.getTextElement(colModel, colValue);
				break;
			case 'hidden':
				elem = this.getHiddenElement(colModel, colValue);
				break;
			default:
				elem = this.getTextElement(colModel, colValue);
		}
		return elem;
	};
	
	PagingTable.prototype.getCheckboxElement = function(colModel, checkVals) {
		var elem = '', options = this.getColOptions(colModel);
		for(var value in options) {
			var label = options[value];
			var checked = '"';
			for (var i = 0, len = checkVals.length; i < len; i++) {
				var checkVal = checkVals[i];
				if (value == checkVal) {
					checked = '" checked="checked"';
					break;
				}
			}
			var cb = '<input type="checkbox" name="' + colModel.name + '" value="' + value + checked + '>' + label;
			elem += '<label class="checkbox-inline">' + cb + '</label>';
		}
		return elem;
	};
	
	PagingTable.prototype.getRadioElement = function(colModel, checkVal) {
		var elem = '', options = this.getColOptions(colModel);
		checkVal && (checkVal = checkVal.toString());
		for(var value in options) {
			var label = options[value];
			var rd = '<input type="radio" name="' + colModel.name + '" value="' + value + (value == checkVal ? '" checked="checked">' : '">') + label;
			elem += '<label class="radio-inline">' + rd + '</label>';
		}
		return elem;
	};
	
	PagingTable.prototype.getSelectElement = function(colModel, selectVal) {
		var elem = '<select name="' + colModel.name + '" class="form-control">', options = this.getColOptions(colModel);
		for(var value in options) {
			var label = options[value];
			elem += '<option value="' + value + (value == selectVal ? '" selected="selected">' : '">') + label + '</option>';
		}
		elem += '</select>';
		return elem;
	};
	
	PagingTable.prototype.getMultiSelectElement = function(colModel, selectVals) {
		var elem = '<select name="' + colModel.name + '" class="form-control" multiple="multiple">', options = this.getColOptions(colModel);
		var isObj = selectVals.length > 0 && selectVals[0] instanceof Object ? true : false;
		var subName = colModel['subName'] || 'id';
		for(var value in options) {
			var label = options[value];
			var isSel = false;
			for (var i = 0, len = selectVals.length; i < len; i++) {
				var selVal = isObj ? selectVals[i][subName] : selectVals[i];
				if (value == selVal) {
					isSel = true;
					break;
				}
			}
			elem += '<option value="' + value + (isSel ? '" selected="selected">' : '">') + label + '</option>';
		}
		elem += '</select>';
		return elem;
	};
	
	PagingTable.prototype.getHiddenElement = function(colModel, colValue) {
		return '<input type="hidden" name="' + colModel.name + '" value="' + colValue + '">';
	};
	
	PagingTable.prototype.getTextAreaElement = function(colModel, colValue) {
		return '<textarea class="form-control" name="' + colModel.name + '" rows="3">' + colValue + '</textarea>';
	};
	
	PagingTable.prototype.getPasswordElement = function(colModel, colValue) {
		return '<input class="form-control" type="password" name="' + colModel.name + '" value="' + colValue + '">';
	};
	
	PagingTable.prototype.getTextElement = function(colModel, colValue, disabled) {
		return '<input class="form-control" type="text" name="' + colModel.name + '" value="' + colValue + '"' + (disabled ? '" disabled">' : '>');
	};
	
	PagingTable.prototype.addLabel = function(elem, colModel) {
		var elems = '<div class="form-group">'
			+ '<label class="col-md-2 control-label" for="' + colModel.name + '">' + colModel.header + '</label>'
			+ '<div class="col-md-10">' + elem + '</div></div>';
		return elems;
	};
	
	PagingTable.prototype.isBlur = function(e) {
		var offset = this.$element.offset();
		var width = this.$element.width();
		var height = this.$element.height();
		var xmin = offset.left, ymin = offset.top, xmax = xmin + width, ymax = ymin + height;
		return (e.pageX < xmin) || (e.pageX > xmax) || (e.pageY < ymin) || (e.pageY > ymax) ? true : false;
	};
	
	
	// PAGINGTABLE PLUGIN DEFINITION
	// =============================
	
	var old = $.fn.pagingtable;

	$.fn.pagingtable = function(option, value) {
		var methodReturn = undefined;
		var $compSet = this.each(function() {
			var $this = $(this), data = $this.data(compName), options = typeof option === 'object' && option;
			if (!data) $this.data(compName, (data = new PagingTable(this, options)));
			if (typeof option === 'string') methodReturn = data[option](value);
		});
		return methodReturn === undefined ? $compSet : methodReturn;
	};

	$.fn.pagingtable.Constructor = PagingTable;
	
	
	// PAGINGTABLE NO CONFLICT
	// =======================
	
	$.fn.pagingtable.noConflict = function() {
		$.fn.pagingtable = old;
		return this;
	};
	
}(window.jQuery);