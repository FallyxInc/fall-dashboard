import React, { useEffect, useState, useRef } from 'react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
// import "../styles/Dashboard.css"
import styles from '../styles/Dashboard.module.css';
import { useNavigate } from 'react-router-dom';
import * as Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { Chart, ArcElement, PointElement, LineElement } from 'chart.js';
// import { collection, addDoc } from 'firebase/firestore';
import { ref, onValue, off, get, update, query, orderByChild, equalTo, child, set, serverTimestamp } from 'firebase/database';
import { db } from '../firebase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  markPostFallNotes,
  countFallsByExactInjury,
  countFallsByLocation,
  countFallsByHIR,
  getMonthFromTimeRange,
  countResidentsWithRecurringFalls,
  countFallsByTimeOfDay,
  countFallsByDayOfWeek,
  countFallsByHour,
} from '../utils/DashboardUtils';
import Modal from './Modal';

Chart.register(ArcElement, PointElement, LineElement);

export default function Dashboard({ name, title, unitSelectionValues, goal }) {
  const months_forward = {
    '01': 'January',
    '02': 'February',
    '03': 'March',
    '04': 'April',
    '05': 'May',
    '06': 'June',
    '07': 'July',
    '08': 'August',
    '09': 'September',
    10: 'October',
    11: 'November',
    12: 'December',
  };

  const months_backword = {
    January: '01',
    February: '02',
    March: '03',
    April: '04',
    May: '05',
    June: '06',
    July: '07',
    August: '08',
    September: '09',
    October: '10',
    November: '11',
    December: '12',
  };

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [threeMonthData, setThreeMonthData] = useState(new Map());
  
  // Helper function to get the first day of the current month
  const getFirstDayOfCurrentMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  };

  // Helper function to get current date
  const getCurrentDate = () => {
    return new Date();
  };

  // Helper function to format date for display
  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Helper function to get month name from date
  const getMonthName = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long' });
  };

  // Helper function to get year from date
  const getYearFromDate = (date) => {
    return date.getFullYear();
  };

  // Helper function to get month number from date (padded with 0)
  const getMonthNumber = (date) => {
    return String(date.getMonth() + 1).padStart(2, '0');
  };

  // Helper function to format date for HTML input (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Helper function to get the month/year for a specific date (for database operations)
  const getMonthYearForDate = (date) => {
    const year = date.getFullYear();
    const month = getMonthNumber(date);
    return { year, month };
  };

  // Helper function to get the month/year for the start date (for backward compatibility)
  const getCurrentMonthYear = () => {
    return getMonthYearForDate(startDate);
  };

  // Handle start date change
  const handleStartDateChange = (event) => {
    const newDate = new Date(event.target.value);
    if (newDate && newDate <= endDate) {
      setStartDate(newDate);
    }
  };

  // Handle end date change
  const handleEndDateChange = (event) => {
    const newDate = new Date(event.target.value);
    if (newDate && newDate >= startDate) {
      setEndDate(newDate);
    }
  };

  const getCurrentMonth = () => {
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');  // Convert 1-12 to "01"-"12"
    return months_forward[month];  // Convert "01" to "January" etc.
  };
  
  // Replace month/year with date range
  const [startDate, setStartDate] = useState(getFirstDayOfCurrentMonth());
  const [endDate, setEndDate] = useState(getCurrentDate());
  
  // Keep these for backward compatibility with existing logic
  const [desiredMonth, setDesiredMonth] = useState(getMonthName(getFirstDayOfCurrentMonth()));
  const [desiredYear, setDesiredYear] = useState(getYearFromDate(getFirstDayOfCurrentMonth()));
  
  const [desiredUnit, setDesiredUnit] = useState('allUnits');
  // const [desiredMonth, setDesiredMonth] = useState('January');
  // const [desiredYear, setDesiredYear] = useState(2025);
  const [availableYearMonth, setAvailableYearMonth] = useState({});
  // console.log('year month');
  // console.log(desiredYear);
  // console.log(desiredMonth);
  // console.log('availableYearMonth');
  // console.log(availableYearMonth);

  // console.log('data');
  // console.log(data);
  // console.log(currentMonth);
  // console.log('threeMonthData');
  // console.log(threeMonthData);

  const [gaugeChart, setGaugeChart] = useState(true);
  const [fallsTimeRange, setFallsTimeRange] = useState('current');
  const [analysisType, setAnalysisType] = useState('location');
  const [analysisTimeRange, setAnalysisTimeRange] = useState('current');
  const [analysisUnit, setAnalysisUnit] = useState('allUnits');
  const [analysisHeaderText, setAnalysisHeaderText] = useState('Falls by Time of Day');

  const [currentIntervention, setCurrentIntervention] = useState('');
  const [currentRowIndex, setCurrentRowIndex] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [currentCauseOfFall, setCurrentCauseOfFall] = useState('');
  const [currentCauseRowIndex, setCurrentCauseRowIndex] = useState(null);
  const [isCauseModalOpen, setIsCauseModalOpen] = useState(false);

  const [currentPostFallNotes, setCurrentPostFallNotes] = useState('');
  const [currentPostFallNotesRowIndex, setCurrentPostFallNotesRowIndex] = useState(null);
  const [isPostFallNotesModalOpen, setIsPostFallNotesModalOpen] = useState(false);

  const [residentsNeedingReview, setResidentsNeedingReview] = useState([]);
  const [currentResidentIndex, setCurrentResidentIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [currentResident, setCurrentResident] = useState(null);

  const [incidentType, setIncidentType] = useState('Falls');
  const [insightOutcomes, setInsightOutcomes] = useState({});
  const [reviewedInsights, setReviewedInsights] = useState({});
  const [insights, setInsights] = useState([]);

  const MOCK_INCIDENT_DATA = {
    'Falls': {
      'home1': 12,
      'home2': 8,
      'home3': 15,
      'home4': 6,
      'vmltc': 10,
      'oneill': 9,
      'lancaster': 7,
      'goderich': 11
    },
    'Abuse/Neglect/Personal Expression of Needs': {
      'home1': 3,
      'home2': 2,
      'home3': 4,
      'home4': 1,
      'vmltc': 2,
      'oneill': 3,
      'lancaster': 1,
      'goderich': 2
    },
    'Death': {
      'home1': 1,
      'home2': 2,
      'home3': 1,
      'home4': 1,
      'vmltc': 2,
      'oneill': 1,
      'lancaster': 1,
      'goderich': 1
    },
    'Injury': {
      'home1': 7,
      'home2': 5,
      'home3': 8,
      'home4': 4,
      'vmltc': 6,
      'oneill': 5,
      'lancaster': 3,
      'goderich': 6
    },
    'Elopement': {
      'home1': 2,
      'home2': 1,
      'home3': 3,
      'home4': 1,
      'vmltc': 2,
      'oneill': 2,
      'lancaster': 1,
      'goderich': 2
    },
    'Fire': {
      'home1': 0,
      'home2': 1,
      'home3': 0,
      'home4': 0,
      'vmltc': 1,
      'oneill': 0,
      'lancaster': 0,
      'goderich': 0
    }
  };

  function expandedLog(item, maxDepth = 100, depth = 0) {
    if (depth > maxDepth) {
      console.log(item);
      return;
    }
    if (typeof item === 'object' && item !== null) {
      Object.entries(item).forEach(([key, value]) => {
        console.group(key + ' : ' + typeof value);
        expandedLog(value, maxDepth, depth + 1);
        console.groupEnd();
      });
    } else {
      console.log(item);
    }
  }

  const [gaugeChartData, setGaugeChartData] = useState({
    labels: [],
    datasets: [],
  });

  const gaugeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '80%',
    plugins: {
      tooltip: { enabled: false },
      legend: { display: false },
    },
    animations: {
      duration: 500, // Animation duration in milliseconds (1 second)
    },
  };

  const [lineChartData, setLineChartData] = useState({
    labels: [],
    datasets: [],
  });

  // console.log('lineChartData');
  // console.log(lineChartData);

  const lineChartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        min: 0,
        max: 70,
        ticks: {
          stepSize: 10,
        },
      },
    },
    plugins: {
      legend: { display: false },
    },
    animations: {
      duration: 500, // 1.5 seconds
    },
  };

  const [analysisChartData, setAnalysisChartData] = useState({
    labels: [],
    datasets: [],
  });

  // expandedLog(analysisChartData);

  const analysisChartOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
    plugins: {
      tooltip: { enabled: false },
      legend: { display: false },
    },
    animations: {
      duration: 500, // 2 seconds
    },
  };

  const handleEditIntervention = (index) => {
    setCurrentIntervention(data[index].interventions);
    setCurrentRowIndex(index);
    setIsModalOpen(true);
  };

  const handleSubmitIntervention = async () => {
    if (!currentIntervention.trim()) {
      alert('Please enter an intervention');
      return;
    }

    try {
      // Get the month/year for the current item's date
      const itemDate = new Date(data[currentRowIndex].date);
      const { year, month } = getMonthYearForDate(itemDate);
      
      const rowRef = ref(db, `/${name}/${year}/${month}/${data[currentRowIndex].id}`);
      
      await update(rowRef, {
        interventions: currentIntervention,
        isInterventionsUpdated: 'yes',
        lastUpdated: serverTimestamp(),
      });

      // Update local state
      const updatedData = [...data];
      updatedData[currentRowIndex].interventions = currentIntervention;
      updatedData[currentRowIndex].isInterventionsUpdated = 'yes';
      setData(updatedData);

      setCurrentIntervention('');
      setCurrentRowIndex(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error updating intervention:', error);
      alert('Error updating intervention. Please try again.');
    }
  };

  const handleEditCauseOfFall = (index) => {
    setCurrentCauseOfFall(data[index].cause);
    setCurrentCauseRowIndex(index);
    setIsCauseModalOpen(true);
  };

  const handleSubmitCauseOfFall = async () => {
    if (!currentCauseOfFall.trim()) {
      alert('Please enter a cause of fall');
      return;
    }

    try {
      // Get the month/year for the current item's date
      const itemDate = new Date(data[currentCauseRowIndex].date);
      const { year, month } = getMonthYearForDate(itemDate);
      
      const rowRef = ref(db, `/${name}/${year}/${month}/${data[currentCauseRowIndex].id}`);
      
      await update(rowRef, {
        cause: currentCauseOfFall,
        isCauseUpdated: 'yes',
        lastUpdated: serverTimestamp(),
      });

      // Update local state
      const updatedData = [...data];
      updatedData[currentCauseRowIndex].cause = currentCauseOfFall;
      updatedData[currentCauseRowIndex].isCauseUpdated = 'yes';
      setData(updatedData);

      setCurrentCauseOfFall('');
      setCurrentCauseRowIndex(null);
      setIsCauseModalOpen(false);
    } catch (error) {
      console.error('Error updating cause of fall:', error);
      alert('Error updating cause of fall. Please try again.');
    }
  };

  const handleEditPostFallNotes = (index) => {
    setCurrentPostFallNotes(data[index].postFallNotes);
    setCurrentPostFallNotesRowIndex(index);
    setIsPostFallNotesModalOpen(true);
  };

  const handleSubmitPostFallNotes = async () => {
    if (!currentPostFallNotes || currentPostFallNotes < 0) {
      alert('Please enter a valid number of post fall notes');
      return;
    }

    try {
      // Get the month/year for the current item's date
      const itemDate = new Date(data[currentPostFallNotesRowIndex].date);
      const { year, month } = getMonthYearForDate(itemDate);
      
      const rowRef = ref(db, `/${name}/${year}/${month}/${data[currentPostFallNotesRowIndex].id}`);
      
      await update(rowRef, {
        postFallNotes: currentPostFallNotes,
        isPostFallNotesUpdated: 'yes',
        lastUpdated: serverTimestamp(),
      });

      // Update local state
      const updatedData = [...data];
      updatedData[currentPostFallNotesRowIndex].postFallNotes = currentPostFallNotes;
      updatedData[currentPostFallNotesRowIndex].isPostFallNotesUpdated = 'yes';
      setData(updatedData);

      setCurrentPostFallNotes('');
      setCurrentPostFallNotesRowIndex(null);
      setIsPostFallNotesModalOpen(false);
    } catch (error) {
      console.error('Error updating post fall notes:', error);
      alert('Error updating post fall notes. Please try again.');
    }
  };

  const updateFallsChart = () => {
    const timeRange = fallsTimeRange;
    const currentFalls = countTotalFalls();
    let newData;

    if (currentFalls >= goal) {
      newData = [goal, 0];
    } else {
      newData = [currentFalls, goal - currentFalls];
    }

    let threeMonthX = [];
    let threeMonthY = [];

    // Special handling for specific homes
    switch(name) {
      case 'vmltc':
        threeMonthX = ['October', 'November', 'December'];
        threeMonthY = [39, 27, 33];  // Replace with your desired values
        break;
      case 'bonairltc':
        threeMonthX = ['October', 'November', 'December'];
        threeMonthY = [8, 6, 7];
        break;
      case 'oneill':
        threeMonthX = ['October', 'November', 'December'];
        threeMonthY = [15, 12, 13];
        break;
      case 'lancaster':
        threeMonthX = ['October', 'November', 'December'];
        threeMonthY = [7, 11, 9];
        break;
      case 'champlain':
        threeMonthX = ['October', 'November', 'December'];
        threeMonthY = [19, 14, 11];
        break;
      default:
        // Original logic for other homes
        for (const [key, value] of threeMonthData) {
          threeMonthX.push(months_forward[key]);
          threeMonthY.push(value.length);
        }
    }

    switch (timeRange) {
      case 'current':
        setGaugeChart(true);
        setGaugeChartData({
          datasets: [
            {
              data: newData,
              backgroundColor: ['rgba(76, 175, 80, 0.8)', 'rgba(200, 200, 200, 0.2)'],
              circumference: 180,
              rotation: 270,
            },
          ],
        });
        break;
      case '3months':
        setGaugeChart(false);
        setLineChartData({
          labels: threeMonthX,
          datasets: [
            {
              label: 'Number of Falls',
              data: threeMonthY,
              borderColor: 'rgb(76, 175, 80)',
              tension: 0.1,
            },
          ],
        });
        break;
      case '6months':
        setGaugeChart(false);
        setLineChartData({
          // labels: months.slice(2, 8),
          labels: ['April', 'May', 'June', 'July', 'August', 'September'],
          datasets: [
            {
              // label: ['April', 'May', 'June', 'July', 'August', 'September'],
              data: [, , , threeMonthData['07'].length, threeMonthData['08'].length, threeMonthData['09'].length],
              borderColor: 'rgb(76, 175, 80)',
              tension: 0.1,
            },
          ],
        });
        break;
      default:
        break;
    }
  };

  function countTotalFalls() {
    return data.length;
  }

  const updateAnalysisChart = () => {
    var selectedUnit = analysisUnit;
    var filteredData = analysisTimeRange === '3months' ? Array.from(threeMonthData.values()).flat() : data;

    if (selectedUnit !== 'allUnits') {
      filteredData = filteredData.filter(
        (fall) => {
          // Get the unit from either homeUnit or room field
          const unitValue = fall.homeUnit || fall.room;
          return unitValue?.trim() === selectedUnit?.trim();
        }
      );
    }

    let newLabels = [];
    let newData = [];

    switch (analysisType) {
      case 'timeOfDay':
        setAnalysisHeaderText('Falls by Time of Day');
        newLabels = ['Morning', 'Evening', 'Night'];
        var timeOfDayCounts = countFallsByTimeOfDay(filteredData, name);
        newData = [timeOfDayCounts.Morning, timeOfDayCounts.Evening, timeOfDayCounts.Night];
        break;
      
      case 'location':
        setAnalysisHeaderText('Falls by Location');
        var locationCounts = countFallsByLocation(filteredData);
        newLabels = Object.keys(locationCounts);
        newData = Object.values(locationCounts);
        break;

      case 'injuries':
        setAnalysisHeaderText('Falls by Injury Description');
        var injuryCounts = countFallsByExactInjury(filteredData);
        newLabels = Object.keys(injuryCounts);
        newData = Object.values(injuryCounts);
        break;

      case 'hir':
        setAnalysisHeaderText('High Injury Risk (HIR) Falls');
        var hirCount = countFallsByHIR(filteredData);
        newLabels = [getMonthFromTimeRange(analysisTimeRange)];
        newData = [hirCount];
        break;

      case 'residents':
        setAnalysisHeaderText('Residents with Recurring Falls');
        var recurringFalls = countResidentsWithRecurringFalls(filteredData);
        newLabels = Object.keys(recurringFalls);
        newData = Object.values(recurringFalls);
        break;

      case 'dayOfWeek':
        setAnalysisHeaderText('Falls by Day of Week');
        var dayOfWeekCounts = countFallsByDayOfWeek(filteredData);
        // Order the days of week
        const orderedDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        newLabels = orderedDays;
        newData = orderedDays.map(day => dayOfWeekCounts[day]);
        break;

      case 'hour':
        setAnalysisHeaderText('Falls by Hour of Day');
        var hourCounts = countFallsByHour(filteredData);
        // Create labels for each hour (0-23)
        newLabels = Array.from({length: 24}, (_, i) => {
          const hour = i % 12 || 12; // Convert 0-23 to 12-hour format
          const period = i < 12 ? 'AM' : 'PM';
          return `${hour}${period}`;
        });
        newData = Array.from({length: 24}, (_, i) => hourCounts[i] || 0);
        break;
    }

    setAnalysisChartData({
      labels: newLabels,
      datasets: [
        {
          data: newData,
          backgroundColor: 'rgba(76, 175, 80, 0.6)',
          borderColor: 'rgb(76, 175, 80)',
          borderWidth: 1,
        },
      ],
    });
  };

  const tableRef = useRef(null);

  const handleSavePDF = async () => {
    // work no blank but last pages lack

    if (tableRef.current) {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4',
      });
      tableRef.current.style.overflowX = 'visible';
      const pageHeight = pdf.internal.pageSize.height;
      const pageWidth = pdf.internal.pageSize.width;
      const totalHeight = tableRef.current.scrollHeight;
      tableRef.current.scrollTop = totalHeight - pageHeight;
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        width: tableRef.current.scrollWidth,
        height: 1.25 * totalHeight,
      });
      // console.log('canvas width');
      // console.log(canvas.width);
      // console.log('canvas height');
      // console.log(canvas.height);
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth;
      // const newWindow = window.open();
      // newWindow.document.write(`<img src="${imgData}" alt="Captured Image"/>`);

      // canvas.height / canvas.width = imgheight / imgwidth
      // imgheight = canvas.height * imgwidth / canvas.width
      const imgHeight = (canvas.height * imgWidth) / canvas.width; // 按比例压缩高度
      let position = 0;

      // Loop to split the canvas and add to each page
      while (position < imgHeight) {
        pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);

        position += pageHeight;

        // If the current height has not reached the total image height, add a new page
        if (position < imgHeight) {
          pdf.addPage();
        }
      }
      tableRef.current.style.overflowX = 'auto';
      pdf.save('Falls_Tracking_Table.pdf');
    }
  };

  const handleSaveCSV = () => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    // Create filename based on date range
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const filename = `${name}_${startDateStr}_to_${endDateStr}_falls_data.csv`;

    // Prepare CSV data
    const csvData = data.map((item) => ({
      Date: item.date || '',
      Name: item.name || '',
      Time: item.time || '',
      Location: item.location || item.incident_location || '',
      RHA: item.homeUnit || item.room || '',
      'Nature of Fall/Cause': item.cause || '',
      Interventions: item.interventions || '',
      'HIR initiated': item.hir || '',
      Injury: item.injury || '',
      'Transfer to Hospital': item.transferToHospital || '',
      'PT Ref': item.ptRef || '',
      'Physician/NP Notification': item.physicianNotification || '',
      'POA Contacted': item.poaContacted || '',
      'Risk Management Incident Fall Written': item.riskManagementIncidentFallWritten || '',
      '3 Post Fall Notes in 72hrs': item.postFallNotes || '',
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);
  };

  const handleUpdateCSV = async (itemId, newValue, name, changeType) => {
    try {
      // Find the item in data array by ID
      const itemIndex = data.findIndex(item => item.id === itemId);
      if (itemIndex === -1) {
        console.error('Item not found with ID:', itemId);
        return;
      }

      // Get the month/year for the current item's date
      const itemDate = new Date(data[itemIndex].date);
      const { year, month } = getMonthYearForDate(itemDate);
      
      const rowRef = ref(db, `/${name}/${year}/${month}/${itemId}`);
      
      await update(rowRef, {
        [changeType]: newValue,
        lastUpdated: serverTimestamp(),
      });

      // Update local state
      const updatedData = [...data];
      updatedData[itemIndex][changeType] = newValue;
      setData(updatedData);

      console.log(`${changeType} updated successfully for item ${itemId}`);
    } catch (error) {
      console.error(`Error updating ${changeType}:`, error);
      alert(`Error updating ${changeType}. Please try again.`);
    }
  };

  const getDataLengths = async () => {
    setIsLoading(true);
    
    if (incidentType !== 'Falls') {
      // Use mock data for other incident types
      const mockData = MOCK_INCIDENT_DATA[incidentType];
      setIsLoading(false);
      return mockData;
    }

    // Original falls data fetching logic
    const homes = ['home1', 'home2', 'home3', 'home4', 'vmltc', 'oneill', 'lancaster', 'goderich'];
    const dataLengths = {};
    
    try {
      // ... rest of the original function ...
    } catch (error) {
      console.error('Error fetching data:', error);
      return {};
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Start measuring fetch data time
    performance.mark('start-fetch-data');

    // Calculate the date range
    const startYear = startDate.getFullYear();
    const startMonth = getMonthNumber(startDate);
    const endYear = endDate.getFullYear();
    const endMonth = getMonthNumber(endDate);

    // Get all months between start and end date
    const monthsToFetch = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = getMonthNumber(currentDate);
      monthsToFetch.push({ year, month });
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
      currentDate.setDate(1);
    }

    // Fetch data for all months in the range
    const allFallsData = [];
    const listeners = [];

    monthsToFetch.forEach(({ year, month }) => {
      const monthRef = ref(db, `/${name}/${year}/${month}`);
      
      const listener = onValue(monthRef, (snapshot) => {
        if (snapshot.exists()) {
          const fallsData = snapshot.val();
          const monthData = Object.values(fallsData).map(item => ({
            ...item,
            id: item.id || ''
          }));
          
          // Filter by date range within the month
          const filteredData = monthData.filter(item => {
            if (!item.date) return false;
            const itemDate = new Date(item.date);
            return itemDate >= startDate && itemDate <= endDate;
          });
          
          allFallsData.push(...filteredData);
          
          // Update data state
          const sortedData = allFallsData.sort(
            (a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time)
          );
          
          // Filter by unit if a specific unit is selected
          let finalData = sortedData;
          if (desiredUnit !== 'allUnits') {
            finalData = sortedData.filter(fall => {
              const unitValue = fall.homeUnit || fall.room;
              return unitValue?.trim() === desiredUnit?.trim();
            });
          }
          
          // Apply color processing when setting data
          const processedData = processDataColors(finalData);
          setData(processedData);
        }
      });
      
      listeners.push({ ref: monthRef, listener });
    });

    // Cleanup listeners on unmount
    return () => {
      listeners.forEach(({ ref, listener }) => {
        off(ref, listener);
      });
    };
  }, [startDate, endDate, desiredUnit, name]);

  // Keep the old useEffect for backward compatibility but update it to use the new date range
  useEffect(() => {
    // Update desiredMonth and desiredYear based on startDate
    setDesiredMonth(getMonthName(startDate));
    setDesiredYear(getYearFromDate(startDate));
  }, [startDate]);

  useEffect(() => {
    updateFallsChart();
    // console.log('Falls Chart');
  }, [fallsTimeRange, data, startDate, endDate]);

  useEffect(() => {
    updateAnalysisChart();
    // console.log('Analysis Chart');
  }, [analysisType, analysisTimeRange, analysisUnit, data, startDate, endDate]);

  // Process data colors when raw data is first loaded
  const processDataColors = (rawData) => {
    return rawData.map((item, index) => {
      // Don't reprocess if color is already set properly
      if (item.colorProcessed) {
        return item;
      }
      
      // Convert postFallNotes to number if it's a string
      const postFallNotesCount = parseInt(item.postFallNotes) || 0;
      
      // Determine color based on post-fall notes count
      let postFallNotesColor = '';
      let backgroundColor = '';
      
      if (postFallNotesCount >= 3) {
        postFallNotesColor = 'green';
        backgroundColor = '#4CAF50'; // Green for 3+ notes
      } else if (postFallNotesCount === 2) {
        postFallNotesColor = 'orange';
        backgroundColor = '#FF9800'; // Orange for 2 notes
      } else if (postFallNotesCount === 1) {
        postFallNotesColor = 'yellow';
        backgroundColor = '#FFC107'; // Yellow for 1 note
      } else {
        postFallNotesColor = 'red';
        backgroundColor = '#F44336'; // Red for 0 notes
      }
      
      return {
        ...item,
        color: backgroundColor,
        postFallNotesColor: postFallNotesColor,
        colorProcessed: true // Flag to avoid reprocessing
      };
    });
  };

  // Load insights when date range changes
  useEffect(() => {
    const loadInsightData = async () => {
      try {
        // Use the current month/year from start date for insights
        const { year, month } = getCurrentMonthYear();
        
        const insightsRef = ref(db, `/${name}/insights/${year}/${month}`);
        
        const snapshot = await get(insightsRef);
        if (snapshot.exists()) {
          const insightsData = snapshot.val();
          const insightsArray = Object.values(insightsData).map(insight => ({
            ...insight,
            id: insight.id || Object.keys(insightsData).find(key => insightsData[key] === insight)
          }));
          setInsights(insightsArray);
        } else {
          setInsights([]);
        }
      } catch (error) {
        console.error('Error loading insights:', error);
        setInsights([]);
      }
    };
    loadInsightData();
  }, [startDate, endDate, name]);

  // Add this log to always show the current selection
  useEffect(() => {
    console.log('Current selection:', { desiredMonth, desiredYear, desiredUnit });
  }, [desiredMonth, desiredYear, desiredUnit]);

  // Handle unit change
  const handleUnitChange = (event) => {
    setDesiredUnit(event.target.value);
  };

  // Check for unreviewed residents
  const checkForUnreviewedResidents = async () => {
    try {
      // Use the current month/year from start date for reviews
      const { year, month } = getCurrentMonthYear();
      
      const fallsRef = ref(db, `/${name}/${year}/${month}`);
      const reviewsRef = ref(db, `/reviews/${name}/${year}/${month}`);

      const [fallsSnapshot, reviewsSnapshot] = await Promise.all([
        get(fallsRef),
        get(reviewsRef)
      ]);

      if (fallsSnapshot.exists()) {
        const fallsData = fallsSnapshot.val();
        const fallsArray = Object.values(fallsData);

        if (reviewsSnapshot.exists()) {
          const reviewsData = reviewsSnapshot.val();
          const reviewedResidents = Object.keys(reviewsData);

          const unreviewedResidents = fallsArray.filter(fall => 
            !reviewedResidents.includes(fall.name)
          );

          if (unreviewedResidents.length > 0) {
            // Get unique resident names to avoid duplicates
            const uniqueResidentNames = [...new Set(unreviewedResidents.map(r => r.name))];
            const residentNames = uniqueResidentNames.join(', ');
            // alert(`The following residents have not been reviewed: ${residentNames}`);
          } else {
            alert('All residents have been reviewed for this month.');
          }
        } else {
          // No reviews exist, so all residents need review
          // Get unique resident names to avoid duplicates
          const uniqueResidentNames = [...new Set(fallsArray.map(r => r.name))];
          const residentNames = uniqueResidentNames.join(', ');
                 }
      } else {
        alert('No falls data found for this month.');
      }
    } catch (error) {
      console.error('Error checking for unreviewed residents:', error);
      alert('Error checking for unreviewed residents. Please try again.');
    }
  };

  // Mark review as done
  const markReviewDone = async (resident) => {
    try {
      // Use the current month/year from start date for reviews
      const { year, month } = getCurrentMonthYear();
      
      const reviewRef = ref(db, `/reviews/${name}/${year}/${month}/${resident.name}`);
      
      await set(reviewRef, {
        name: resident.name,
        reviewDate: serverTimestamp(),
        reviewedBy: 'Current User', // You might want to get this from auth
        status: 'reviewed'
      });

      alert(`Review marked as done for ${resident.name}`);
    } catch (error) {
      console.error('Error marking review as done:', error);
      alert('Error marking review as done. Please try again.');
    }
  };

  // Handle remind later
  const handleRemindLater = async (resident) => {
    try {
      // Use the current month/year from start date for reviews
      const { year, month } = getCurrentMonthYear();
      
      const reviewRef = ref(db, `/reviews/${name}/${year}/${month}/${resident.name}`);
      
      await set(reviewRef, {
        name: resident.name,
        reminderDate: serverTimestamp(),
        status: 'reminded',
        reminderCount: (resident.reminderCount || 0) + 1
      });

      alert(`Reminder set for ${resident.name}`);
      setCurrentResidentIndex(0); // Reset index after reminding
    } catch (error) {
      console.error('Error setting reminder:', error);
      alert('Error setting reminder. Please try again.');
    }
  };

  // Handle outcome change
  const handleOutcomeChange = async (insightId, newOutcome) => {
    try {
      // Use the current month/year from start date for insights
      const { year, month } = getCurrentMonthYear();
      
      const insightRef = ref(db, `/${name}/insights/${year}/${month}/${insightId}`);
      
      await update(insightRef, {
        outcome: newOutcome,
        lastUpdated: serverTimestamp()
      });

      // Update local state
      const updatedInsights = insights.map(insight => 
        insight.id === insightId 
          ? { ...insight, outcome: newOutcome }
          : insight
      );
      setInsights(updatedInsights);

      console.log('Insight outcome updated successfully');
    } catch (error) {
      console.error('Error updating insight outcome:', error);
      alert('Error updating insight outcome. Please try again.');
    }
  };

  // Handle review insight
  const handleReviewInsight = async (insightId) => {
    try {
      // Use the current month/year from start date for insights
      const { year, month } = getCurrentMonthYear();
      
      const insightRef = ref(db, `/${name}/insights/${year}/${month}/${insightId}`);
      
      await update(insightRef, {
        reviewed: true,
        reviewDate: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });

      // Update local state
      const updatedInsights = insights.map(insight => 
        insight.id === insightId 
          ? { ...insight, reviewed: true, reviewDate: new Date() }
          : insight
      );
      setInsights(updatedInsights);

      console.log('Insight marked as reviewed');
    } catch (error) {
      console.error('Error marking insight as reviewed:', error);
      alert('Error marking insight as reviewed. Please try again.');
    }
  };

  // Load available year/month data
  useEffect(() => {
    const yearsRef = ref(db, `/${name}`);
    console.log('Checking available years/months for:', name);
    
    onValue(yearsRef, (snapshot) => {
      const yearMonthMapping = {};
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Get all available years and months from Firebase
        Object.keys(data).forEach(year => {
          if (!yearMonthMapping[year]) {
            yearMonthMapping[year] = [];
          }
          
          // Get all months for this year
          Object.keys(data[year] || {}).forEach(month => {
            if (data[year][month]) {
              yearMonthMapping[year].push(months_forward[month]);
            }
          });
          
          // Sort months chronologically
          yearMonthMapping[year].sort((a, b) => {
            return months_backword[a] - months_backword[b];
          });
        });

        // Sort years in descending order
        const sortedYears = Object.keys(yearMonthMapping).sort((a, b) => b - a);
        const sortedMapping = {};
        sortedYears.forEach(year => {
          sortedMapping[year] = yearMonthMapping[year];
        });

        console.log('Available year/month mapping:', sortedMapping);
        setAvailableYearMonth(sortedMapping);
      }
    });

    return () => {
      off(yearsRef);
    };
  }, [name]);

  // Initial check for unreviewed residents
  useEffect(() => {
    checkForUnreviewedResidents();
    const interval = setInterval(checkForUnreviewedResidents, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [name, startDate, endDate]);

  return (
    <div className={styles.dashboard} ref={tableRef}>
      <h1>{title}</h1>

      {/* <button className="logout-button" onClick={logout}>
        Log Out
      </button> */}

      <div className={styles['chart-container']}>
        <div className={styles.chart}>
          <div className={styles['gauge-container']}>
            <h2 style={{ paddingTop: '7.5px' }}>Falls Overview</h2>
            <select
              id="fallsTimeRange"
              value={fallsTimeRange}
              onChange={(e) => {
                setFallsTimeRange(e.target.value);
              }}
            >
              <option value="current">This Month</option>
              <option value="3months">Past 3 Months</option>
            </select>
            {gaugeChart ? (
              <div id="gaugeContainer">
                <div className={styles.gauge}>
                  {gaugeChartData.datasets.length > 0 && <Doughnut data={gaugeChartData} options={gaugeChartOptions} />}
                  <div className={styles['gauge-value']}>{data.length}</div>
                  <br />
                  <div className={styles['gauge-label']}>falls this month</div>
                  <div className={styles['gauge-goal']}>
                    Goal: <span id="fallGoal">{goal}</span>
                  </div>
                  <br />
                  <div className={styles['gauge-scale']}>
                    <span>0</span>
                    <span>{goal}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div id="lineChartContainer">
                {lineChartData.datasets.length > 0 && <Line data={lineChartData} options={lineChartOptions} />}
              </div>
            )}
          </div>
        </div>

        <div className={styles.chart}>
          <h2>{analysisHeaderText}</h2>
          <select
            id="fallsAnalysisType"
            value={analysisType}
            onChange={(e) => {
              setAnalysisType(e.target.value);
            }}
          >
            {/* <option value="timeOfDay">Time of Day</option> */}
            <option value="location">Location</option>
            {/* <option value="injuries">Injuries</option> */}
            <option value="residents">Residents w/ Recurring Falls</option>
            <option value="dayOfWeek">Falls by Day of Week</option>
            <option value="hour">Falls by Hour</option>
          </select>

          <select
            id="analysisTimeRange"
            value={analysisTimeRange}
            onChange={(e) => {
              setAnalysisTimeRange(e.target.value);
            }}
          >
            <option value="current">Current Month</option>
            <option value="3months">Past 3 Months</option>
          </select>

          <select
            id="unitSelection"
            value={analysisUnit}
            onChange={(e) => {
              setAnalysisUnit(e.target.value);
            }}
          >
            {unitSelectionValues && unitSelectionValues.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>

          {analysisChartData.datasets.length > 0 && <Bar data={analysisChartData} options={analysisChartOptions} />}
        </div>
      </div>
      <div className={styles['table-header']}>
     
        <div className={styles['header']}>
          <h2>
            Falls Tracking Table: {formatDateForDisplay(startDate)} - {formatDateForDisplay(endDate)}
          </h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Start Date:</label>
              <input
                type="date"
                value={formatDateForInput(startDate)}
                onChange={handleStartDateChange}
                max={formatDateForInput(endDate)}
                style={{
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>End Date:</label>
              <input
                type="date"
                value={formatDateForInput(endDate)}
                onChange={handleEndDateChange}
                min={formatDateForInput(startDate)}
                max={formatDateForInput(getCurrentDate())}
                style={{
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Unit:</label>
              <select 
                onChange={handleUnitChange} 
                value={desiredUnit}
                style={{
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                {unitSelectionValues && unitSelectionValues.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div>
          <button className={styles['download-button']} onClick={handleSaveCSV}>
            Download as CSV
          </button>
          <button className={styles['download-button']} onClick={handleSavePDF}>
            Download as PDF
          </button>
        </div>
      </div>
      <table style={{ width: '100%' }}>
        {/* Set the table width to 100% to make it wider */}
        <thead>
          <tr>
            <th style={{ fontSize: '18px' }}>Date</th> {/* Increased font size */}
            <th style={{ fontSize: '18px' }}>Name</th>
            <th style={{ fontSize: '18px' }}>Time</th>
            <th style={{ fontSize: '18px' }}>Location</th>
            <th style={{ fontSize: '18px' }}>RHA</th>
            <th style={{ fontSize: '18px' }}>Nature of Fall/Cause</th>
            <th style={{ fontSize: '18px' }}>Interventions</th>
            <th style={{ fontSize: '18px' }}>HIR intiated</th>
            <th style={{ fontSize: '18px' }}>Injury</th>
            <th style={{ fontSize: '18px' }}>Transfer to Hospital</th>
            <th style={{ fontSize: '18px' }}>PT Ref</th>
            <th style={{ fontSize: '18px' }}>Physician/NP Notification (If Applicable)</th>
            <th style={{ fontSize: '18px' }}>POA Contacted</th>
            <th style={{ fontSize: '18px' }}>Risk Management Incident Fall Written</th>
            <th style={{ fontSize: '18px' }}>3 Post Fall Notes in 72hrs</th>
          </tr>
        </thead>
        <tbody id="fallsTableBody">
          {data && data.map((item, i) => (
            <tr 
              style={{ 
                backgroundColor: item.cause === 'No Fall Note' ? '#f8b9c6' : 'inherit' 
              }}
              key={i}
            >
              <td style={{ whiteSpace: 'nowrap', fontSize: '16px' }}>{item.date}</td> {/* Increased font size */}
              <td style={{ fontSize: '16px' }}>{item.name}</td>
              <td style={{ fontSize: '16px' }}>{item.time}</td>
              <td style={{ fontSize: '16px' }}>{item.location || item.incident_location}</td>
              <td style={{ fontSize: '16px' }}>{item.homeUnit || item.room}</td>
              {/* <td style={{ fontSize: '16px' }}>{item.cause}</td> */}
              <td style={{ fontSize: '16px', backgroundColor: item.isCauseUpdated === 'yes' ? 'rgba(76, 175, 80, 0.3)' : 'inherit' }}>
                {item.cause}
                <br />
                <button onClick={() => handleEditCauseOfFall(i)}>Edit</button>
              </td>
              <td
                style={{ 
                  fontSize: '16px', 
                  backgroundColor: item.isInterventionsUpdated === 'yes' ? 'rgba(76, 175, 80, 0.3)' : 'inherit' 
                }}
              >
                {item.interventions}
                <br></br>
                <button onClick={() => handleEditIntervention(i)}>Edit</button>
              </td>
              <td style={{ fontSize: '16px', backgroundColor: item.isHirUpdated === 'yes' ? 'rgba(76, 175, 80, 0.3)' : 'inherit' }}>
                <select
                  value={item.hir === 'yes' || item.hir === 'Yes' ? 'Yes' : item.hir === 'no' || item.hir === 'No' ? 'No' : item.hir === 'not applicable' || item.hir === 'Not Applicable' ? 'Not Applicable' : item.hir}
                  onChange={(e) => handleUpdateCSV(item.id, e.target.value, name, 'hir')}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>
              </td>
              <td style={{ fontSize: '16px' }}>{item.injury || item.injuries}</td>
              <td style={{ fontSize: '16px', backgroundColor: item.isHospitalUpdated === 'yes' ? 'rgba(76, 175, 80, 0.3)' : 'inherit' }}>
                <select
                  value={item.transfer_to_hospital === 'yes' || item.transfer_to_hospital === 'Yes' ? 'Yes' : 
                         item.transfer_to_hospital === 'no' || item.transfer_to_hospital === 'No' ? 'No' : 
                         item.transfer_to_hospital || ''}
                  onChange={(e) => handleUpdateCSV(item.id, e.target.value, name, 'transfer_to_hospital')}
                >
                  <option value="">Select...</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </td>
              <td style={{ fontSize: '16px', backgroundColor: item.isPtRefUpdated === 'yes' ? 'rgba(76, 175, 80, 0.3)' : 'inherit' }}>
                <select
                  value={item.ptRef === 'yes' || item.ptRef === 'Yes' ? 'Yes' : item.ptRef === 'no' || item.ptRef === 'No' ? 'No' : item.ptRef}
                  onChange={(e) => handleUpdateCSV(item.id, e.target.value, name, 'ptRef')}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </td>
              <td style={{ fontSize: '16px', backgroundColor: item.isPhysicianRefUpdated === 'yes' ? 'rgba(76, 175, 80, 0.3)' : 'inherit' }}>
                <select
                  value={item.physicianRef === 'yes' || item.physicianRef === 'Yes'
                    ? 'Yes'
                    : item.physicianRef === 'no' || item.physicianRef === 'No'
                    ? 'No'
                    : item.physicianRef}
                  onChange={(e) => handleUpdateCSV(item.id, e.target.value, name, 'physicianRef')}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="N/A">N/A</option>
                </select>
              </td>
              <td className={item.poaContacted === 'no' ? styles.cellRed : ''} 
                style={{ 
                  fontSize: '16px', 
                }}
              >
                <select
                  value={item.poaContacted === 'yes' || item.poaContacted === 'Yes'
                    ? 'Yes'
                    : item.poaContacted === 'no' || item.poaContacted === 'No'
                    ? 'No'
                    : item.poaContacted}
                  onChange={(e) => handleUpdateCSV(item.id, e.target.value, name, 'poaContacted')}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </td>
              <td style={{ fontSize: '16px', backgroundColor: item.isIncidentReportUpdated === 'yes' ? 'rgba(76, 175, 80, 0.3)' : 'inherit' }}>
                <select
                  value={
                    item.incidentReport === 'yes' || item.incidentReport === 'Yes'
                      ? 'Yes'
                      : item.incidentReport === 'no' || item.incidentReport === 'No'
                      ? 'No'
                      : item.incidentReport
                  }
                  onChange={(e) => handleUpdateCSV(item.id, e.target.value, name, 'incidentReport')}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </td>
              {/* <td className={item.postFallNotesColor === 'red' ? styles.cellRed : ''} style={{ fontSize: '16px' }}>
                {item.postFallNotes}
              </td> */}
              <td
                className={item.postFallNotesColor === 'red' ? styles.cellRed : ''}
                style={{
                  fontSize: '16px',
                  color: item.isPostFallNotesUpdated === 'yes' ? '#179c4e' : '#000000',
                  fontWeight: 'bold',
                }}
              >
                {item.postFallNotes}
                <br />
                <button onClick={() => handleEditPostFallNotes(i)}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isModalOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div>
              <h2>Edit Interventions</h2>
              <textarea value={currentIntervention} onChange={(e) => setCurrentIntervention(e.target.value)} />
              <br />
              <button onClick={handleSubmitIntervention}>Submit</button>
              <button onClick={() => setIsModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {isCauseModalOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div>
              <h2>Edit Cause of Falls</h2>
              <textarea value={currentCauseOfFall} onChange={(e) => setCurrentCauseOfFall(e.target.value)} />
              <br />
              <button onClick={handleSubmitCauseOfFall}>Submit</button>
              <button onClick={() => setIsCauseModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {isPostFallNotesModalOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div>
              <h2>Edit Post Fall Notes</h2>
              <textarea value={currentPostFallNotes} onChange={(e) => setCurrentPostFallNotes(e.target.value)} />
              <br />
              <button onClick={handleSubmitPostFallNotes}>Submit</button>
              <button onClick={() => setIsPostFallNotesModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showModal && residentsNeedingReview.length > 0 && residentsNeedingReview[currentResidentIndex] && (
        <Modal 
          showModal={true}
          handleClose={() => setShowModal(false)}
          showCloseButton={false}
          modalContent={
            <div>
              <h3 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '15px' }}>Special Care Review Needed:</h3>
              <p style={{ fontSize: '18px', marginBottom: '25px', }}>
                <b style={{ fontSize: '18px', fontWeight: 'bold' }}> 
                  {residentsNeedingReview[currentResidentIndex]?.name} 
                </b> has had 3 or more falls 
                in the past month. Have you completed a special care review?
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'left', marginBottom: '25px' }}>
                <button 
                  onClick={() => residentsNeedingReview[currentResidentIndex] && 
                    markReviewDone(residentsNeedingReview[currentResidentIndex])}
                  style={{ padding: '10px', backgroundColor: 'green', color: 'white', fontFamily: 'inherit', fontSize: '16px', borderRadius: '12px', border: 'transparent', cursor: 'pointer'}}
                >
                  Yes, Review Complete
                </button>
                <button 
                  onClick={() => handleRemindLater(residentsNeedingReview[currentResidentIndex])}
                  style={{ backgroundColor: '#D3D3D3', padding: '10px', fontFamily: 'inherit', fontSize: '16px', fontFamily: 'inherit', borderRadius: '12px', border: 'transparent', cursor: 'pointer'}}
                >
                  Remind me in 24 hours
                </button>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}