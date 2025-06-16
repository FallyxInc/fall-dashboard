import React, { useEffect, useState, useRef } from 'react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import styles from '../styles/Dashboard.module.css';
import { useNavigate } from 'react-router-dom';
import * as Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { Chart, ArcElement, PointElement, LineElement } from 'chart.js';
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
  
  const getCurrentMonth = () => {
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    return months_forward[month];
  };
  
  const [desiredMonth, setDesiredMonth] = useState(getCurrentMonth());
  const [desiredYear, setDesiredYear] = useState(new Date().getFullYear());
  const [desiredUnit, setDesiredUnit] = useState('allUnits');
  const [availableYearMonth, setAvailableYearMonth] = useState({});

  const [gaugeChart, setGaugeChart] = useState(true);
  const [fallsTimeRange, setFallsTimeRange] = useState('current');
  const [analysisType, setAnalysisType] = useState('timeOfDay');
  const [analysisTimeRange, setAnalysisTimeRange] = useState('current');
  const [analysisUnit, setAnalysisUnit] = useState('allUnits');
  const [analysisHeaderText, setAnalysisHeaderText] = useState('Falls by Time of Day');
  const [totalFalls, setTotalFalls] = useState(0); // New state for total falls

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

  // Chart data and options for Falls Overview (Doughnut and Line)
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
  };

  const [lineChartData, setLineChartData] = useState({
    labels: [],
    datasets: [],
  });

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
  };

  // Analysis Chart data and options (Bar)
  const [analysisChartData, setAnalysisChartData] = useState({
    labels: [],
    datasets: [],
  });

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
  };

  // --- Functions for Modals ---
  const handleEditIntervention = (index) => {
    setCurrentIntervention(data[index].interventions);
    setCurrentRowIndex(index);
    setIsModalOpen(true);
  };

  const handleSubmitIntervention = () => {
    if (currentIntervention === data[currentRowIndex].interventions) {
      setIsModalOpen(false);
      return;
    }

    const updatedData = [...data];
    updatedData[currentRowIndex].interventions = currentIntervention;
    updatedData[currentRowIndex].isInterventionsUpdated = 'yes';

    const rowRef = ref(db, `/millCreek/${desiredYear}/${months_backword[desiredMonth]}/row-${data[currentRowIndex].id}`);
    update(rowRef, {
      interventions: currentIntervention,
      isInterventionsUpdated: 'yes',
    })
      .then(() => {
        setData(updatedData);
        setIsModalOpen(false);
      })
      .catch((error) => {
        console.error('Error updating intervention:', error);
      });
  };

  const handleEditCauseOfFall = (index) => {
    setCurrentCauseOfFall(data[index].cause);
    setCurrentCauseRowIndex(index);
    setIsCauseModalOpen(true);
  };

  const handleSubmitCauseOfFall = () => {
    if (currentCauseOfFall === data[currentCauseRowIndex].cause) {
      setIsCauseModalOpen(false);
      return;
    }

    const updatedData = [...data];
    updatedData[currentCauseRowIndex].cause = currentCauseOfFall;
    updatedData[currentCauseRowIndex].isCauseUpdated = 'yes';

    const rowRef = ref(
      db,
      `/millCreek/${desiredYear}/${months_backword[desiredMonth]}/row-${data[currentCauseRowIndex].id}`
    );
    update(rowRef, { cause: currentCauseOfFall, isCauseUpdated: 'yes' })
      .then(() => {
        setData(updatedData);
        setIsCauseModalOpen(false);
      })
      .catch((error) => {
        console.error('Error updating cause of fall:', error);
      });
  };

  const handleEditPostFallNotes = (index) => {
    setCurrentPostFallNotes(data[index].postFallNotes);
    setCurrentPostFallNotesRowIndex(index);
    setIsPostFallNotesModalOpen(true);
  };

  const handleSubmitPostFallNotes = () => {
    if (currentPostFallNotes === data[currentPostFallNotesRowIndex].postFallNotes) {
      setIsPostFallNotesModalOpen(false);
      return;
    }

    let updatedData = [...data];
    updatedData[currentPostFallNotesRowIndex].postFallNotes = currentPostFallNotes;
    updatedData[currentPostFallNotesRowIndex].isPostFallNotesUpdated = 'yes';
    updatedData = markPostFallNotes(updatedData); // This function is from DashboardUtils

    const rowRef = ref(
      db,
      `/millCreek/${desiredYear}/${months_backword[desiredMonth]}/row-${data[currentPostFallNotesRowIndex].id}`
    );
    update(rowRef, { postFallNotes: currentPostFallNotes, isPostFallNotesUpdated: 'yes' })
      .then(() => {
        setData(updatedData);
        setIsPostFallNotesModalOpen(false);
      })
      .catch((error) => {
        console.error('Error updating post fall notes:', error);
      });
  };

  // --- Chart Update Functions ---
  const updateFallsChart = () => {
    const timeRange = fallsTimeRange;
    const currentFalls = data.length;
    let newData;

    if (currentFalls >= goal) {
      newData = [goal, 0];
    } else {
      newData = [currentFalls, goal - currentFalls];
    }

    // Get falls from the last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const recentFalls = data.filter(fall => {
      const fallDate = new Date(fall.date);
      return fallDate >= threeDaysAgo;
    }).sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));

    // Create summary content
    const summaryContent = recentFalls.length > 0 ? (
      <div style={{ padding: '10px' }}>
        <h3 style={{ marginBottom: '10px', color: '#2B59C3' }}>Recent Falls Summary (Last 3 Days)</h3>
        {recentFalls.map((fall, index) => (
          <div key={index} style={{ 
            marginBottom: '15px', 
            padding: '10px', 
            backgroundColor: index % 2 === 0 ? '#E0F2F7' : '#FFEBEE',
            borderRadius: '5px'
          }}>
            <div style={{ fontWeight: 'bold' }}>{fall.name}</div>
            <div>Date: {fall.date} at {fall.time}</div>
            <div>Location: {fall.location || fall.incident_location}</div>
            <div>Injury: {fall.injury || fall.injuries || 'None reported'}</div>
            {fall.cause && <div>Cause: {fall.cause}</div>}
          </div>
        ))}
      </div>
    ) : (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        No falls reported in the last 3 days
      </div>
    );

    let threeMonthX = [];
    let threeMonthY = [];

    // Populate threeMonthX and threeMonthY from threeMonthData map
    for (const [key, value] of threeMonthData) {
      threeMonthX.push(months_forward[key]);
      threeMonthY.push(value.length);
    }

    switch (timeRange) {
      case 'current':
        setGaugeChart(true);
        setGaugeChartData({
          datasets: [
            {
              data: newData,
              backgroundColor: ['rgba(43, 89, 195, 0.8)', 'rgba(200, 200, 200, 0.2)'],
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
              borderColor: 'rgb(43, 89, 195)',
              tension: 0.1,
            },
          ],
        });
        break;
      default:
        break;
    }
  };

  const updateAnalysisChart = () => {
    var selectedUnit = analysisUnit;
    var filteredData = analysisTimeRange === '3months' ? Array.from(threeMonthData.values()).flat() : data;

    if (selectedUnit !== 'allUnits') {
      filteredData = filteredData.filter(
        (fall) => {
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
        var timeOfDayCounts = countFallsByTimeOfDay(filteredData, 'millCreek');
        newLabels = ['Morning', 'Evening', 'Night'];
        newData = [timeOfDayCounts.Morning, timeOfDayCounts.Evening, timeOfDayCounts.Night];
        break;

      case 'residents':
        setAnalysisHeaderText('Falls by Resident Name');
        var recurringFalls = countResidentsWithRecurringFalls(filteredData);
        // Sort by count in descending order
        const sortedResidents = Object.entries(recurringFalls)
          .sort(([,a], [,b]) => b - a);
        newLabels = sortedResidents.map(([label]) => label);
        newData = sortedResidents.map(([,count]) => count);
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

      default:
        setAnalysisHeaderText('Falls Overview');
        newLabels = [];
        newData = [];
        break;
    }

    setAnalysisChartData({
      labels: newLabels,
      datasets: [
        {
          data: newData,
          backgroundColor: 'rgba(43, 89, 195, 0.6)',
          borderColor: 'rgb(43, 89, 195)',
          borderWidth: 1,
        },
      ],
    });
  };

  const tableRef = useRef(null);

  const handleSavePDF = async () => {
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
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let position = 0;

      while (position < imgHeight) {
        pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
        position += pageHeight;
        if (position < imgHeight) {
          pdf.addPage();
        }
      }
      tableRef.current.style.overflowX = 'auto';
      pdf.save('Falls_Tracking_Table.pdf');
    }
  };

  const handleSaveCSV = () => {
    const modifiedData = data.map(item => ({
      ...item,
      'Significant Injury Flag': 
        item.injuries?.toLowerCase().includes('head injury') || 
        item.injuries?.toLowerCase().includes('fracture') || 
        item.injuries?.toLowerCase().includes('skin tear') 
          ? 'Yes' 
          : 'No',
      'Non Compliance Flag':
        item.poaContacted?.toLowerCase() === 'no' ||
        item.cause === 'No Fall Note' ||
        (item.postFallNotes < 3)
          ? 'Yes'
          : 'No'
    }));
    
    const csv = Papa.unparse(modifiedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const monthNum = months_backword[desiredMonth];
    const filename = `${name}_${desiredYear}_${monthNum}_falls_data.csv`;
    saveAs(blob, filename);
  };

  const handleUpdateCSV = async (index, newValue, changeType) => {
    const collectionRef = ref(db, `/millCreek/${desiredYear}/${months_backword[desiredMonth]}`);

    try {
      const snapshot = await get(collectionRef);

      if (snapshot.exists()) {
        const rows = snapshot.val();
        let targetRowKey = null;

        for (const [key, row] of Object.entries(rows)) {
          if (row.id === String(index)) {  
            targetRowKey = key;
            break;
          }
        }

        if (targetRowKey) {
          const rowRef = child(collectionRef, targetRowKey);
          const currentRowData = rows[targetRowKey];

          let updates = {};

          switch (changeType) {
            case 'hir':
              updates = { hir: newValue, isHirUpdated: 'yes' };
              break;
            case 'transfer_to_hospital':
              updates = { transfer_to_hospital: newValue, isHospitalUpdated: 'yes' };
              break;
            case 'ptRef':
              updates = { ptRef: newValue, isPtRefUpdated: 'yes' };
              break;
            case 'poaContacted':
              updates = { poaContacted: newValue, isPoaContactedUpdated: 'yes' };
              break;
            case 'physicianRef':
              updates = { physicianRef: newValue, isPhysicianRefUpdated: 'yes' };
              break;
            case 'incidentReport':
              updates = { incidentReport: newValue, isIncidentReportUpdated: 'yes' };
              break;
            default:
              console.error('Invalid changeType');
              return;
          }
          const updateKey = Object.keys(updates)[1];
          const hasBeenUpdated = currentRowData[updateKey] === 'yes';

          if (hasBeenUpdated && currentRowData[changeType] === newValue) {
            return;
          }

          await update(rowRef, updates);
          console.log(`Row with id ${index} updated successfully.`);

          const updatedData = data.map(item => 
            item.id === String(index) 
              ? { ...item, [changeType]: newValue, [updateKey]: 'yes' } 
              : item
          );
          setData(updatedData);

          console.log(`Row with id ${index} updated successfully.`);
        } else {
          console.error(`Row with id ${index} not found.`);
        }
      } else {
        console.error('No data found in the specified path.');
      }
    } catch (error) {
      console.error('Error updating row:', error);
    }
  };

  // Main data fetching effect
  useEffect(() => {
    performance.mark('start-fetch-data');
    const dataRef = ref(db, `/millCreek/${desiredYear}/${months_backword[desiredMonth]}`);
    const currentYear = desiredYear;
    const currentMonth = parseInt(months_backword[desiredMonth]);
    const pastThreeMonths = [];

    for (let i = 3; i >= 1; i--) {
      const month = currentMonth - i;
      if (month > 0) { pastThreeMonths.push({ year: currentYear, month: String(month).padStart(2, '0') }); }
      else { pastThreeMonths.push({ year: currentYear - 1, month: String(12 + month).padStart(2, '0') }); }
    }

    const allFallsData = new Map();
    for (let i = 0; i < pastThreeMonths.length; i++) { allFallsData.set(pastThreeMonths[i].month, []); }

    pastThreeMonths.forEach(({ year, month }) => {
      const monthRef = ref(db, `/millCreek/${year}/${month}`);
      const listener = onValue(monthRef, (snapshot) => {
        if (snapshot.exists()) {
          const fallsData = snapshot.val();
          const monthData = Object.keys(fallsData).map((key) => fallsData[key]);
          allFallsData.set(month, monthData);
        }
      });
      return () => off(monthRef, listener);
    });
    setThreeMonthData(allFallsData);

    const listener = onValue(dataRef, (snapshot) => {
      if (snapshot.exists()) {
        const fetchedData = snapshot.val();
        if (!fetchedData) { setData([]); return; }
        let withIdData = Object.values(fetchedData).map(item => ({ ...item, id: item.id || '' }));

        // Filter by unit if a specific unit is selected
        if (desiredUnit !== 'allUnits') {
          withIdData = withIdData.filter(fall => {
            const unitValue = fall.homeUnit || fall.room;
            return unitValue?.trim() === desiredUnit?.trim();
          });
        }
        const sortedData = withIdData.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
        setData(sortedData);
      } else {
        setData([]); // Set data to empty array if snapshot doesn't exist
      }
    });
    return () => { off(dataRef, listener); };
  }, [desiredMonth, desiredYear, desiredUnit]);

  useEffect(() => {
    updateFallsChart();
  }, [fallsTimeRange, data, desiredMonth, desiredYear, goal, threeMonthData]);

  useEffect(() => {
    updateAnalysisChart();
  }, [analysisType, analysisTimeRange, analysisUnit, data, desiredYear, threeMonthData]);

  useEffect(() => {
    setTotalFalls(data.length);
    if (data.length > 0) {
      const processedData = data.map((item) => {
        const postFallNotesColor =
          item.isPostFallNotesUpdated !== 'yes' && item.postFallNotes < 3 ? 'red' : 'inherit';
        return { ...item, postFallNotesColor };
      });
      const dataChanged = JSON.stringify(processedData) !== JSON.stringify(data);
      if (dataChanged) { setData(processedData); }
    }
  }, [data]);

  const handleYearChange = (e) => {
    const selectedYear = e.target.value;
    setDesiredYear(selectedYear);
    const availableMonths = availableYearMonth[selectedYear] || [];
    if (availableMonths.length > 0) { setDesiredMonth(availableMonths[0]); }
  };

  const handleMonthChange = (event) => { setDesiredMonth(event.target.value); };

  const handleUnitChange = (event) => { setDesiredUnit(event.target.value); };

  useEffect(() => {
    const yearsRef = ref(db, '/millCreek');
    onValue(yearsRef, (snapshot) => {
      const yearMonthMapping = {};
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach(year => {
          if (!yearMonthMapping[year]) { yearMonthMapping[year] = []; }
          Object.keys(data[year] || {}).forEach(month => {
            if (data[year][month]) { yearMonthMapping[year].push(months_forward[month]); }
          });
          yearMonthMapping[year].sort((a, b) => { return months_backword[a] - months_backword[b]; });
        });

        const sortedYears = Object.keys(yearMonthMapping).sort((a, b) => b - a);
        const sortedMapping = {};
        sortedYears.forEach(year => { sortedMapping[year] = yearMonthMapping[year]; });
        setAvailableYearMonth(sortedMapping);

        const today = new Date();
        const currentYear = today.getFullYear().toString();
        const currentMonth = getCurrentMonth();

        let yearToUse = currentYear;
        let monthToUse = currentMonth;

        if (!sortedMapping[yearToUse]?.includes(monthToUse)) {
          if (sortedMapping[yearToUse]?.length > 0) {
            const currentMonthNum = months_backword[currentMonth];
            const availableMonths = sortedMapping[yearToUse].map(m => months_backword[m]);
            const closestMonth = availableMonths.reduce((prev, curr) => {
              return Math.abs(curr - currentMonthNum) < Math.abs(prev - currentMonthNum) ? curr : prev;
            });
            monthToUse = months_forward[closestMonth];
          } else {
            yearToUse = sortedYears[0];
            monthToUse = sortedMapping[yearToUse][sortedMapping[yearToUse].length - 1];
          }
        }
        setDesiredYear(yearToUse);
        setDesiredMonth(monthToUse);
      } else {
        setAvailableYearMonth({});
        setDesiredYear(new Date().getFullYear().toString());
        setDesiredMonth(getCurrentMonth());
      }
    });
  }, []);

  const checkForUnreviewedResidents = async () => {
    const fallsRef = ref(db, `/millCreek/${desiredYear}/${months_backword[desiredMonth]}`);
    const reviewsRef = ref(db, `/reviews/millCreek/${desiredYear}/${months_backword[desiredMonth]}`);
    
    const [fallsSnapshot, reviewsSnapshot] = await Promise.all([
      get(fallsRef),
      get(reviewsRef)
    ]);

    const fallsData = fallsSnapshot.val();
    const reviewsData = reviewsSnapshot.val() || {};

    if (fallsData) {
      const fallCounts = {};
      Object.values(fallsData).forEach(fall => {
        if (fall.name) {
          fallCounts[fall.name] = (fallCounts[fall.name] || 0) + 1;
        }
      });

      const needReview = Object.entries(fallCounts)
        .filter(([residentName, count]) => {
          const review = reviewsData[residentName];
          if (!review) return count >= 3;
          
          if (review.needsReminder && review.lastReminderTime) {
            const reminderTime = new Date(review.lastReminderTime);
            const now = new Date();
            return count >= 3 && (now - reminderTime) >= 86400000;
          }
          return false;
        })
        .map(([residentName]) => ({ name: residentName }));

      setResidentsNeedingReview(needReview);
      if (needReview.length > 0) {
        setCurrentResidentIndex(0);
        setShowModal(true);
      }
    } else {
      setResidentsNeedingReview([]);
      setShowModal(false);
    }
  };

  useEffect(() => {
    checkForUnreviewedResidents();
    const interval = setInterval(checkForUnreviewedResidents, 10000);
    
    return () => clearInterval(interval);
  }, [desiredMonth, desiredYear]);

  const markReviewDone = async (resident) => {
    const reviewRef = ref(db, `/reviews/millCreek/${desiredYear}/${months_backword[desiredMonth]}/${resident.name}`);
    await set(reviewRef, {
      reviewed: true,
      reviewedAt: serverTimestamp(),
      needsReminder: false,
      lastReminderTime: null
    });
    
    await checkForUnreviewedResidents();
  };

  const handleRemindLater = async () => {
    const currentResident = residentsNeedingReview[currentResidentIndex];
    const reviewRef = ref(db, `/reviews/millCreek/${desiredYear}/${months_backword[desiredMonth]}/${currentResident.name}`);
    
    await set(reviewRef, {
      reviewed: false,
      needsReminder: true,
      lastReminderTime: serverTimestamp()
    });

    if (currentResidentIndex < residentsNeedingReview.length - 1) {
      setCurrentResidentIndex(prev => prev + 1);
    } else {
      setShowModal(false);
      setCurrentResidentIndex(0);
    }
  };

  const cleanDuplicateText = (text, field) => {
    // This function can be simplified or removed if these patterns are not needed for falls data
    if (!text) return text;
    if (field === 'interventions') {
      return text.replace(/No Progress Note Found Within 24hrs of RIM\s*Within 24hrs of RIM/g, 'No Progress Note Found Within 24hrs of RIM');
    } else if (field === 'triggers') {
      return text.replace(/Within 24hrs of RIM\s*Within 24hrs of RIM\s*Within 24hrs of RIM/g, 'Within 24hrs of RIM');
    }
    return text;
  };

  return (
    <div className={styles.dashboard} ref={tableRef}>
      <h1>{title}</h1>

      <div className={styles['chart-container']}>
        {/* Falls Overview Card */}
        <div className={styles.chart} style={{minWidth: 'unset', minHeight: 'unset'}}>
          <div className={styles['gauge-container']} style={{ textAlign: 'left' }}>
            <h2 style={{ paddingTop: '7.5px', textAlign: 'left' }}>Recent Falls Summary (Past 3 Days)</h2>
            <div style={{ padding: '10px', maxHeight: '400px', overflowY: 'auto', textAlign: 'left' }}>
              {(() => {
                // Get falls from the last 3 days
                const threeDaysAgo = new Date();
                threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                
                const recentFalls = data.filter(fall => {
                  const fallDate = new Date(fall.date);
                  return fallDate >= threeDaysAgo;
                }).sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));

                if (recentFalls.length === 0) {
                  return (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                      No falls reported in the last 3 days
                    </div>
                  );
                }

                return (
                  <>
                    {recentFalls.map((fall, index) => (
                      <div key={index} style={{
                        marginBottom: '15px',
                        padding: '20px',
                        backgroundColor: index % 2 === 0 ? '#E0F2F7' : '#FFEBEE',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        textAlign: 'left'
                      }}>
                        <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px', textTransform: 'uppercase' }}>{fall.name}</div>
                        <div style={{ marginBottom: '4px', fontSize: '15px' }}>
                          <span style={{ marginRight: '5px' }}>📅</span>
                          {fall.date} at {fall.time}
                        </div>
                        <div style={{ marginBottom: '4px', fontSize: '15px' }}>
                          <span style={{ marginRight: '5px' }}>📍</span>
                          {fall.location || fall.incident_location || 'Location not specified'}
                        </div>
                        <div style={{ marginBottom: '4px', fontSize: '15px', color: (fall.injury || fall.injuries) && (fall.injury?.toLowerCase() !== 'no injury' && fall.injuries?.toLowerCase() !== 'no injury') ? '#d32f2f' : '#333' }}>
                          <span style={{ marginRight: '5px' }}>⚠️</span>
                          Injury: {fall.injury || fall.injuries || 'No Injury'}
                        </div>
                        {fall.cause ? (
                          <div style={{ marginBottom: '4px', fontSize: '15px' }}>
                            <span style={{ marginRight: '5px' }}>💡</span>
                            Cause: {fall.cause}
                          </div>
                        ) : null}
                        {fall.interventions ? (
                          <div style={{ fontSize: '15px' }}>
                            <span style={{ marginRight: '5px' }}>🛡️</span>
                            Interventions: {fall.interventions}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Analysis Chart Card */}
        <div className={styles.chart} style={{minWidth: 'unset', minHeight: 'unset'}}>
          <h2>{analysisHeaderText}</h2>
          <select
            id="fallsAnalysisType"
            value={analysisType}
            onChange={(e) => {
              setAnalysisType(e.target.value);
            }}
          >
            <option value="residents">By Resident Name</option>
            <option value="timeOfDay">By Time of Day</option>
            <option value="hour">By Hour</option>
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


          {analysisChartData.datasets.length > 0 && <Bar data={analysisChartData} options={analysisChartOptions} />}
        </div>
      </div>
      <div className={styles['table-header']}>
        <div className={styles['header']}>
          <h2>
            Falls Tracking Table: {desiredMonth} {desiredYear}
          </h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select onChange={handleYearChange} value={desiredYear}>
              {Object.keys(availableYearMonth).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <select onChange={handleMonthChange} value={desiredMonth}>
              {(availableYearMonth[desiredYear] || []).map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>

            
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
        <thead>
          <tr>
            <th style={{ fontSize: '18px', backgroundColor: '#2B59C3', color: 'white' }}>Date</th>
            <th style={{ fontSize: '18px', backgroundColor: '#2B59C3', color: 'white' }}>Name</th>
            <th style={{ fontSize: '18px', backgroundColor: '#2B59C3', color: 'white' }}>Time</th>
            <th style={{ fontSize: '18px', backgroundColor: '#2B59C3', color: 'white' }}>Location</th>
            <th style={{ fontSize: '18px', backgroundColor: '#2B59C3', color: 'white' }}>RHA</th>
            <th style={{ fontSize: '18px', backgroundColor: '#2B59C3', color: 'white' }}>Nature of Fall/Cause</th>
            <th style={{ fontSize: '18px', backgroundColor: '#2B59C3', color: 'white' }}>Interventions</th>
            <th style={{ fontSize: '18px', backgroundColor: '#2B59C3', color: 'white' }}>HIR intiated</th>
            <th style={{ fontSize: '18px', backgroundColor: '#2B59C3', color: 'white' }}>Injury</th>
            <th style={{ fontSize: '18px', backgroundColor: '#2B59C3', color: 'white' }}>Transfer to Hospital</th>
            <th style={{ fontSize: '18px', backgroundColor: '#2B59C3', color: 'white' }}>PT Ref</th>
            <th style={{ fontSize: '18px', backgroundColor: '#2B59C3', color: 'white' }}>Physician/NP Notification (If Applicable)</th>
            <th style={{ fontSize: '18px', backgroundColor: '#2B59C3', color: 'white' }}>POA Contacted</th>
            <th style={{ fontSize: '18px', backgroundColor: '#2B59C3', color: 'white' }}>Risk Management Incident Fall Written</th>
            <th style={{ fontSize: '18px', backgroundColor: '#2B59C3', color: 'white' }}>3 Post Fall Notes in 72hrs</th>
          </tr>
        </thead>
        <tbody id="fallsTableBody">
          {data && data.map((item, i) => (
            <tr 
              style={{
                backgroundColor: item.cause === 'No Fall Note' ? '#f8b9c6' : (i % 2 === 0 ? '#E0F2F7' : '#FFEBEE')
              }}
              key={i}
            >
              <td style={{ whiteSpace: 'nowrap', fontSize: '16px' }}>{item.date}</td>
              <td style={{ fontSize: '16px' }}>{item.name}</td>
              <td style={{ fontSize: '16px' }}>{item.time}</td>
              <td style={{ fontSize: '16px' }}>{item.location || item.incident_location}</td>
              <td style={{ fontSize: '16px' }}>{item.homeUnit || item.room}</td>
              <td style={{ fontSize: '16px', backgroundColor: item.isCauseUpdated === 'yes' ? 'rgba(43, 89, 195, 0.3)' : 'inherit' }}>
                {item.cause}
                <br />
                <button onClick={() => handleEditCauseOfFall(i)}>Edit</button>
              </td>
              <td
                style={{
                  fontSize: '16px',
                  backgroundColor: item.isInterventionsUpdated === 'yes' ? 'rgba(43, 89, 195, 0.3)' : (i % 2 === 0 ? '#E0F2F7' : '#FFEBEE')
                }}
              >
                {item.interventions}
                <br></br>
                <button onClick={() => handleEditIntervention(i)}>Edit</button>
              </td>
              <td style={{ fontSize: '16px', backgroundColor: item.isHirUpdated === 'yes' ? 'rgba(43, 89, 195, 0.3)' : (i % 2 === 0 ? '#E0F2F7' : '#FFEBEE') }}>
                <select
                  value={item.hir === 'yes' || item.hir === 'Yes' ? 'Yes' : item.hir === 'no' || item.hir === 'No' ? 'No' : item.hir === 'not applicable' || item.hir === 'Not Applicable' ? 'Not Applicable' : item.hir}
                  onChange={(e) => handleUpdateCSV(data[i].id, e.target.value, 'hir')}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>
              </td>
              <td style={{ fontSize: '16px', backgroundColor: (i % 2 === 0 ? '#E0F2F7' : '#FFEBEE') }}>{item.injury || item.injuries}</td>
              <td style={{ fontSize: '16px', backgroundColor: item.isHospitalUpdated === 'yes' ? 'rgba(43, 89, 195, 0.3)' : (i % 2 === 0 ? '#E0F2F7' : '#FFEBEE') }}>
                <select
                  value={item.transfer_to_hospital === 'yes' || item.transfer_to_hospital === 'Yes' ? 'Yes' : item.transfer_to_hospital === 'no' || item.transfer_to_hospital === 'No'? 'No' : item.transfer_to_hospital}
                  onChange={(e) => handleUpdateCSV(data[i].id, e.target.value, 'transfer_to_hospital')}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </td>
              <td style={{ fontSize: '16px', backgroundColor: item.isPtRefUpdated === 'yes' ? 'rgba(43, 89, 195, 0.3)' : (i % 2 === 0 ? '#E0F2F7' : '#FFEBEE') }}>
                <select
                  value={item.ptRef === 'yes' || item.ptRef === 'Yes' ? 'Yes' : item.ptRef === 'no' || item.ptRef === 'No' ? 'No' : item.ptRef}
                  onChange={(e) => handleUpdateCSV(data[i].id, e.target.value, 'ptRef')}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </td>
              <td style={{ fontSize: '16px', backgroundColor: item.isPhysicianRefUpdated === 'yes' ? 'rgba(43, 89, 195, 0.3)' : (i % 2 === 0 ? '#E0F2F7' : '#FFEBEE') }}>
                <select
                  value={item.physicianRef === 'yes' || item.physicianRef === 'Yes'
                    ? 'Yes'
                    : item.physicianRef === 'no' || item.physicianRef === 'No'
                    ? 'No'
                    : item.physicianRef}
                  onChange={(e) => handleUpdateCSV(data[i].id, e.target.value, 'physicianRef')}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="N/A">N/A</option>
                </select>
              </td>
              <td className={item.poaContacted === 'no' ? styles.cellRed : ''} 
                style={{
                  fontSize: '16px',
                  backgroundColor: item.isPoaContactedUpdated === 'yes' ? 'rgba(43, 89, 195, 0.3)' : (i % 2 === 0 ? '#E0F2F7' : '#FFEBEE')
                }}
              >
                <select
                  value={item.poaContacted === 'yes' || item.poaContacted === 'Yes'
                    ? 'Yes'
                    : item.poaContacted === 'no' || item.poaContacted === 'No'
                    ? 'No'
                    : item.poaContacted}
                  onChange={(e) => handleUpdateCSV(data[i].id, e.target.value, 'poaContacted')}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </td>
              <td style={{ fontSize: '16px', backgroundColor: item.isIncidentReportUpdated === 'yes' ? 'rgba(43, 89, 195, 0.3)' : (i % 2 === 0 ? '#E0F2F7' : '#FFEBEE') }}>
                <select
                  value={
                    item.incidentReport === 'yes' || item.incidentReport === 'Yes'
                      ? 'Yes'
                      : item.incidentReport === 'no' || item.incidentReport === 'No'
                      ? 'No'
                      : item.incidentReport
                  }
                  onChange={(e) => handleUpdateCSV(data[i].id, e.target.value, 'incidentReport')}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </td>
              <td
                className={item.postFallNotesColor === 'red' ? styles.cellRed : ''}
                style={{
                  fontSize: '16px',
                  color: item.isPostFallNotesUpdated === 'yes' ? '#179c4e' : '#000000',
                  fontWeight: 'bold',
                  backgroundColor: item.isPostFallNotesUpdated === 'yes' ? 'rgba(43, 89, 195, 0.3)' : (i % 2 === 0 ? '#E0F2F7' : '#FFEBEE')
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
              <button onClick={handleSubmitIntervention} style={{backgroundColor: '#2B59C3', color: 'white'}}>Submit</button>
              <button onClick={() => setIsModalOpen(false)} style={{backgroundColor: '#D3D3D3', color: 'black'}}>Cancel</button>
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
              <button onClick={handleSubmitCauseOfFall} style={{backgroundColor: '#2B59C3', color: 'white'}}>Submit</button>
              <button onClick={() => setIsCauseModalOpen(false)} style={{backgroundColor: '#D3D3D3', color: 'black'}}>Cancel</button>
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
              <button onClick={handleSubmitPostFallNotes} style={{backgroundColor: '#2B59C3', color: 'white'}}>Submit</button>
              <button onClick={() => setIsPostFallNotesModalOpen(false)} style={{backgroundColor: '#D3D3D3', color: 'black'}}>Cancel</button>
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
                  style={{ padding: '10px', backgroundColor: '#2B59C3', color: 'white', fontFamily: 'inherit', fontSize: '16px', borderRadius: '12px', border: 'transparent', cursor: 'pointer'}}
                >
                  Yes, Review Complete
                </button>
                <button
                  onClick={handleRemindLater}
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