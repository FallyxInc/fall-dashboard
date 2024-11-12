// src/utils/DashboardUtils.js

import { ref, update } from 'firebase/database';
import * as Papa from 'papaparse';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';

export function markPostFallNotes(data) {
  data.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
  for (let i = 0; i < data.length; i++) {
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
    console.log(currentRecord.hospital);
    currentRecord.postFallNotesColor =
      currentRecord.postFallNotes < 3 && !hasFallWithin72Hours && (currentRecord.hospital.toLowerCase() === 'no') ? 'red' : 'default';
  }
  return data;
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
  var locationCounts = {};
  data.forEach((fall) => {
    if (locationCounts[fall.location]) {
      locationCounts[fall.location]++;
    } else {
      locationCounts[fall.location] = 1;
    }
  });
  return locationCounts;
}

export function countFallsByHIR(data) {
  var hirCount = 0;

  data.forEach((fall) => {
    if (fall.hir?.toLowerCase() === 'yes') {
      hirCount++;
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

export function getTimeShift(fallTime) {
  var parts = fallTime.split(':');
  var hours = parseInt(parts[0], 10);
  var minutes = parseInt(parts[1], 10);

  // Convert time to minutes since midnight for easier comparison
  var totalMinutes = hours * 60 + minutes;

  // Determine the shift based on time ranges
  if (totalMinutes >= 390 && totalMinutes <= 870) {
    // 6:30 AM to 2:30 PM
    return 'Morning';
  } else if (totalMinutes >= 871 && totalMinutes <= 1350) {
    // 2:31 PM to 10:30 PM
    return 'Evening';
  } else {
    // 10:31 PM to 6:30 AM
    return 'Night';
  }
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

export function countFallsByTimeOfDay(data) {
  var timeOfDayCounts = { Morning: 0, Evening: 0, Night: 0 };

  data.forEach((fall) => {
    var shift = getTimeShift(fall.time);
    timeOfDayCounts[shift]++;
  });

  return timeOfDayCounts;
}
