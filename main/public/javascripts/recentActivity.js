var recentActivityTable = null;
var userTable = {};

$(document).ready(function() {
	populateTableRecentActivity();

	// upon clicking each row in the recent activity table
	$('#recentActivity tbody').on('click', 'tr', function (e) {
		
		if (!($(this).hasClass('no-select'))){
			$(this).toggleClass('selected');
			//if it is a recent activity row that has not been expanded
			if (($(this).hasClass('selected')) && ($(this).hasClass('recentActivity'))) {
				// Do not select the row
				e.stopPropagation();
				// Get the row where we clicked
				var row = $(this);

				var rowData = recentActivity.row(row).data();
				var userId = rowData.userId;

				// Create a table to insert in the projects table
				rowText = '<tr class="userTable">';
				rowText += '<td colspan="6"<br>';
				rowText += '<table style="white-space: normal;" class="table table-striped table-hover dataTable userTable text-left" id="' + userId + '">';
				// Table head
				rowText += '<thead><tr class="no-select"><th>Profile Picture</th><th>Bio</th><th>Total Posts</th><th>Followers</th><th>Follows</th></tr></thead>';
				// Insert this as the next row of the table
				$(rowText).insertAfter(row);
				//make the row with the table un-selectable
				row.next().addClass('no-select');
				//make the table layout fixed 
				var table = document.getElementById(userId);
				table.style.tableLayout="fixed";			

				// Initiate datatable
				userTable[userId] = null;
				populateUserTable(userId);
			}
			//if the row is project table and already expanded, hide the details.
			else if ( (!($(this).hasClass('selected'))) && ($(this).hasClass('recentActivity')) ) {
				var row = $(this);
				row.next().hide();
			}
		}

	});

});

function populateTableRecentActivity() {

	$.getJSON('/recent_json', function(data) {
		JSON.stringify(data);

		recentActivity = $('#recentActivity').DataTable({
			destroy: true,
			data: data,
			"order": [ 5, 'desc' ],
			"pageLength" : 25,
			columns: [
				{
					"data": "pictureLink",
			   		"render": function(data, type, row) {
			        	return '<img src="'+data+'" />';
			    	}, width: '20%', float: 'left'
				},
				{ data: 'name', width:'10%' },
				{ data: 'username', width: '10%' },
				{ data: 'post', width: '25%' },
				{
					data: null,
					render: function(data) {
						return (new Date(data.createdTime)).toLocaleString();
					}, width: '5%'
				},
				{ data: 'likeCount', width: '5%' },
				{ data: 'sentWord', width: '5%' },
				{ data: 'sentNum', width: '3%' },			
			],
			language: {
				emptyTable: function () {
					return '<p class="text-center">There is no recent activity on this instagram tag.</p>';
				}
			},
			drawCallback: function (settings) {
				var pgr = $(settings.nTableWrapper).find('.dataTables_paginate')
				if (settings._iDisplayLength >= settings.fnRecordsDisplay()) {
					pgr.hide();
				}
				else { 
					pgr.show();
				}
			}
		});


		var $rows = $('#recentActivity tr');
			$rows.each(function(i, item) {
	    	$this = $(item);
	    	$this.addClass('recentActivity');
	    });
	});
}
function populateUserTable(userId) {
	// Get list of current roles for this profile
	$.getJSON('/user_json/' + userId, function (data) {
		JSON.stringify(data);

		// If the table already exists, empty it and then populate it with the new data
		if (userTable[userId] != null) {
			userTable[userId].clear();
			userTable[userId].rows.add(data);
			userTable[userId].draw();
		}

		// Else, create the table with the JSON data
		else {
			userTable[userId] = $('#' + userId).DataTable({
				destroy: true,
				paging: false,
				info: false,
				filter: false,
				autoWidth: false,
				data: data,
				columns: [
					{
					"data": "pictureLink",
			   		"render": function(data, type, row) {
			        			return '<img src="'+data+'" />';
			    			  }, width: '20%', height: 'auto'
					},
					{ data: 'bio', width: '30%', 'word-wrap': 'break-word' },
					{ data: 'postCount', width: '10%' },
					{ data: 'followedByCount', width: '10%' },
					{ data: 'followsCount', width: '10%' },
				],
				language: {
					emptyTable: function () {
						return '<p class="text-center">Sorry! We would not find the user data for this post! :(</p>';
					}
				}
			});
		};

		//make all rows have class no-select and userTable
		var $rows = $('#' + userId + ' tr');

		$rows.each(function(i, item) {
	    	$this = $(item);
	    	$this.addClass('userTable');
	    	$this.addClass('no-select');
	    });

	});
}


