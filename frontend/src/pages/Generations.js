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

  const [currentLongTermIntervention, setCurrentLongTermIntervention] = useState('');
  const [isLongTermInterventionModalOpen, setIsLongTermInterventionModalOpen] = useState(false);

  const [hardcodedInsights] = useState([
    {
      id: 'insight-1',
      emoji: "📌",
      content: "Monthly fall prevention protocol review is due. Please ensure all staff are updated on current procedures.",
      type: "reminder",
      rating: 0,
      reviewed: false
    },
    {
      id: 'insight-2',
      emoji: "💡",
      content: "Corridor lighting inspection needed in all units. Focus on evening shift transition periods for maximum safety.",
      type: "tip",
      rating: 0,
      reviewed: false
    },
    {
      id: 'insight-3',
      emoji: "🎯",
      content: "Barry, Peter fell due to getting up to use the washroom twice & both during the evening shift.",
      type: "goal",
      rating: 0,
      reviewed: false
    },
    // {
    //   id: 'insight-4',
    //   emoji: "⚠️",
    //   content: "30% of falls happened due to residents getting up to use the washroom.",
    //   type: "maintenance",
    //   rating: 0,
    //   reviewed: false
    // },
    // {
    //   id: 'insight-5',
    //   emoji: "📊",
    //   content: "Multiple falls happened at 14 - 16hrs, this could indicate a trend.",
    //   type: "training",
    //   rating: 0,
    //   reviewed: false
    // },
    // {
    //   id: 'insight-6',
    //   emoji: ".",
    //   content: "Multiple falls happened at 14 - 16hrs, this could indicate a trend.",
    //   type: "training",
    //   rating: 0,
    //   reviewed: false
    // }
  ]);

  const [insightRatings, setInsightRatings] = useState({});
  const [reviewedInsights, setReviewedInsights] = useState({});

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

    console.log(updatedData);
    const rowRef = ref(db, `/${name}/${desiredYear}/${months_backword[desiredMonth]}/row-${data[currentRowIndex].id}`);
    update(rowRef, {
      interventions: currentIntervention,
      isInterventionsUpdated: 'yes',
    })
      .then(() => {
        console.log('Intervention updated successfully');
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
      `/${name}/${desiredYear}/${months_backword[desiredMonth]}/row-${data[currentCauseRowIndex].id}`
    );
    update(rowRef, { cause: currentCauseOfFall, isCauseUpdated: 'yes' })
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

      case 'unit':
        setAnalysisHeaderText('Falls by Unit');
        
        // Count falls for each unit
        const unitCounts = {};
        filteredData.forEach(fall => {
          // Check both homeUnit and room fields
          const unit = fall.homeUnit || fall.room || 'Unknown';  
          console.log('Fall unit data:', { unit, homeUnit: fall.homeUnit, room: fall.room, fall }); // Debug log
          unitCounts[unit] = (unitCounts[unit] || 0) + 1;
        });

        // Set the chart data
        setAnalysisChartData({
          labels: Object.keys(unitCounts),
          datasets: [
            {
              data: Object.values(unitCounts),
              backgroundColor: 'rgba(76, 175, 80, 0.6)',
              borderColor: 'rgb(76, 175, 80)',
              borderWidth: 1,
            },
          ],
        });
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
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'updated_fall_data.csv');
  };

  const handleUpdateCSV = async (index, newValue, name, changeType) => {
    const collectionRef = ref(db, `/${name}/${desiredYear}/${months_backword[desiredMonth]}`);

    try {
      const snapshot = await get(collectionRef);

      if (snapshot.exists()) {
        const rows = snapshot.val(); // Get all rows as an object
        let targetRowKey = null;

        for (const [key, row] of Object.entries(rows)) {
          if (row.id === String(index)) {
            targetRowKey = key;
            break;
          }
        }

        if (targetRowKey) {
          const rowRef = child(collectionRef, targetRowKey);
          let updates = {};

          switch (changeType) {
            case 'hir':
              updates = { hir: newValue, isHirUpdated: 'yes' };
              break;
            case 'hospital':
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

          // Apply the updates
          await update(rowRef, updates);
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
  }, [analysisType, analysisTimeRange, analysisUnit, data, desiredYear]);

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

  // First, define your column structure
  const columns = [
    { key: 'type', label: 'Type' },
    { key: 'date', label: 'Date' },
    { key: 'name', label: 'Name' },
    { key: 'Day of the Week', label: 'Day of the Week' },
    { key: 'time', label: 'Time' },
        { key: 'room', label: 'Location' },
    { key: 'cause', label: 'Cause of Fall' },
    { key: 'interventions', label: 'Interventions' },
    { key: 'injuries', label: 'Injuries' },
    { key: 'witnessed', label: 'Witnessed?' },
    { key: 'Falls This Month', label: 'Falls This Month' },
    { key: 'Falls in 3 Months', label: 'Falls in 3 Months' },
    { key: 'Near Missses in 3 Months', label: 'Near Misses in 3 Months' },
    { key: 'transfer_to_hospital', label: 'Transferred to Hospital?' },
    { key: 'longTermIntervention', label: 'Long Term Intervention' },
  ];

  const handleRatingChange = async (insightId, newRating) => {
    if (newRating < 1 || newRating > 3) return;
    
    try {
      // Find the insight object
      const insight = getAllInsights().find(i => i.id === insightId);
      if (!insight) return;

      // Update Firebase with full insight data
      const ratingRef = ref(db, `/${name}/insights/${insightId}`);
      await set(ratingRef, {
        rating: newRating,
        content: insight.content,
        emoji: insight.emoji,
        type: insight.type,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setInsightRatings(prev => ({
        ...prev,
        [insightId]: { 
          rating: newRating,
          content: insight.content,
          emoji: insight.emoji,
          type: insight.type
        }
      }));
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  };

  const handleReviewInsight = async (insightId) => {
    try {
      // Find the insight object
      const insight = getAllInsights().find(i => i.id === insightId);
      if (!insight) return;
      
      // Check if insight has a rating
      if (!insight.rating) {
        alert('Please rate this insight before marking it as reviewed');
        return;
      }

      // Update Firebase with full insight data
      const insightRef = ref(db, `/${name}/insights/${insightId}`);
      await set(insightRef, {
        content: insight.content,
        emoji: insight.emoji,
        type: insight.type,
        reviewed: true,
        rating: insight.rating,
        reviewedAt: serverTimestamp()
      });
      
      setReviewedInsights(prev => ({
        ...prev,
        [insightId]: true
      }));
    } catch (error) {
      console.error('Error marking insight as reviewed:', error);
    }
  };

  const getAllInsights = () => {
    // First, map all hardcoded insights
    const allInsights = hardcodedInsights.map(insight => {
      // Check if this insight exists in Firebase (has rating or reviewed status)
      const firebaseData = insightRatings[insight.id] || {};
      const isReviewed = reviewedInsights[insight.id] || false;
      
      return {
        ...insight,
        rating: firebaseData.rating || 0,
        reviewed: isReviewed
      };
    });

    // Filter out reviewed insights
    return allInsights.filter(insight => !insight.reviewed);
  };

  // Load both ratings and reviewed status from Firebase on component mount
  useEffect(() => {
    const loadInsightData = async () => {
      const insightsRef = ref(db, `/${name}/insights`);
      const snapshot = await get(insightsRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const ratings = {};
        const reviewed = {};
        
        Object.entries(data).forEach(([id, insight]) => {
          if (insight.rating) ratings[id] = insight;
          if (insight.reviewed) reviewed[id] = true;
        });
        
        setInsightRatings(ratings);
        setReviewedInsights(reviewed);
      }
    };
    loadInsightData();
  }, [name]);

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
            <option value="timeOfDay">Time of Day</option>
            <option value="location">Location</option>
            <option value="injury">Injuries</option>
            <option value="residents">Residents w/ Recurring Falls</option>
            <option value="unit">Falls by Unit</option>
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
            {unitSelectionValues.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>

          {analysisChartData.datasets.length > 0 && <Bar data={analysisChartData} options={analysisChartOptions} />}
        </div>

        <div className={styles.chart}>
          <h2>
            <span style={{
              fontSize: getAllInsights().length > 1 ? '45px' : '22.5px',
              fontWeight: getAllInsights().length > 1 ? '700' : '700',
              color: getAllInsights().length > 1 ? '#8BD087' : 'inherit'
            }}>
              {getAllInsights().length} insight(s)
            </span>
            {" left to review:"}
          </h2>
          <div style={{
            padding: '10px',
            height: '300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: '#CBD5E1 #F1F5F9',
            marginTop: '5px'
          }}>
            {getAllInsights().map((insight) => (
              <div 
                key={insight.id} 
                style={{
                  background: 'white',
                  borderRadius: '8px',
                  padding: '12px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  marginBottom: '8px',
                  position: 'relative',
                  border: '1px solid #f0f0f0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start'
                }}>
                  <span style={{
                    fontSize: '15px',
                    lineHeight: '1.4',
                    marginTop: '2px'
                  }}>
                    {insight.emoji}
                  </span>
                  <span style={{
                    fontSize: '18.5px',
                    color: '#334155',
                    lineHeight: '1.4',
                    fontWeight: '500'
                  }}>
                    {insight.content}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #f0f0f0',
                  paddingTop: '8px',
                  marginTop: 'auto'
                }}>
                  <button
                    onClick={() => handleReviewInsight(insight.id)}
                    style={{
                      background: insight.rating ? '#8BD087' : '#e2e8f0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 12px',
                      fontSize: '13px',
                      cursor: insight.rating ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease',
                      opacity: insight.rating ? 1 : 0.7
                    }}
                  >
                    {insight.rating ? 'Reviewed' : 'Rate First'}
                  </button>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      color: '#64748b'
                    }}>
                      Value:
                    </span>
                    {[1, 2, 3].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleRatingChange(insight.id, num)}
                        style={{
                          background: insight.rating === num ? '#8BD087' : '#f8fafc',
                          border: '1px solid',
                          borderColor: insight.rating === num ? '#8BD087' : '#e2e8f0',
                          borderRadius: '4px',
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: insight.rating === num ? 'white' : '#64748b',
                          transition: 'all 0.2s ease',
                          padding: '0',
                          margin: '0'
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles['table-header']}>
        <div className={styles['header']}>
          <h2>
            Falls Tracking Table: {desiredMonth} {desiredYear}
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
            {columns.map(col => (
              <th key={col.key} style={{ fontSize: '18px' }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody id="fallsTableBody">
          {data.map((item, i) => (
            <tr key={i}>
              {columns.map(col => (
                <td key={col.key} style={{ fontSize: '16px', whiteSpace: col.key === 'date' ? 'nowrap' : 'normal' }}>
                  {col.key === 'transfer_to_hospital' ? (
                    <select
                      value={item[col.key] === 'yes' || item[col.key] === 'Yes' ? 'Yes' : 'No'}
                      onChange={(e) => handleUpdateCSV(data[i].id, e.target.value, 'generations', 'hospital')}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  ) : col.key === 'longTermIntervention' ? (
                    <div style={{ cursor: 'pointer' }} onClick={() => handleEditLongTermIntervention(i)}>
                      {item[col.key] || 'Click to add'}
                    </div>
                  ) : (
                    item[col.key]
                  )}
                </td>
              ))}
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
      
    </div>
  );
}
