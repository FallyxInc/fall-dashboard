import React, { useEffect, useState, useRef } from 'react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
// import "../styles/Dashboard.css"
import styles from '../styles/Dashboard.module.css';
import { useNavigate } from 'react-router-dom';
import * as Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { Chart, ArcElement, PointElement, LineElement, plugins } from 'chart.js';
// import { collection, addDoc } from 'firebase/firestore';
import { ref, onValue, off, get, update } from 'firebase/database';
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
  getTimeShift,
  countResidentsWithRecurringFalls,
  countFallsByTimeOfDay,
} from '../utils/DashboardUtils';

Chart.register(ArcElement, PointElement, LineElement);

export default function Dashboard({ name, title, unitSelectionValues, goal }) {
  const [data, setData] = useState([]);
  const [threeMonthData, setThreeMonthData] = useState({});
  const [desiredMonth, setDesiredMonth] = useState('December');

  // console.log('data');
  // console.log(data);
  // console.log(currentMonth);
  // const [isLoading, setIsLoading] = useState(true);
  // console.log(threeMonthData);

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

  const navigate = useNavigate();
  const months_forward = {
    10: 'October',
    11: 'November',
    12: 'December',
    '01': 'January',
    '02': 'February',
    '03': 'March',
    '04': 'April',
    '05': 'May',
    '06': 'June',
    '07': 'July',
    '08': 'August',
    '09': 'September',
  };

  const months_backword = {
    October: '10',
    November: '11',
    December: '12',
    January: '01',
    February: '02',
    March: '03',
    April: '04',
    May: '05',
    June: '06',
    July: '07',
    August: '08',
    September: '09',
  };

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

  const handleMonthChange = (event) => {
    const selectedMonth = event.target.value;
    setDesiredMonth(selectedMonth);
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
    const rowRef = ref(db, `/${name}/2024/${months_backword[desiredMonth]}/row-${data[currentRowIndex].id}`);
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

    const rowRef = ref(db, `/${name}/2024/${months_backword[desiredMonth]}/row-${data[currentCauseRowIndex].id}`);
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
      `/${name}/2024/${months_backword[desiredMonth]}/row-${data[currentPostFallNotesRowIndex].id}`
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

  const updateFallsChart = () => {
    const timeRange = fallsTimeRange;
    const currentFalls = countTotalFalls();
    let newData;

    if (currentFalls >= goal) {
      newData = [goal, 0];
    } else {
      newData = [currentFalls, goal - currentFalls];
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
          labels: Object.keys(threeMonthData)
            .sort()
            .map((key) => months_forward[key]),
          datasets: [
            {
              label: 'Number of Falls',
              data: Object.values(threeMonthData)
                .sort()
                .map((data) => data.length),
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
    var filteredData = analysisTimeRange === '3months' ? Object.values(threeMonthData).flat() : data;

    if (selectedUnit !== 'allUnits') {
      filteredData = filteredData.filter(
        (fall) => fall.homeUnit.trim()?.toLowerCase() === selectedUnit.trim().toLowerCase()
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

  const handleUpdateCSV = (index, newValue, name, changeType) => {
    const rowRef = ref(db, `/${name}/2024/${months_backword[desiredMonth]}/row-${index}`);
    let updates = {};

    switch (changeType) {
      case 'hir':
        updates = { hir: newValue, isHirUpdated: 'yes' };
        break;
      case 'hospital':
        updates = { hospital: newValue, isHospitalUpdated: 'yes' };
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
        break;
    }

    update(rowRef, updates)
      .then(() => {
        console.log('Data updated successfully in Firebase');
      })
      .catch((error) => {
        console.error('Error updating data:', error);
      });
  };

  useEffect(() => {
    // Start measuring fetch data time
    performance.mark('start-fetch-data');
    const dataRef = ref(db, `/${name}/2024/${months_backword[desiredMonth]}`); // Firebase ref for this specific dashboard
    // const dataRef = ref(db, name);
    const currentYear = 2024;
    const currentMonth = parseInt(months_backword[desiredMonth]); // current month
    const pastThreeMonths = [];

    for (let i = 3; i >= 1; i--) {
      const month = currentMonth - i;
      if (month > 0) {
        pastThreeMonths.push({ year: currentYear, month: String(month).padStart(2, '0') });
      } else {
        // if month less than one, return last year
        pastThreeMonths.push({ year: currentYear - 1, month: String(12 + month).padStart(2, '0') });
      }
    }

    // console.log('pastThreeMonths');
    // console.log(pastThreeMonths);

    const allFallsData = pastThreeMonths.sort().reduce((acc, pair) => {
      acc[pair.month] = [];
      return acc;
    }, {});
    // console.log('allfalldata');
    // console.log(allFallsData);

    pastThreeMonths.forEach(({ year, month }) => {
      const monthRef = ref(db, `/${name}/${year}/${month}`);

      const listener = onValue(monthRef, (snapshot) => {
        if (snapshot.exists()) {
          const fallsData = snapshot.val();
          const monthData = Object.keys(fallsData).map((key) => fallsData[key]);
          allFallsData[month] = monthData;
          // console.log('month data');
          // console.log(monthData);
          // console.log('month');
          // console.log(month);
          // console.log('allFallsData');
          // console.log(allFallsData);
          setThreeMonthData({ ...allFallsData });
        } else {
          allFallsData[month] = [];
        }
      });

      return () => off(monthRef, listener);
    });

    const listener = onValue(dataRef, (snapshot) => {
      if (snapshot.exists()) {
        const fetchedData = snapshot.val();

        // End measuring fetch data time
        performance.mark('end-fetch-data');
        performance.measure('Fetch Data Time', 'start-fetch-data', 'end-fetch-data');

        const fetchDataTime = performance.getEntriesByName('Fetch Data Time')[0].duration;
        console.log('Fetch Data Time: ', fetchDataTime, 'ms'); // Logs the time it took for fetching data

        console.log('fetchedData');
        console.log(fetchedData);

        let withIdData = Object.values(fetchedData);
        for (let i = 0; i < withIdData.length; i++) {
          withIdData[i].id = i;
        }

        const updatedData = markPostFallNotes(withIdData);
        const sortedData = updatedData.sort(
          (a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time)
        );
        setData(sortedData); // Update state with the sorted data
      } else {
        setData([]);
        console.log(`${name} data not found.`);
      }
    });

    return () => {
      off(dataRef, listener); // Cleanup listener on unmount
    };
  }, [desiredMonth]);

  useEffect(() => {
    updateFallsChart();
    // console.log('Falls Chart');
  }, [fallsTimeRange, data, desiredMonth]);

  useEffect(() => {
    updateAnalysisChart();
    // console.log('Analysis Chart');
  }, [analysisType, analysisTimeRange, analysisUnit, data]);

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
            {/* <option value="hir">Falls by HIR</option> */}
            <option value="residents">Residents w/ Recurring Falls</option>
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
      </div>
      <div className={styles['table-header']}>
        <div className={styles['header']}>
          <h2>Falls Tracking Table: {desiredMonth} 2024</h2>
          <select onChange={handleMonthChange} value={desiredMonth}>
            <option value="October">October</option>
            <option value="November">November</option>
            <option value="December">December</option>
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
        {/* Set the table width to 100% to make it wider */}
        <thead>
          <tr>
            <th style={{ fontSize: '18px' }}>Date</th> {/* Increased font size */}
            <th style={{ fontSize: '18px' }}>Name</th>
            <th style={{ fontSize: '18px' }}>Time</th>
            <th style={{ fontSize: '18px' }}>Location</th>
            <th style={{ fontSize: '18px' }}>Home Unit</th>
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
          {data.map((item, i) => (
            <tr key={i}>
              <td style={{ whiteSpace: 'nowrap', fontSize: '16px' }}>{item.date}</td> {/* Increased font size */}
              <td style={{ fontSize: '16px' }}>{item.name}</td>
              <td style={{ fontSize: '16px' }}>{item.time}</td>
              <td style={{ fontSize: '16px' }}>{item.location}</td>
              <td style={{ fontSize: '16px' }}>{item.homeUnit}</td>
              {/* <td style={{ fontSize: '16px' }}>{item.cause}</td> */}
              <td style={{ fontSize: '16px', color: item.isCauseUpdated === 'yes' ? 'green' : 'inherit' }}>
                {item.cause}
                <br />
                <button onClick={() => handleEditCauseOfFall(i)}>Edit</button>
              </td>
              <td
                style={{
                  fontSize: '16px',
                  color: item.isInterventionsUpdated === 'yes' ? 'green' : 'inherit',
                }}
              >
                {item.interventions}
                <br></br>
                <button onClick={() => handleEditIntervention(i)}>Edit</button>
              </td>
              <td style={{ fontSize: '16px' }}>
                <select
                  value={item.hir?.toLowerCase() === 'yes' ? 'Yes' : item.hir?.toLowerCase() === 'no' ? 'No' : item.hir}
                  onChange={(e) => handleUpdateCSV(data[i].id, e.target.value, name, 'hir')}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </td>
              <td style={{ fontSize: '16px' }}>{item.injury}</td>
              <td style={{ fontSize: '16px' }}>
                <select
                  value={
                    item.hospital?.toLowerCase() === 'yes'
                      ? 'Yes'
                      : item.hospital?.toLowerCase() === 'no'
                      ? 'No'
                      : item.hospital
                  }
                  onChange={(e) => handleUpdateCSV(data[i].id, e.target.value, name, 'hospital')}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </td>
              <td style={{ fontSize: '16px' }}>
                <select
                  value={
                    item.ptRef?.toLowerCase() === 'yes' ? 'Yes' : item.ptRef?.toLowerCase() === 'no' ? 'No' : item.ptRef
                  }
                  onChange={(e) => handleUpdateCSV(data[i].id, e.target.value, name, 'ptRef')}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </td>
              <td style={{ fontSize: '16px' }}>
                <select
                  value={
                    item.physicianRef?.toLowerCase() === 'yes'
                      ? 'Yes'
                      : item.physicianRef?.toLowerCase() === 'no'
                      ? 'No'
                      : item.physicianRef
                  }
                  onChange={(e) => handleUpdateCSV(data[i].id, e.target.value, name, 'physicianRef')}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="N/A">N/A</option>
                </select>
              </td>
              <td className={item.poaContacted === 'No' ? styles.cellRed : ''} style={{ fontSize: '16px' }}>
                <select
                  value={
                    item.poaContacted?.toLowerCase() === 'yes'
                      ? 'Yes'
                      : item.poaContacted?.toLowerCase() === 'no'
                      ? 'No'
                      : item.poaContacted
                  }
                  onChange={(e) => handleUpdateCSV(data[i].id, e.target.value, name, 'poaContacted')}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </td>
              <td style={{ fontSize: '16px' }}>
                <select
                  value={
                    item.incidentReport?.toLowerCase() === 'yes'
                      ? 'Yes'
                      : item.incidentReport?.toLowerCase() === 'no'
                      ? 'No'
                      : item.incidentReport
                  }
                  onChange={(e) => handleUpdateCSV(data[i].id, e.target.value, name, 'incidentReport')}
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
    </div>
  );
}
