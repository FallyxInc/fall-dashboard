import React, { useEffect, useState, useRef } from 'react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
// import "../styles/Dashboard.css"
import styles from '../styles/Dashboard.module.css';
import { useNavigate } from 'react-router-dom';
import { threeData } from '../data/TableData';
import * as Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { Chart, ArcElement, PointElement, LineElement } from 'chart.js';
// import { collection, addDoc } from 'firebase/firestore';
import { ref, onValue, off, get, update } from 'firebase/database';
import { db } from '../firebase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2PDF from 'jspdf-html2canvas';

Chart.register(ArcElement, PointElement, LineElement);

export default function Dashboard({ name, title, unitSelectionValues }) {
  const [data, setData] = useState([]);
  // const [isLoading, setIsLoading] = useState(true);

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
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // State variables
  const threeMonthData = threeData;
  // const [tableData, setTableData] = useState(data);
  const goal = 10;

  // console.log(tableData);
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIntervention, setCurrentIntervention] = useState('');
  const [currentRowIndex, setCurrentRowIndex] = useState(null);

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
    updatedData[currentRowIndex].isInterventionUpdated = true;

    const rowRef = ref(db, `/${name}/row-${currentRowIndex}`);
    update(rowRef, { interventions: currentIntervention, isInterventionUpdated: true })
      .then(() => {
        console.log('Intervention updated successfully');
        setData(updatedData);
        setIsModalOpen(false);
      })
      .catch((error) => {
        console.error('Error updating intervention:', error);
      });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const updateFallsChart = () => {
    const timeRange = fallsTimeRange;
    const currentFalls = countTotalFalls();

    switch (timeRange) {
      case 'current':
        setGaugeChart(true);
        setGaugeChartData({
          datasets: [
            {
              data: [currentFalls, goal - currentFalls],
              backgroundColor: ['rgba(76, 175, 80, 0.8)', 'rgba(200, 200, 200, 0.2)'],
              circumference: 180,
              rotation: 270,
            },
          ],
        });
        break;
      case '3months':
        setGaugeChart(false);
        let newData = [0, 0, 0];
        // Aggregate falls counts for the past three months
        threeMonthData.forEach((item) => {
          const month = item.date.split('-')[1];
          switch (month) {
            case 'Jul':
              newData[0]++;
              break;
            case 'Aug':
              newData[1]++;
              break;
            case 'Sep':
              newData[2]++;
              break;
          }
        });
        setLineChartData({
          labels: ['July', 'August', 'September'],
          datasets: [
            {
              label: 'Number of Falls',
              data: newData,
              borderColor: 'rgb(76, 175, 80)',
              tension: 0.1,
            },
          ],
        });
        break;
      case '6months':
        setGaugeChart(false);
        setLineChartData({
          labels: months.slice(2, 8),
          datasets: [
            {
              label: ['April', 'May', 'June', 'July', 'August', 'September'],
              data: [45, 36, 30, 46, 43, 43],
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

  function countFallsByTimeOfDay(data) {
    var timeOfDayCounts = { Morning: 0, Evening: 0, Night: 0 };

    data.forEach((fall) => {
      var shift = getTimeShift(fall.time);
      timeOfDayCounts[shift]++;
    });

    return timeOfDayCounts;
  }

  function countFallsByExactInjury(data) {
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

  function countFallsByLocation(data) {
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

  function countFallsByHIR(data) {
    var hirCount = 0;

    data.forEach((fall) => {
      if (fall.hir.toLowerCase() === 'yes') {
        hirCount++;
      }
    });

    return hirCount;
  }

  function getMonthFromTimeRange(timeRange) {
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

  function getTimeShift(fallTime) {
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

  function countResidentsWithRecurringFalls(data) {
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

  const tableData = [
    { date: '2024-10-27', name: 'John Doe', time: '10:00', location: 'Room 1' },
    { date: '2024-10-28', name: 'Jane Smith', time: '12:00', location: 'Room 2' },
    { date: '2024-10-29', name: 'Alice Johnson', time: '14:00', location: 'Room 3' },
    // 添加更多数据行...
  ];

  const generatePDF = () => {
    const pdf = new jsPDF();

    // 定义表格标题
    const columns = [
      { header: 'Date', dataKey: 'date' },
      { header: 'Name', dataKey: 'name' },
      { header: 'Time', dataKey: 'time' },
      { header: 'Location', dataKey: 'location' },
      { header: 'Home Unit', dataKey: 'homeUnit' },
      { header: 'Nature of Fall/Cause', dataKey: 'cause' },
      { header: 'Interventions', dataKey: 'interventions' },
      { header: 'HIR', dataKey: 'hir' },
      { header: 'Injury', dataKey: 'injury' },
      { header: 'Transfer to Hospital', dataKey: 'hospital' },
      { header: 'PT Ref', dataKey: 'ptRef' },
      { header: 'Physician/NP Notification (If Applicable)', dataKey: 'physicianRef' },
      { header: 'POA Contacted', dataKey: 'poaContacted' },
      { header: 'Risk Management Incident Fall Written', dataKey: 'incidentReport' },
      { header: '3 Post Fall Notes in 72hrs', dataKey: 'postFallNotes' },
    ];
    const rowsPerPage = 10; // 每页行数限制
    let currentPage = 0;
    // 填充表格数据
    while (currentPage * rowsPerPage < tableData.length) {
      const rows = data.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage).map((row) => ({
        date: row.date,
        name: row.name,
        time: row.time,
        location: row.location,
        homeUnit: row.homeUnit,
        cause: row.cause,
        interventions: row.interventions,
        hir: row.hir,
        injury: row.injury,
        hospital: row.hospital,
        ptRef: row.ptRef,
        physicianRef: row.physicianRef,
        poaContacted: row.poaContacted,
        incidentReport: row.incidentReport,
        postFallNotes: row.postFallNotes,
      }));

      pdf.autoTable({
        columns: columns,
        body: rows,
        startY: 10,
        theme: 'striped',
        headStyles: { fillColor: [100, 100, 255] },
        styles: { fontSize: 10, cellPadding: 2 },
        margin: { top: 20 },
      });

      currentPage++;
      if (currentPage * rowsPerPage < data.length) pdf.addPage();
    }
    pdf.save('table_data.pdf');
  };

  const updateAnalysisChart = () => {
    var selectedUnit = analysisUnit;
    var filteredData = analysisTimeRange === '3months' ? threeMonthData : data;

    if (selectedUnit !== 'allUnits') {
      filteredData = filteredData.filter(
        (fall) => fall.homeUnit.trim().toLowerCase() === selectedUnit.trim().toLowerCase()
      );
    }

    let newLabels = [];
    let newData = [];

    switch (analysisType) {
      case 'timeOfDay':
        setAnalysisHeaderText('Falls by Time of Day');
        newLabels = ['Morning', 'Evening', 'Night'];
        var timeOfDayCounts = countFallsByTimeOfDay(filteredData);
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
    if (tableRef.current) {
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        width: tableRef.current.scrollWidth,
        height: tableRef.current.scrollHeight,
      });
      const imgData = canvas.toDataURL('image/png');

      const newWindow = window.open();
      newWindow.document.title = 'Captured Image';

      // 动态创建 img 元素并设置 src
      const imgElement = newWindow.document.createElement('img');
      imgElement.src = imgData;
      imgElement.alt = 'Captured Image';
      imgElement.style.maxWidth = '100%';
      newWindow.document.body.appendChild(imgElement);
      // // 将 Base64 转换为 Blob 对象
      // const byteString = atob(imgData.split(',')[1]); // 解码 Base64
      // const mimeString = imgData.split(',')[0].split(':')[1].split(';')[0];
      // const ab = new ArrayBuffer(byteString.length);
      // const ia = new Uint8Array(ab);

      // for (let i = 0; i < byteString.length; i++) {
      //   ia[i] = byteString.charCodeAt(i);
      // }

      // const blob = new Blob([ab], { type: mimeString });

      // // 创建下载链接
      // const link = document.createElement('a');
      // link.href = URL.createObjectURL(blob);
      // link.download = 'Captured_Image.png'; // 设置下载文件名
      // link.click();

      // // 释放 URL 对象
      // URL.revokeObjectURL(link.href);

      // const pdf = new jsPDF({
      //   orientation: 'portrait',
      //   unit: 'px',
      //   format: 'a4',
      // });

      // // 获取 A4 页面尺寸
      // const pageHeight = pdf.internal.pageSize.height;
      // const pageWidth = pdf.internal.pageSize.width;

      // // 计算图像的缩放宽度和高度
      // const imgWidth = pageWidth;
      // const imgHeight = (canvas.height * pageWidth) / canvas.width;

      // let position = 0;

      // // 按页面高度分页
      // while (position < canvas.height) {
      //   // 在 PDF 页面上绘制图像的一部分
      //   pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST', 0, -position);

      //   // 更新 position，移动到下一页
      //   position += pageHeight;

      //   // 如果图片未完全展示完，添加新页面
      //   if (position < canvas.height) {
      //     pdf.addPage();
      //   }
      // }

      // pdf.save('Falls_Tracking_Table.pdf');
    }
  };

  const handleSaveCSV = () => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'updated_fall_data.csv');
  };

  const AddNoUpdate = async (name) => {
    const igghRef = ref(db, `/${name}`);
    const snapshot = await get(igghRef);

    if (snapshot.val()) {
      const updates = {};

      // 遍历所有的 row-X 节点
      snapshot.forEach((childSnapshot) => {
        const rowKey = childSnapshot.key;
        console.log(rowKey);
        updates[`/${name}/${rowKey}/isInterventionUpdated`] = false;
      });
      console.log(updates);
      // 批量更新所有节点
      await update(ref(db), updates);
      console.log('Successfully updated all rows');
    }
  };

  const handleUpdateCSV = (index, newValue, name, changeType) => {
    const rowRef = ref(db, `/${name}/row-${index}`);
    // Create an object to hold the updates
    let updates = {};

    // Update either the "physicianRef" or "poaContacted" field based on the flag
    if (isPhycicianRef) {
      updates = { physicianRef: newValue };
    } else {
      updates = { poaContacted: newValue };
    }

    // Use Firebase's update method to update the specific field in the database
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
    const dataRef = ref(db, `/${name}`); // Firebase ref for this specific dashboard
    // const dataRef = ref(db, name);

    const listener = onValue(dataRef, (snapshot) => {
      if (snapshot.exists()) {
        const fetchedData = snapshot.val();

        // End measuring fetch data time
        performance.mark('end-fetch-data');
        performance.measure('Fetch Data Time', 'start-fetch-data', 'end-fetch-data');

        const fetchDataTime = performance.getEntriesByName('Fetch Data Time')[0].duration;
        console.log('Fetch Data Time: ', fetchDataTime, 'ms'); // Logs the time it took for fetching data

        // Object.keys(fetchedData) will give you all the keys, i.e., 'row-0', 'row-1', etc.
        // Sort the keys and then map them to the corresponding values
        const sortedData = Object.keys(fetchedData)
          .sort((a, b) => {
            const rowA = parseInt(a.split('-')[1], 10); // Extract number from 'row-x'
            const rowB = parseInt(b.split('-')[1], 10);
            return rowA - rowB; // Sort in ascending order
          })
          .map((key) => fetchedData[key]); // Map sorted keys to the values

        setData(sortedData); // Update state with the sorted data
      } else {
        console.log(`${name} data not found.`);
      }
    });

    return () => {
      off(dataRef, listener); // Cleanup listener on unmount
    };
  }, []);

  useEffect(() => {
    updateFallsChart();
    // console.log('Falls Chart');
  }, [fallsTimeRange, data]);

  useEffect(() => {
    updateAnalysisChart();
    // console.log('Analysis Chart');
  }, [analysisType, analysisTimeRange, analysisUnit, data]);

  return (
    <div className={styles.dashboard}>
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
              <option value="6months">Past 6 Months</option>
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
            <option value="hir">Falls by HIR</option>
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

      <button onClick={generatePDF} style={{ marginBottom: '20px' }}>
        Download Table as PDF
      </button>

      <div ref={tableRef}>
        <div className={styles['table-header']}>
          <h2>Falls Tracking Table: October 2024</h2>
          <div>
            <button className={styles['download-button']} onClick={handleSaveCSV}>
              Download as CSV
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
              <th style={{ fontSize: '18px' }}>HIR</th>
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
                <td style={{ fontSize: '16px' }}>{item.cause}</td>
                <td style={{ fontSize: '16px', color: item.isInterventionUpdated === 'Yes' ? 'green' : 'inherit' }}>
                  {item.interventions}
                  <br></br>
                  <button onClick={() => handleEditIntervention(i)}>Edit</button>
                </td>
                <td style={{ fontSize: '16px' }}>
                  <select
                    value={item.hir.toLowerCase() === 'yes' ? 'Yes' : item.hir.toLowerCase() === 'no' ? 'No' : item.hir}
                    onChange={(e) => handleUpdateCSV(i, e.target.value, name, 'hir')}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </td>
                <td style={{ fontSize: '16px' }}>{item.injury}</td>
                <td style={{ fontSize: '16px' }}>
                  <select
                    value={
                      item.hospital.toLowerCase() === 'yes'
                        ? 'Yes'
                        : item.hospital.toLowerCase() === 'no'
                        ? 'No'
                        : item.hospital
                    }
                    onChange={(e) => handleUpdateCSV(i, e.target.value, name, 'hospital')}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </td>
                <td style={{ fontSize: '16px' }}>
                  <select
                    value={
                      item.ptRef.toLowerCase() === 'yes' ? 'Yes' : item.ptRef.toLowerCase() === 'no' ? 'No' : item.ptRef
                    }
                    onChange={(e) => handleUpdateCSV(i, e.target.value, name, 'ptRef')}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </td>
                <td style={{ fontSize: '16px' }}>
                  <select
                    value={
                      item.physicianRef.toLowerCase() === 'yes'
                        ? 'Yes'
                        : item.physicianRef.toLowerCase() === 'no'
                        ? 'No'
                        : item.physicianRef
                    }
                    onChange={(e) => handleUpdateCSV(i, e.target.value, name, 'physicianRef')}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="N/A">N/A</option>
                  </select>
                </td>
                <td className={item.poaContacted === 'No' ? styles.cellRed : ''} style={{ fontSize: '16px' }}>
                  <select
                    value={
                      item.poaContacted.toLowerCase() === 'yes'
                        ? 'Yes'
                        : item.poaContacted.toLowerCase() === 'no'
                        ? 'No'
                        : item.poaContacted
                    }
                    onChange={(e) => handleUpdateCSV(i, e.target.value, name, 'poaContacted')}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </td>
                <td style={{ fontSize: '16px' }}>
                  <select
                    value={
                      item.incidentReport.toLowerCase() === 'yes'
                        ? 'Yes'
                        : item.incidentReport.toLowerCase() === 'no'
                        ? 'No'
                        : item.incidentReport
                    }
                    onChange={(e) => handleUpdateCSV(i, e.target.value, name, 'incidentReport')}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </td>
                <td className={item.postFallNotes < 3 ? styles.cellRed : ''} style={{ fontSize: '16px' }}>
                  {item.postFallNotes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    </div>
  );
}
