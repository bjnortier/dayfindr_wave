
function getKeys(hash) {
  var keys = [];
  for(i in hash) if (hash.hasOwnProperty(i)) {
      keys.push(i);
    }
  return keys;
}

function daysInMonth(year, month) {
  return 32 - new Date(year, month-1, 32).getDate();
}

function daysForMonth(year, month) {
  var N = daysInMonth(year, month);
  var days = [];
  for (var d = 0; d < N; ++d) {
    days[d] = new Date(year, month-1, d + 1);
  }
  return days;
}

function createDateStruct(year, month, day) {
  var date = {};
  date.year = year;
  date.month = month;
  date.day = day;
  return date;
}

function dateStructsEqual(left, right) {
  return left.year == right.year && left.month == right.month && left.day == right.day;
}

function templatePlaceholder(date) {
  return '' + date.year + '_' + date.month + '_' + date.day;
}

function dateFromJsDate(jsdate) {

  var year = jsdate.getFullYear();
  var month = jsdate.getMonth() + 1;
  var day = jsdate.getDate();
  return createDateStruct(year, month, day);
}

function createMonthTemplate(year, month) {

  var days = daysForMonth(year, month);
  var preSync = true;
  var postSync = false;
  var dayOffset = 0;
  var numberOfDaysLeft = days.length;

  var template = "";
  template += '<table class="dayfindr_month">';
  template += '<tr><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th></tr>';
  for (var week = 0; (week < 6) && (numberOfDaysLeft > 0); ++week) {
    
    template += '<tr>';
    for (var dayOfWeek = 0; dayOfWeek < 7; ++dayOfWeek) {
      
      var i = week*7 + dayOfWeek;
      if (preSync) {
   	if (((days[0].getDay() + 6) % 7)  == i) {
   	  preSync = false;
   	  dayOffset = i;
   	}
      } else {
   	if ((i - dayOffset) >= days.length) {
   	  postSync = true;
   	}
      }

      if (preSync) {
   	template += '<td></td>';
      } else if (postSync) {
   	template += '<td></td>';
      } else {
	var jsdate = days[i - dayOffset];
	var dateStruct = dateFromJsDate(jsdate);
   	template += '<td>{{{' + templatePlaceholder(dateStruct) + '}}}</td>';
      }
      --numberOfDaysLeft;
    }
    template += "</tr>";
  }
  template += "</table>";
  return template;
}

function transformState(state) {

  var reverseLookup = {};
  var messageLookup = {};
  var keys = state.getKeys();

  for (var i = 0; i < keys.length; ++i) {
    // Disregard special keys (starting with '_')
    if (keys[i].indexOf('_') == 0) {
      continue;
    }
    
    var participantId = keys[i];

    var infos = JSON.parse(state.get(participantId));
    for (var k = 0; k <infos.length; ++k) {
      
      var participantInfo = infos[k];
      
      var date = { year  : participantInfo.year,
		   month : participantInfo.month,
		   day   : participantInfo.day };
      var dateJSON = JSON.stringify(date);
	
      if (reverseLookup[dateJSON] == undefined) {
	reverseLookup[dateJSON] = [];
      }
      reverseLookup[dateJSON].push(participantId);
	       
      var message = participantInfo.message;
      if (message != undefined) {
	if (messageLookup[dateJSON] == undefined) {
	  messageLookup[dateJSON] = {};
	}
	messageLookup[dateJSON][participantId] = message;
      }
    }
  }

  var transformed = { datesToAttendees : reverseLookup,
		      datesToMessages : messageLookup };
  return transformed;

}

function addDayLink(view, year, month) {
  
  var days = daysForMonth(year, month);
  for (var i = 0; i < days.length; ++i) {
    var jsdate = days[i];
    var date = dateFromJsDate(jsdate);

    var onclick = 'dayClicked(' + date.year + ',' + date.month + ',' + date.day + ')';
    var html = '<div><a href="#" onclick="' + onclick + '">' + date.day +'</a></div>';

    view[templatePlaceholder(date)] = html;
  }

}

