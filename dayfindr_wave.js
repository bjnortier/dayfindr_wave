
/*Object.prototype.keys = function () {
  var keys = [];
  for(i in this) if (this.hasOwnProperty(i))
  {
    keys.push(i);
  }
  return keys;
  }*/

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
    var participantId = keys[i];

    for (var k = 0; k < state.get(participantId).length; ++k) {
      
      var participantInfo = JSON.parse(state.get(participantId)[k]);
      
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

function viewFromState(yearsAndMonths, viewerId, wave) {

  var transformed = transformState(wave.getState());
  var view = {};

  // The initial view is only the day of the month
  for (var i = 0; i < yearsAndMonths.length; ++i) {
    year = yearsAndMonths[i][0];
    month = yearsAndMonths[i][1];
    addDayLink(view, year, month);
  }
  
  var dates = transformed.datesToAttendees.keys();
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


