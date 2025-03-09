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
} from '../utils/DashboardUtils';
import Modal from './Modal';
import { TableHead, TableRow, TableCell, TableBody } from '@mui/material';

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
  const [threeMonthData, setThreeMonthData] = useState(new Map());
  const getCurrentMonth = () => {
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');  // Convert 1-12 to "01"-"12"
    return months_forward[month];  // Convert "01" to "January" etc.
  };
  const [desiredMonth, setDesiredMonth] = useState(getCurrentMonth());
  const [desiredYear, setDesiredYear] = useState(new Date().getFullYear());
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
  const [analysisType, setAnalysisType] = useState('timeOfDay');
  const [analysisUnit, setAnalysisUnit] = useState('allUnits');
  const [analysisHeaderText, setAnalysisHeaderText] = useState('Falls by Time of Day');

  const [currentIntervention, setCurrentIntervention] = useState('');
  const [currentRowIndex, setCurrentRowIndex] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);

  const [currentCauseOfFall, setCurrentCauseOfFall] = useState('');
  const [currentCauseRowIndex, setCurrentCauseRowIndex] = useState(null);
  const [isCauseModalOpen, setIsCauseModalOpen] = useState(false);

  const [currentPostFallNotes, setCurrentPostFallNotes] = useState('');
  const [currentPostFallNotesRowIndex, setCurrentPostFallNotesRowIndex] = useState(null);
  const [isPostFallNotesModalOpen, setIsPostFallNotesModalOpen] = useState(false);

  const [residentsNeedingReview, setResidentsNeedingReview] = useState([]);
  const [currentResidentIndex, setCurrentResidentIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const [currentLongTermIntervention, setCurrentLongTermIntervention] = useState('');
  const [isLongTermInterventionModalOpen, setIsLongTermInterventionModalOpen] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [currentDescription, setCurrentDescription] = useState('');
  const [currentRowId, setCurrentRowId] = useState(null);

  const [expandedRows, setExpandedRows] = useState({});

  const tableStyles = {
    showMoreBtn: {
      background: 'none',
      border: 'none',
      color: '#0066cc',
      padding: 0,
      marginLeft: '5px',
      cursor: 'pointer',
      fontSize: '1.0em',
      textDecoration: 'underline'
    },
    showLessBtn: {
      background: 'none',
      border: 'none',
      color: '#0066cc',
      padding: 0,
      marginLeft: '5px',
      cursor: 'pointer',
      fontSize: '1.0em',
      textDecoration: 'underline'
    },
    descriptionCell: {
      maxWidth: '600px',
      wordWrap: 'break-word',
      fontSize: '1.3em'
    },
    interventionCell: {
      maxWidth: '200px',
      wordWrap: 'break-word',
      fontSize: '1.3em'
    },
    injuryCell: {
      width: '20px',
      minWidth: '20px',
      maxWidth: '20px',
      wordWrap: 'break-word',
      fontSize: '1.3em',
      overflow: 'hidden'
    },
    tableCell: {
      fontSize: '1.3em',
      padding: '10px'
    },
    headerCell: {
      fontSize: '1.6em',
      fontWeight: 'bold',
      padding: '15px'
    },
    select: {
      fontSize: '0.8em',
      padding: '5px'
    }
  };

  const riskOptions = ['Near Miss', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
  
  const columns = [
    { key: 'name', label: 'Resident' },
    { key: 'Suite', label: 'Suite' },
    { key: 'location', label: 'Location' },
    { key: 'Witnessed', label: 'Witnessed' },
    { key: 'time', label: 'Time' },
    { key: 'injury', label: 'Injury' },
    { key: 'Cause', label: 'Cause' },
    { key: 'Description', label: 'Description' },
    { key: 'Risk', label: 'Risk of Fall' },
    { key: 'interventions', label: 'Intervention' }
  ];

  const truncateToTwoSentences = (text) => {
    if (!text) return '';
    const maxLength = 90;
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
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
        max: 55,
        ticks: {
          stepSize: 5,
        },
      },
    },
    plugins: {
      legend: { display: false },
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
  };

  const handleEditIntervention = (index) => {
    setCurrentIntervention(data[index].interventions);
    setCurrentRowIndex(index);
    setSelectedRowId(index);
    setIsModalOpen(true);
  };

  const handleSubmitIntervention = async () => {
    try {
      const rowRef = ref(db, `${name}/${desiredYear}/${months_backword[desiredMonth]}/${selectedRowId}`);
      
      await update(rowRef, {
        interventions: currentIntervention,
        isInterventionsUpdated: 'yes',
        updated_at: new Date().toISOString()
      });

      setData(prevData =>
        prevData.map((item, idx) =>
          idx === selectedRowId
            ? { ...item, interventions: currentIntervention, isInterventionsUpdated: 'yes' }
            : item
        )
      );

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error updating intervention:', error);
      alert('Failed to update intervention');
    }
  };

  const handleEditCauseOfFall = (index) => {
    setCurrentCauseOfFall(data[index].Cause);
    setCurrentCauseRowIndex(index);
    setIsCauseModalOpen(true);
  };

  const handleSubmitCauseOfFall = () => {
    if (currentCauseOfFall === data[currentCauseRowIndex].Cause) {
      setIsCauseModalOpen(false);
      return;
    }

    const updatedData = [...data];
    updatedData[currentCauseRowIndex].Cause = currentCauseOfFall;
    updatedData[currentCauseRowIndex].isCauseUpdated = 'yes';

    const rowRef = ref(
      db,
      `/${name}/${desiredYear}/${months_backword[desiredMonth]}/${currentCauseRowIndex}`
    );
    update(rowRef, { 
      Cause: currentCauseOfFall, 
      isCauseUpdated: 'yes' 
    })
      .then(() => {
        console.log('Cause of fall updated successfully');
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
    updatedData = markPostFallNotes(updatedData);

    const rowRef = ref(
      db,
      `/${name}/${desiredYear}/${months_backword[desiredMonth]}/row-${data[currentPostFallNotesRowIndex].id}`
    );
    update(rowRef, { postFallNotes: currentPostFallNotes, isPostFallNotesUpdated: 'yes' })
      .then(() => {
        console.log('Post Fall Notes updated successfully');
        setData(updatedData);
        setIsPostFallNotesModalOpen(false);
      })
      .catch((error) => {
        console.error('Error updating post fall notes:', error);
      });
  };

  const handleEditLongTermIntervention = (index) => {
    setCurrentLongTermIntervention(data[index].longTermIntervention || '');
    setCurrentRowIndex(index);
    setIsLongTermInterventionModalOpen(true);
  };

  const handleSubmitLongTermIntervention = () => {
    if (currentLongTermIntervention === data[currentRowIndex].longTermIntervention) {
      setIsLongTermInterventionModalOpen(false);
      return;
    }

    const updatedData = [...data];
    updatedData[currentRowIndex].longTermIntervention = currentLongTermIntervention;

    const rowRef = ref(
      db,
      `/${name}/${desiredYear}/${months_backword[desiredMonth]}/row-${data[currentRowIndex].id}`
    );
    update(rowRef, { longTermIntervention: currentLongTermIntervention })
      .then(() => {
        console.log('Long Term Intervention updated successfully');
        setData(updatedData);
        setIsLongTermInterventionModalOpen(false);
      })
      .catch((error) => {
        console.error('Error updating long term intervention:', error);
      });
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
      case 'goderich':
        threeMonthX = ['October', 'November', 'December'];
        threeMonthY = [25, 22, 22];
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
    var filteredData = data; // Just use current data

    let newLabels = [];
    let newData = [];

    switch (analysisType) {
      case 'timeOfDay':
        setAnalysisHeaderText('Falls by Time of Day');
        var timeOfDayCounts = countFallsByTimeOfDay(filteredData, name);
        newLabels = ['Morning', 'Evening', 'Night'];
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
        var injuryCounts = {};
        filteredData.forEach(fall => {
          const injury = fall.injury || 'No Injury';
          injuryCounts[injury] = (injuryCounts[injury] || 0) + 1;
        });
        newLabels = Object.keys(injuryCounts);
        newData = Object.values(injuryCounts);
        break;

      case 'residents':
        setAnalysisHeaderText('Residents with Recurring Falls');
        var recurringFalls = countResidentsWithRecurringFalls(filteredData);
        newLabels = Object.keys(recurringFalls);
        newData = Object.values(recurringFalls);
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

  const handleSavePDF = () => {
    window.open('https://fallyx.com/incident-list', '_blank');
  };

  const handleSaveCSV = () => {
    window.open('https://fallyx.com/fall-note', '_blank');
  };

  const handleUpdateCSV = async (rowId, newValue, name, changeType) => {
    try {
      const rowRef = ref(db, `${name}/${desiredYear}/${months_backword[desiredMonth]}/row-${rowId}`);
      
      // Create an update object with just the field being changed
      const updates = {
        [changeType]: newValue,
        updated_at: new Date().toISOString()
      };

      // Update only the specific field
      await update(rowRef, updates);
      
      // Update local state to reflect the change
      setData(prevData => 
        prevData.map(item => 
          item.id === rowId 
            ? { ...item, [changeType]: newValue }
            : item
        )
      );

    } catch (error) {
      console.error('Error updating data:', error);
      alert('Failed to update the field');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const newData = results.data;
          console.log("Parsed CSV data:", newData);

          for (let i = 0; i < newData.length; i++) {
            const row = newData[i];
            
            // Create a complete row object with ALL possible fields and default values
            const updatedRow = {
              // Required identifiers
              id: String(i),
              
              // Basic information - default to empty string if missing
              date: row.date || '',
              name: row.name || '',
              time: row.time || '',
              room: row.room || '',
              rha: row.rha || '',
              homeUnit: row.homeUnit || '',
              
              // Fall details - default to empty string if missing
              cause: row.cause || '',
              interventions: row.interventions || '',
              injury: row.injury || '',  // Keep both injury and injuries to be safe
              injuries: row.injuries || '',
              postFallNotes: row.postFallNotes || '',
              longTermIntervention: row.longTermIntervention || '',
              
              // Yes/No fields - default to 'No' if missing
              hir: row.hir?.toLowerCase() === 'yes' ? 'Yes' : 'No',
              transfer_to_hospital: row.transfer_to_hospital?.toLowerCase() === 'yes' ? 'Yes' : 'No',
              pt_ref: row.pt_ref?.toLowerCase() === 'yes' ? 'Yes' : 'No',
              physician_notification: row.physician_notification?.toLowerCase() === 'yes' ? 'Yes' : 'No',
              poa_contacted: row.poa_contacted?.toLowerCase() === 'yes' ? 'Yes' : 'No',
              risk_management: row.risk_management?.toLowerCase() === 'yes' ? 'Yes' : 'No',
              rnaoAssessment: row.rnaoAssessment?.toLowerCase() === 'yes' ? 'Yes' : 'No',
              witnessed: row.witnessed?.toLowerCase() === 'yes' ? 'Yes' : 'No',
              
              // Update flags - always start as 'no'
              isHirUpdated: 'no',
              isTransferToHospitalUpdated: 'no',
              isPtRefUpdated: 'no',
              isPhysicianNotificationUpdated: 'no',
              isPoaContactedUpdated: 'no',
              isRiskManagementUpdated: 'no',
              isRnaoAssessmentUpdated: 'no',
              isInterventionsUpdated: 'no',
              isCauseUpdated: 'no',
              
              // Timestamps and metadata
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              
              // Additional fields that might be needed
              type: row.type || 'fall',  // default to 'fall' if not specified
              dayOfWeek: row.dayOfWeek || '',
              fallsThisMonth: row.fallsThisMonth || '0',
              fallsInThreeMonths: row.fallsInThreeMonths || '0',
              nearMissesInThreeMonths: row.nearMissesInThreeMonths || '0'
            };

            console.log(`Writing row ${i}:`, updatedRow);

            const rowRef = ref(db, `shepherd/${desiredYear}/${months_backword[desiredMonth]}/row-${i}`);
            await set(rowRef, updatedRow);
          }

          setUploading(false);
          alert('CSV file uploaded successfully!');
        } catch (error) {
          console.error("Upload error:", error);
          setUploading(false);
          alert(`Failed to upload: ${error.message}`);
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        setUploading(false);
        alert('Failed to parse the CSV file.');
      }
    });
  };

  useEffect(() => {
    // Start measuring fetch data time
    performance.mark('start-fetch-data');

    const dataRef = ref(db, `/${name}/${desiredYear}/${months_backword[desiredMonth]}`); // Firebase ref for this specific dashboard
    // const dataRef = ref(db, name);
    const currentYear = desiredYear;
    const currentMonth = parseInt(months_backword[desiredMonth]); // current month
    const pastThreeMonths = [];
    console.log('Name prop:', name); // Check what name is being passed
    console.log('Desired year:', desiredYear);
    console.log('Desired month:', months_backword[desiredMonth]);

    for (let i = 3; i >= 1; i--) {
      const month = currentMonth - i;
      if (month > 0) {
        pastThreeMonths.push({ year: currentYear, month: String(month).padStart(2, '0') });
      } else {
        // if month less than one, return last year
        pastThreeMonths.push({ year: currentYear - 1, month: String(12 + month).padStart(2, '0') });
      }
    }

    const allFallsData = new Map();
    for (let i = 0; i < pastThreeMonths.length; i++) {
      allFallsData.set(pastThreeMonths[i].month, []);
    }

    pastThreeMonths.forEach(({ year, month }) => {
      const monthRef = ref(db, `/${name}/${year}/${month}`);

      const listener = onValue(monthRef, (snapshot) => {
        if (snapshot.exists()) {
          const fallsData = snapshot.val();
          const monthData = Object.keys(fallsData).map((key) => fallsData[key]);
          allFallsData.set(month, monthData);
          // console.log('month data');
          // console.log(monthData);
          // console.log('month');
          // console.log(month);
          // console.log('allFallsData');
          // console.log(allFallsData);
        }
      });
      return () => off(monthRef, listener);
    });
    setThreeMonthData(allFallsData);

    const listener = onValue(dataRef, (snapshot) => {
      if (snapshot.exists()) {
        const fetchedData = snapshot.val();
        console.log("Raw fetched data:", fetchedData);
        
        // First ensure all data is loaded and valid
        if (!fetchedData) {
          console.log('No data available');
          setData([]);
          return;
        }

        // Then process the data
        let withIdData = Object.values(fetchedData);
        for (let i = 0; i < withIdData.length; i++) {
          withIdData[i].id = i;
        }

        // Only call markPostFallNotes after we're sure data is loaded
        if (withIdData.length > 0) {
          const updatedData = markPostFallNotes(withIdData);
          const sortedData = updatedData.sort(
            (a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time)
          );
          setData(sortedData);
        }
      } else {
        setData([]);
        console.log(`${name} data not found.`);
      }
    });

    return () => {
      off(dataRef, listener); // Cleanup listener on unmount
    };
  }, [desiredMonth, desiredYear]);

  useEffect(() => {
    updateFallsChart();
    // console.log('Falls Chart');
  }, [fallsTimeRange, data, desiredMonth, desiredYear]);

  useEffect(() => {
    updateAnalysisChart();
    // console.log('Analysis Chart');
  }, [analysisType, data, desiredYear]);

  const handleYearChange = (e) => {
    const selectedYear = e.target.value;
    setDesiredYear(selectedYear);

    setDesiredMonth(availableYearMonth[selectedYear][0]);
  };

  const handleMonthChange = (event) => {
    const selectedMonth = event.target.value;
    setDesiredMonth(selectedMonth);
  };

  useEffect(() => {
    const yearsRef = ref(db, `/${name}`);
    console.log('Checking available years/months for:', name);
    
    onValue(yearsRef, (snapshot) => {
      const yearMonthMapping = {};
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Get current date info
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // 1-12

        // Calculate the last 4 months
        const months = [];
        for (let i = 0; i < 4; i++) {
          let month = currentMonth - i;
          let year = currentYear;
          
          if (month <= 0) {
            month += 12;
            year -= 1;
          }
          
          // Format month as two digits
          const monthStr = month.toString().padStart(2, '0');
          
          if (!yearMonthMapping[year]) {
            yearMonthMapping[year] = [];
          }
          
          // Only add if the data exists in Firebase
          if (data[year] && data[year][monthStr]) {
            yearMonthMapping[year].push(months_forward[monthStr]);
          }
        }

        console.log('Final year/month mapping:', yearMonthMapping);
      }
      setAvailableYearMonth(yearMonthMapping);
    });
  }, [name]);

  const checkForUnreviewedResidents = async () => {
    const fallsRef = ref(db, `/${name}/${desiredYear}/${months_backword[desiredMonth]}`);
    const reviewsRef = ref(db, `/reviews/${name}/${desiredYear}/${months_backword[desiredMonth]}`);
    
    // Get both falls and reviews data
    const [fallsSnapshot, reviewsSnapshot] = await Promise.all([
      get(fallsRef),
      get(reviewsRef)
    ]);

    const fallsData = fallsSnapshot.val();
    const reviewsData = reviewsSnapshot.val() || {};

    if (fallsData) {
      // Count falls per resident
      const fallCounts = {};
      Object.values(fallsData).forEach(fall => {
        if (fall.name) {
          fallCounts[fall.name] = (fallCounts[fall.name] || 0) + 1;
        }
      });

      // Filter for residents with 3+ falls who haven't been reviewed or need reminder
      const needReview = Object.entries(fallCounts)
        .filter(([residentName, count]) => {
          const review = reviewsData[residentName];
          if (!review) return count >= 3;  // No review exists
          
          // Check if reminder is due (more than 24 hours old)
          if (review.needsReminder && review.lastReminderTime) {
            const reminderTime = new Date(review.lastReminderTime);
            const now = new Date();
            return count >= 3 && (now - reminderTime) >= 86400000;  // 86400000ms = 24 hours
          }
          
          return false;  // Already reviewed
        })
        .map(([residentName]) => ({
          name: residentName
        }));

      setResidentsNeedingReview(needReview);
      if (needReview.length > 0) {
        setCurrentResidentIndex(0);
        setShowModal(true);
      }
    }
  };

  // Initial check and set up interval
  useEffect(() => {
    checkForUnreviewedResidents();
    const interval = setInterval(checkForUnreviewedResidents, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [name, desiredMonth]);

  const markReviewDone = async (resident) => {
    const reviewRef = ref(db, `/reviews/${name}/${desiredYear}/${months_backword[desiredMonth]}/${resident.name}`);
    await set(reviewRef, {
      reviewed: true,
      reviewedAt: serverTimestamp(),
      needsReminder: false,
      lastReminderTime: null
    });
    
    // Re-check for remaining unreviewed residents
    await checkForUnreviewedResidents();
  };

  const handleRemindLater = async () => {
    const currentResident = residentsNeedingReview[currentResidentIndex];
    const reviewRef = ref(db, `/reviews/${name}/${desiredYear}/${months_backword[desiredMonth]}/${currentResident.name}`);
    
    await set(reviewRef, {
      reviewed: false,
      needsReminder: true,
      lastReminderTime: serverTimestamp()
    });

    // Move to next resident if available
    if (currentResidentIndex < residentsNeedingReview.length - 1) {
      setCurrentResidentIndex(prev => prev + 1);
    } else {
      setShowModal(false);
      setCurrentResidentIndex(0);
      // Will be checked again by the interval
    }
  };

  const getDuplicateNames = (data) => {
    const nameCounts = {};
    data.forEach(item => {
      if (item.name) {
        nameCounts[item.name] = (nameCounts[item.name] || 0) + 1;
      }
    });
    return Object.keys(nameCounts).filter(name => nameCounts[name] > 1);
  };

  // Add this function to count total falls per resident
  const getResidentsWithMultipleFalls = (data) => {
    const fallCounts = {};
    data.forEach(item => {
      if (item.name) {
        fallCounts[item.name] = (fallCounts[item.name] || 0) + 1;
      }
    });
    return Object.keys(fallCounts).filter(name => fallCounts[name] >= 3);  // 3 or more falls
  };

  // Keep the existing getFallsWithin24Hours function
  const getFallsWithin24Hours = (data) => {
    const fallsByResident = {};
    
    const sortedData = [...data].sort((a, b) => {
      const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
      const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
      return dateA - dateB;
    });

    sortedData.forEach((fall, index) => {
      if (!fall.name || !fall.date) return;
      
      const currentFallTime = new Date(fall.date + ' ' + (fall.time || '00:00'));
      
      sortedData.slice(0, index).forEach(previousFall => {
        if (previousFall.name === fall.name) {
          const previousFallTime = new Date(previousFall.date + ' ' + (previousFall.time || '00:00'));
          const hoursDifference = (currentFallTime - previousFallTime) / (1000 * 60 * 60);
          
          if (hoursDifference <= 24) {
            fallsByResident[fall.name] = true;
          }
        }
      });
    });

    return fallsByResident;
  };

  // Add this array at the top of your component with the cause options
  const causeOptions = [
    'Environmental',
    'Physical',
    'Behavioral',
    'Unknown'
  ];

  const handleEditDescription = (index) => {
    setCurrentDescription(data[index].Description);
    setCurrentRowIndex(index);
    setIsDescriptionModalOpen(true);
  };

  const handleSubmitDescription = () => {
    if (currentDescription === data[currentRowIndex].Description) {
      setIsDescriptionModalOpen(false);
      return;
    }

    const updatedData = [...data];
    updatedData[currentRowIndex].Description = currentDescription;
    updatedData[currentRowIndex].isDescriptionUpdated = 'yes';

    const rowRef = ref(
      db,
      `/${name}/${desiredYear}/${months_backword[desiredMonth]}/row-${data[currentRowIndex].id}`
    );
    update(rowRef, { 
      Description: currentDescription, 
      isDescriptionUpdated: 'yes' 
    })
      .then(() => {
        console.log('Description updated successfully');
        setData(updatedData);
        setIsDescriptionModalOpen(false);
      })
      .catch((error) => {
        console.error('Error updating description:', error);
      });
  };

  return (
    <div className={styles.dashboard} ref={tableRef}>
      <h1>Palisade Gardens Falls Dashboard</h1>

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
              {/* <option value="6months">Past 6 Months</option> */}
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
            <option value="timeOfDay">Time of Day</option>
            <option value="location">Location</option>
            <option value="injuries">Injuries</option>
            <option value="residents">Residents w/ Recurring Falls</option>
          </select>

          {analysisChartData.datasets.length > 0 && <Bar data={analysisChartData} options={analysisChartOptions} />}
        </div>
      </div>
      <div className={styles['table-header']}>
        <div className={styles['header']}>
          <h2>
            Falls Report: {desiredMonth} {desiredYear}
          </h2>
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
        {/* <div>
          <button className={styles['download-button']} onClick={handleSaveCSV}>
            Open New Incident
          </button>
          <button className={styles['download-button']} onClick={handleSavePDF}>
            Open Incident List
          </button>
        </div> */}
      </div>
      {isModalOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent} style={{ width: '90%', maxWidth: '800px' }}>
            <div>
              <h2>Edit Interventions</h2>
              <textarea 
                value={currentIntervention} 
                onChange={(e) => setCurrentIntervention(e.target.value)}
                style={{ 
                  width: '100%', 
                  minHeight: '50px',
                  padding: '15px',
                  fontSize: '1.2em',
                  marginBottom: '10px',
                  fontFamily: 'inherit'
                }}
              />
              <br />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '1.2em',
                    cursor: 'pointer',
                    backgroundColor: '#ccc',
                    border: 'none',
                    borderRadius: '4px'
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitIntervention}
                  style={{
                    padding: '8px 16px',
                    fontSize: '1.2em',
                    cursor: 'pointer',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px'
                  }}
                >
                  Save
                </button>
              </div>
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
      {isLongTermInterventionModalOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div>
              <h2>Edit Long Term Intervention</h2>
              <textarea 
                value={currentLongTermIntervention} 
                onChange={(e) => setCurrentLongTermIntervention(e.target.value)}
                style={{ width: '100%', minHeight: '100px' }}
              />
              <br />
              <button onClick={handleSubmitLongTermIntervention}>Submit</button>
              <button onClick={() => setIsLongTermInterventionModalOpen(false)}>Cancel</button>
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
      {isDescriptionModalOpen && (
        <Modal
          isOpen={isDescriptionModalOpen}
          onClose={() => setIsDescriptionModalOpen(false)}
          title="Edit Description"
        >
          <div style={{ padding: '20px' }}>
            <textarea
              value={currentDescription}
              onChange={(e) => setCurrentDescription(e.target.value)}
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '10px',
                fontSize: '1.2em',
                marginBottom: '20px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsDescriptionModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  fontSize: '1.2em',
                  cursor: 'pointer',
                  backgroundColor: '#ccc',
                  border: 'none',
                  borderRadius: '4px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDescription}
                style={{
                  padding: '8px 16px',
                  fontSize: '1.2em',
                  cursor: 'pointer',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}
      <div className={styles['table-container']}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={styles.th} style={tableStyles.headerCell}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className={styles.tr}>
                {columns.map((column) => (
                  <td 
                    key={column.key} 
                    className={styles.td} 
                    style={{
                      ...tableStyles.tableCell,
                      ...(column.key === 'Description' ? tableStyles.descriptionCell : {}),
                      ...(column.key === 'interventions' ? tableStyles.interventionCell : {}),
                      ...(column.key === 'Injury' ? tableStyles.injuryCell : {})
                    }}
                  >
                    {column.key === 'Description' ? (
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div>
                          {expandedRows[row.id] ? (
                            <>
                              {row[column.key]}
                              <button
                                style={tableStyles.showLessBtn}
                                onClick={() => setExpandedRows(prev => ({
                                  ...prev,
                                  [row.id]: false
                                }))}
                              >
                                Show Less
                              </button>
                            </>
                          ) : (
                            <>
                              {truncateToTwoSentences(row[column.key])}
                              {row[column.key]?.length > 90 && (
                                <button
                                  style={tableStyles.showMoreBtn}
                                  onClick={() => setExpandedRows(prev => ({
                                    ...prev,
                                    [index]: true
                                  }))}
                                >
                                  Show More
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ) : column.key === 'Risk' ? (
                      <select
                        style={tableStyles.select}
                        value={row[column.key] || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          const rowRef = ref(db, `${name}/${desiredYear}/${months_backword[desiredMonth]}/${index}`);
                          update(rowRef, {
                            'Risk': newValue
                          });
                          setData(prevData => 
                            prevData.map((item, idx) => 
                              idx === index 
                                ? {...item, 'Risk': newValue}
                                : item
                            )
                          );
                        }}
                      >
                        <option value="">Select Risk Level</option>
                        {riskOptions.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : column.key === 'interventions' ? (
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div>
                          {row[column.key]}
                          <button
                            onClick={() => handleEditIntervention(index)}
                            style={{
                              ...tableStyles.showMoreBtn,
                              marginLeft: '10px',
                              color: '#4CAF50'
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ) : column.key === 'Cause' ? (
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div>
                          {expandedRows[index] ? (
                            <>
                              {row[column.key]}
                              <button
                                style={tableStyles.showLessBtn}
                                onClick={() => setExpandedRows(prev => ({
                                  ...prev,
                                  [index]: false
                                }))}
                              >
                                Show Less
                              </button>
                            </>
                          ) : (
                            <>
                              {truncateToTwoSentences(row[column.key])}
                              {row[column.key]?.length > 90 && (
                                <button
                                  style={tableStyles.showMoreBtn}
                                  onClick={() => setExpandedRows(prev => ({
                                    ...prev,
                                    [index]: true
                                  }))}
                                >
                                  Show More
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ) : column.key === 'Description' ? (
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div>
                          {expandedRows[index] ? (
                            <>
                              {row[column.key]}
                              <button
                                style={tableStyles.showLessBtn}
                                onClick={() => setExpandedRows(prev => ({
                                  ...prev,
                                  [index]: false
                                }))}
                              >
                                Show Less
                              </button>
                            </>
                          ) : (
                            <>
                              {truncateToTwoSentences(row[column.key])}
                              {row[column.key]?.length > 90 && (
                                <button
                                  style={tableStyles.showMoreBtn}
                                  onClick={() => setExpandedRows(prev => ({
                                    ...prev,
                                    [index]: true
                                  }))}
                                >
                                  Show More
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      row[column.key]
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