function viewFromState(yearsAndMonths, wave) {

  var viewerId = wave.getViewer().getId();
  var transformed = transformState(wave.getState());
  var view = {};

  // The initial view is only the day of the month
  for (var i = 0; i < yearsAndMonths.length; ++i) {
    year = yearsAndMonths[i][0];
    month = yearsAndMonths[i][1];
    addDayLink(view, year, month);
  }
  
  var dates = getKeys(transformed.datesToAttendees);
  for (var i = 0; i < dates.length; ++i) {
    var attendeesKey = dates[i];
    var participantIds =  transformed.datesToAttendees[attendeesKey];

    var viewKey = templatePlaceholder(JSON.parse(attendeesKey));
    var html = view[viewKey];
    html += '<div class="attendees">';
    for (var k = 0; k < participantIds.length; ++k) {

      var participantId = participantIds[k];
      var participant = wave.getParticipantById(participantId)
      var thumbnailURL = participant.getThumbnailUrl();
      html += '<img src="' + thumbnailURL + '" title="' + participant.getDisplayName() + '" + alt="' + participantId + '" width="27px" height="27px" onload="gadgets.window.adjustHeight();"/>';
    }
    html += '</div>';
    
    view[viewKey] = html;
  }
  return view;
}

function containsDate(array, date) {
  for (var i = 0; i < array.length; i++) {
    if (dateStructsEqual(array[i], date)) {
      return true;
    }
  }
  return false;
}

function removeDate(array, date) {
  var newArray = [];
  for (var i = 0; i < array.length; i++) {
    if (!dateStructsEqual(array[i], date)) {
      newArray.push(array[i]);
    }
  }
  return newArray;
}

function dayClicked(year, month, day) {
	   
  var clickedDate = createDateStruct(year, month, day);
	   
  var viewerId = wave.getViewer().getId();
  var daysJSON = wave.getState().get(viewerId, '[]');
  var attendingDays = JSON.parse(daysJSON);

  if (containsDate(attendingDays, clickedDate)) {
    attendingDays = removeDate(attendingDays, clickedDate);
  } else {
    attendingDays.push(clickedDate);
  }
		   
  var delta = {};
  delta[viewerId] = JSON.stringify(attendingDays);
  wave.getState().submitDelta(delta);
}

function getNextYearAndMonth(year, month) {
  var yearAndMonth = [];
  if (month == 12) {
    yearAndMonth[0] = year + 1;
    yearAndMonth[1] = 1;
  } else {
    yearAndMonth[0] = year;
    yearAndMonth[1] = month + 1;
  }
  return yearAndMonth;
}

function updateMonthsInclusive(increment) {
  var delta = {};
  var numberOfMonths = JSON.parse(wave.getState().get('_months_inclusive', '2'));
  delta['_months_inclusive'] = numberOfMonths + increment;
  wave.getState().submitDelta(delta);
}

var month_names = [];
month_names[0] = "January";
month_names[1] = "February";
month_names[2] = "March";
month_names[3] = "April";
month_names[4] = "May";
month_names[5] = "June";
month_names[6] = "July";
month_names[7] = "August";
month_names[8] = "September";
month_names[9] = "October";
month_names[10] = "November";
month_names[11] = "December";

function getHeading(yearAndMonth) {
  var year = yearAndMonth[0];
  var month = yearAndMonth[1];
  return '<h2>' + month_names[month - 1] + ' ' + year + '</h2>';
}

function getGadgetHtml(wave) {
  var numberOfMonths = wave.getState().get('_months_inclusive', '2');

  var today = new Date();
  year = today.getFullYear();
  month = today.getMonth() + 1;
       
  var templates = [];
  var yearsAndMonths = [];
  for (var i = 0; i < numberOfMonths; ++i) {
    templates[i] = createMonthTemplate(year, month);
    yearsAndMonths.push([year, month]);

    var nextYearAndMonth = getNextYearAndMonth(year, month);
    year = nextYearAndMonth[0];
    month = nextYearAndMonth[1];
  }

  var view = viewFromState(yearsAndMonths, wave);

  var html = '';
  for (var i = 0; i < templates.length; ++i) {
    html += getHeading(yearsAndMonths[i]);
    html += Mustache.to_html(templates[i], view);
  }

  if (numberOfMonths > 1) {
    html += '<button type="button" onclick="updateMonthsInclusive(-1)">-</button>';
  }
  html += '<button type="button" onclick="updateMonthsInclusive(1)">+</button>';

  return html;
}


