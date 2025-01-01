// src/utils/DashboardUtils.js

import { ref, update } from 'firebase/database';
import * as Papa from 'papaparse';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';


export function markPostFallNotes(input) {
  let data = [...input];
  data.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
  for (let i = 0; i < data.length; i++) {
    const currentID = data[i].id;
    const currentRecord = data[i];
    const currentDateTime = new Date(currentRecord.date + ' ' + currentRecord.time);
    let hasFallWithin72Hours = false;
    for (let j = i + 1; j < data.length; j++) {
      const nextRecord = data[j];
      const nextDateTime = new Date(nextRecord.date + ' ' + nextRecord.time);
      const timeDifference = (nextDateTime - currentDateTime) / (1000 * 60 * 60);
      if (timeDifference > 72) break;
      if (currentRecord.name === nextRecord.name && timeDifference <= 72) {
        hasFallWithin72Hours = true;
        break;
      }
    }

    input[currentID].postFallNotesColor =
      currentRecord.postFallNotes < 3 && !hasFallWithin72Hours && 
      (currentRecord.hospital === 'no' || currentRecord.hospital === 'No')
        ? 'red'
        : 'default';
  }
  return input;
}

export function countFallsByExactInjury(data) {
  var injuryCounts = {};

  data.forEach((fall) => {
    var injury = fall.injury;

    if (injuryCounts[injury]) {
      injuryCounts[injury]++;
    } else {
      injuryCounts[injury] = 1;
    }
  });

  return injuryCounts;
}

export function countFallsByLocation(data) {
  const locationCounts = {};
  
  Object.values(data).forEach(item => {
    // Check for both possible field names
    const locationValue = item.location || item.incident_location;
    
    if (locationValue) {
      locationCounts[locationValue] = (locationCounts[locationValue] || 0) + 1;
    }
  });
  
  console.log('Location counts:', locationCounts); // Debug log
  return locationCounts;
}

export function countFallsByHIR(data) {
  let hirCount = 0;
  data.forEach(item => {
    try {
      if (item.hir === 'yes' || item.hir === 'Yes') {
        hirCount++;
      }
    } catch (error) {
      console.error('Error processing HIR:', error);
    }
  });
  return hirCount;
}

export function getMonthFromTimeRange(timeRange) {
  // Example logic for determining the month label
  // Replace this logic with the actual month logic you are using
  var currentMonth = 'August 2024'; // You can dynamically determine this based on the current time or input data
  if (timeRange === '3months') {
    return 'June - August 2024';
  } else if (timeRange === '6months') {
    return 'March - August 2024';
  } else {
    return currentMonth;
  }
}

export function getTimeShift(fallTime, home) {
  const timeShifts = {
    iggh: {
      morning: [420, 900], // 7:00 AM to 3:00 PM
      evening: [901, 1380], // 3:01 PM to 11:00 PM
      night: [1381, 419], // 11:01 PM to 6:59 AM
    },
    millCreek: {
      morning: [390, 870], // 6:30 AM to 2:30 PM
      evening: [871, 1350], // 2:31 PM to 10:30 PM
      night: [1351, 389], // 10:31 PM to 6:30 AM
    },
    niagara: {
      morning: [360, 840], // 6:00 AM to 2:00 PM
      evening: [841, 1320], // 2:01 PM to 10:00 PM
      night: [1321, 359], // 10:01 PM to 5:59 AM
    },
    wellington: {
      morning: [390, 870], // 6:30 AM to 2:30 PM
      evening: [871, 1350], // 2:31 PM to 10:30 PM
      night: [1351, 389], // 10:31 PM to 6:30 AM
    },
    home1: {
      morning: [420, 900], // 7:00 AM to 3:00 PM
      evening: [901, 1380], // 3:01 PM to 11:00 PM
      night: [1381, 419], // 11:01 PM to 6:59 AM
    },
    home2: {
      morning: [420, 900], // 7:00 AM to 3:00 PM
      evening: [901, 1380], // 3:01 PM to 11:00 PM
      night: [1381, 419], // 11:01 PM to 6:59 AM
    },
    home3: {
      morning: [420, 900], // 7:00 AM to 3:00 PM
      evening: [901, 1380], // 3:01 PM to 11:00 PM
      night: [1381, 419], // 11:01 PM to 6:59 AM
    },
    home4: {
      morning: [420, 900], // 7:00 AM to 3:00 PM
      evening: [901, 1380], // 3:01 PM to 11:00 PM
      night: [1381, 419], // 11:01 PM to 6:59 AM
    },
    bonairltc: {
      morning: [420, 900], // 7:00 AM to 3:00 PM
      evening: [901, 1380], // 3:01 PM to 11:00 PM
      night: [1381, 419], // 11:01 PM to 6:59 AM
    },
    champlain: {
      morning: [420, 900], // 7:00 AM to 3:00 PM
      evening: [901, 1380], // 3:01 PM to 11:00 PM
      night: [1381, 419], // 11:01 PM to 6:59 AM
    },
    lancaster: {
      morning: [420, 900], // 7:00 AM to 3:00 PM
      evening: [901, 1380], // 3:01 PM to 11:00 PM
      night: [1381, 419], // 11:01 PM to 6:59 AM
    },
    oneill: {
      morning: [420, 900], // 7:00 AM to 3:00 PM
      evening: [901, 1380], // 3:01 PM to 11:00 PM
      night: [1381, 419], // 11:01 PM to 6:59 AM
    },
    vmltc: {
      morning: [420, 900], // 7:00 AM to 3:00 PM
      evening: [901, 1380], // 3:01 PM to 11:00 PM
      night: [1381, 419], // 11:01 PM to 6:59 AM
    },
  };

  const shiftConfig = timeShifts[home];
  if (!shiftConfig) {
    throw new Error(`No configuration found for home: ${home}`);
  }

  var parts = fallTime.split(':');
  var hours = parseInt(parts[0], 10);
  var minutes = parseInt(parts[1], 10);
  var totalMinutes = hours * 60 + minutes;

  if (totalMinutes >= shiftConfig.morning[0] && totalMinutes <= shiftConfig.morning[1]) {
    return 'Morning';
  } else if (totalMinutes >= shiftConfig.evening[0] && totalMinutes <= shiftConfig.evening[1]) {
    return 'Evening';
  } else {
    if (totalMinutes >= shiftConfig.night[0] || totalMinutes <= shiftConfig.night[1]) {
      return 'Night';
    }
  }

  throw new Error(`Time ${fallTime} does not match any shift for home: ${home}`);
}

export function countResidentsWithRecurringFalls(data) {
  var residentFallCounts = {};

  // Count falls for each resident
  data.forEach((fall) => {
    var residentName = fall.name;
    if (residentFallCounts[residentName]) {
      residentFallCounts[residentName]++;
    } else {
      residentFallCounts[residentName] = 1;
    }
  });

  // Only include residents with more than one fall
  var recurringFalls = {};
  for (var resident in residentFallCounts) {
    if (residentFallCounts[resident] > 1) {
      recurringFalls[resident] = residentFallCounts[resident];
    }
  }

  return recurringFalls;
}

export function countFallsByTimeOfDay(data, name) {
  var timeOfDayCounts = { Morning: 0, Evening: 0, Night: 0 };

  data.forEach((fall) => {
    var shift = getTimeShift(fall.time, name);
    timeOfDayCounts[shift]++;
  });

  return timeOfDayCounts;
}
