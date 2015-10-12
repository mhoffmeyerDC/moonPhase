// ==UserScript==
// @name        Add Rise/Set Times
// @namespace   skyandtelescope.com
// @include     http://www.skyandtelescope.com/wp-content/observing-tools/moonphase/moon.html
// @version     1
// @grant       GM_xmlhttpRequest
// @require https://code.jquery.com/jquery-1.11.3.min.js
// ==/UserScript==
$(document).ready(function () {
  $("input[name=button]").click(function() {
    var selectedYear = $("input[name=yearf]").val();
    getData(selectedYear, 75, 41, 40, 34, 5, 'BREINIGSVILLE, PA');
  });
  
});

function injectRiseSetTime(riseSetData) {
  var selectedMonth = $("select[name=monthf]").val() -1;
  var selectedDay = $("select[name=dayf]").val() -1;
  var newHTML = "<td colspan=5 style='padding: 0px 42px 0px 42px'><font class='time'>Rise Time:</font><span class='time' style='color: white;'>   " + riseSetData[selectedMonth][selectedDay][0].getHours() + ":" + riseSetData[selectedMonth][selectedDay][0].getMinutes() + "</span><span class='time' style='color: white; float: right'>" + riseSetData[selectedMonth][selectedDay][1].getHours() + ":" + riseSetData[selectedMonth][selectedDay][1].getMinutes() + "</span><font class='time' style='float: right; margin-right: 4px;'>Set Time:</font></td>";
  
  var newRow = $("#newRow");
  if(newRow.length > 0) {
    newRow.html(newHTML);
  } else {
    var selectedTableRow = $('body > form:nth-child(1) > table:nth-child(1) > tbody:nth-child(2) > tr:nth-child(5)');
    selectedTableRow.after("<tr id='newRow'>" + newHTML + "</tr>")
  }

}
/**
 * Returns Lunar Rise/Set times from USNO data
 */
/**
 * Returns USNO data as a 3-deep nested JavaScript Array of [months][days][riseSetPair], [2][0][3] would be March 4, moon rise time
 * @todo add options for Eastern Hemisphere
 * @param year {Number} - 4 digit year
 * @param long_deg {Number} - Longitude in deg W
 * @param long_m {Number} - Longitude in minutes W
 * @param lat_deg {Number} - Latitude in deg
 * @param lat_m {Number} - Latitude in minutes
 * @param tz_offset {Number} - Western GMT offset, 5 = Eastern
 * @param name {String} - Friendly Name of data set
 * @returns {*|promise}
 */
function getData(year, long_deg, long_m, lat_deg, lat_m, tz_offset, name) {
  var url = 'http://aa.usno.navy.mil/cgi-bin/aa_rstablew.pl?FFX=2&xxy=2015&type=0&place=' + name + '&xx0=-1&xx1=' + long_deg + '&xx2=' + long_m + '&yy0=1&yy1=' + lat_deg + '&yy2=' + lat_m + '&zz1=' + tz_offset + '&zz0=-1&ZZZ=END';

  GM_xmlhttpRequest({
    method: 'GET',
    url: url,
    onload: function (response) {
      var dataTable = dataSetOnly(selectTable(response.responseText));
      var rows = splitIntoRows(dataTable);
      var months = dayMonths(rows);
      var cleaned = cleanup(months);
      var transformed = transform(cleaned, year);
      injectRiseSetTime(transformed);
    }
  });
}
/**
 * Selects the data table from the HTML document
 * Data is within a <pre> tag
 * @param str
 * @returns {String}
 */

function selectTable(str) {
  return str.match(/<pre>([\s\S]*?)<\/pre>/g).map(function (val) {
    return val.replace(/<\/?pre>/g, '');
  }) [0];
}
/**
 * Select the data table only, regex starting at '01' and ending with two line breaks
 * Regex are dark magic, this could break if the format changes
 * @param str
 */

function dataSetOnly(str) {
  return str.match(/\s01([\s\S]*?)\n\n/).map(function (val) {
    return val.replace(/^\n/, '');
  }) [0];
}
/**
 * Split each line into an array object (table -> rows) and remove the day index
 * @param str
 * @returns {Array}
 */

function splitIntoRows(str) {
  return str.split(/\r?\n/).map(function (val) {
    return val.replace(/^\d\d\ \ /g, '');
  });
}
/**
 * Push each rise/set tuple into an array for each month
 * @param rows
 * @returns {*[]}
 */

function dayMonths(rows) {
  var months = [
    [],
    [
    ],
    [
    ],
    [
    ],
    [
    ],
    [
    ],
    [
    ],
    [
    ],
    [
    ],
    [
    ],
    [
    ],
    [
    ]
  ];
  rows.map(function (row) {
    months[0].push(row.substr(0, 9));
    months[1].push(row.substr(11, 9));
    months[2].push(row.substr(22, 9));
    months[3].push(row.substr(33, 9));
    months[4].push(row.substr(44, 9));
    months[5].push(row.substr(55, 9));
    months[6].push(row.substr(66, 9));
    months[7].push(row.substr(77, 9));
    months[8].push(row.substr(88, 9));
    months[9].push(row.substr(99, 9));
    months[10].push(row.substr(110, 9));
    months[11].push(row.substr(121, 9));
  });
  return months;
}
/**
 * Remove empty values and replace blank spaces with no rise/set time with null to normalize the input format
 * @param months
 * @returns {*}
 */

function cleanup(months) {
  for (var monthIdx in months) {
    months[monthIdx] = months[monthIdx].filter(function (i) {
      return i !== '' && i !== '         ';
    });
    months[monthIdx] = months[monthIdx].map(function (riseSetPairWithGap) {
      return riseSetPairWithGap.replace(/(^\ \ \ \ )|(\ \ \ \ $)/, null).split(' ');
    });
  }
  return months;
}
/**
 * Transform rise/set times into JavaScript Date objects
 * @param months
 * @returns {*}
 */

function transform(months, year) {
  for (var monthIdx = 0; monthIdx < 12; monthIdx++) {
    for (var dayIdx = 0; dayIdx < months[monthIdx].length; dayIdx++) {
      for (var riseSetIdx in months[monthIdx][dayIdx]) {
        if (months[monthIdx][dayIdx][riseSetIdx] !== 'null') {
          var hour = months[monthIdx][dayIdx][riseSetIdx].substring(0, 2);
          var minute = months[monthIdx][dayIdx][riseSetIdx].substring(2, 4);
          months[monthIdx][dayIdx][riseSetIdx] = new Date(year, monthIdx, dayIdx + 1, hour, minute);
        }
      }
    }
  }
  return months;
}
