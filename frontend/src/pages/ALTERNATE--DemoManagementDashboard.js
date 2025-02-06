import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import styles from '../styles/ManagementDashboard.module.css';
import { useNavigate } from 'react-router-dom';
import SummaryCard from './SummaryCard';
import Modal from './Modal';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { saveAs } from 'file-saver';
Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ManagementDashboard() {
  const navigate = useNavigate();
  const months = ['10', '11', '12'];
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  const [fallsTimeRange, setFallsTimeRange] = useState('12');
  const [homesTimeRange, setHomesTimeRange] = useState('12');
  const [currentMonth, setCurrentMonth] = useState('12');

  const [fallsChartData, setFallsChartData] = useState({
    labels: [],
    datasets: [],
  });

  const [homesChartData, setHomesChartData] = useState({
    labels: [],
    datasets: [],
  });

  const [fallsPopUpData, setFallsPopUpData] = useState([]);
  const [homesPopUpData, setHomesPopUpData] = useState([]);
  // console.log('hello');
  // console.log('homesPopUpData');
  // console.log(homesPopUpData);
  const [dataLengths, setDataLengths] = useState({});

  const getDataLengths = async () => {
    const homes = ['home1', 'home2', 'home3', 'home4'];
    const dataLengths = {};

    await Promise.all(
      homes.map((home) => {
        return new Promise((resolve) => {
          const homeRef = ref(db, `/${home}/2024/${currentMonth}`); // Reference to the home in Firebase

          onValue(homeRef, (snapshot) => {
            const data = snapshot.val();
            // Count the number of items (rows) under each home
            dataLengths[home] = data ? Object.keys(data).length : 0;
            resolve();
          });
        });
      })
    );

    return dataLengths; // { niagara: X, millCreek: Y, wellington: Z, iggh: W }
  };

  useEffect(() => {
    const fetchData = async () => {
      const lengths = await getDataLengths();
      setDataLengths(lengths);
    };

    fetchData();
  }, [currentMonth]);

  const shortToFull = (home) => {
    switch (home) {
      case 'home1':
        return 'Home 1';
      case 'home2':
        return 'Home 2';
      case 'home3':
        return 'Home 3';
      case 'home4':
        return 'Home 4';
      default:
        return home;
    }
  };

  const onClickFalls = (event, elements) => {
    if (!elements.length) return;

    const index = elements[0].index;
    const locationName = fallsChartData.labels[index];

    const fallsData = fallsPopUpData[locationName];

    const { headInjury, fracture, skinTear } = fallsData;
    const content = [
      <div style={{ textAlign: 'left', fontSize: '16px' }}>
      <div style={{ marginLeft: '20px' }}>
        <div style={{ fontSize: '22px', marginBottom: '10px'}}>
        <b style={{fontWeight: 'bold',}}># of Falls with Significant Injuries </b>
        </div>
        <ul>
          <li style={{ marginBottom: '8px', fontSize: '19px'}}>Head Injuries: {headInjury}</li>
          <li style={{ marginBottom: '8px', fontSize: '19px' }}>Fractures: {fracture}</li>
          <li style={{ marginBottom: '8px', fontSize: '19px' }}>Skin Tears: {skinTear}</li>
        </ul>
      </div>
    </div>
    ];
    openModal(locationName, content);
  };

  const updateFallsChart = (injuryCounts) => {
    const newData = Object.entries(injuryCounts).map(([home, counts]) => ({
      name: home,
      value: counts.significantInjury,
    }));

    newData.sort((a, b) => b.value - a.value);

    setFallsChartData({
      labels: newData.map((item) => shortToFull(item.name)),
      datasets: [
        {
          label: 'Total Significant Injuries',
          data: newData.map((item) => item.value),
          backgroundColor: 'rgba(76, 175, 80, 0.6)',
          borderColor: 'rgb(76, 175, 80)',
          borderWidth: 1,
          indexAxis: 'x',
        },
      ],
    });
  };

  useEffect(() => {
    const homes = ['home1', 'home2', 'home3', 'home4'];

    const injuryCounts = {
      home1: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0 },
      home2: {
        headInjury: 0,
        fracture: 0,
        skinTear: 0,
        significantInjury: 0,
      },
      home3: {
        headInjury: 0,
        fracture: 0,
        skinTear: 0,
        significantInjury: 0,
      },
      home4: {
        headInjury: 0,
        fracture: 0,
        skinTear: 0,
        significantInjury: 0,
      },
    };

    const fetchDataForHome = async (home) => {
      const fallsRef = ref(db, `/${home}/2024/${currentMonth}`);
      return new Promise((resolve) => {
        onValue(fallsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            Object.values(data).forEach((item) => {
              const lowerCaseInjury = item.injury.toLowerCase();
              const hasHeadInjury = lowerCaseInjury.includes('head injury');
              const hasFracture = lowerCaseInjury.includes('fracture');
              const hasSkinTear = lowerCaseInjury.includes('skin tear');

              if (hasHeadInjury) injuryCounts[home].headInjury += 1;
              if (hasFracture) injuryCounts[home].fracture += 1;
              if (hasSkinTear) injuryCounts[home].skinTear += 1;

              if (hasHeadInjury || hasFracture || hasSkinTear) {
                injuryCounts[home].significantInjury += 1;
              }
            });
            resolve();
          } else {
            console.warn(`No data found in Firebase for ${home}`);
            resolve();
          }
        });
      });
    };

    const fetchAllData = async () => {
      const allDataPromises = homes.map(fetchDataForHome);
      await Promise.all(allDataPromises);

      const popupData = {};
      for (const key in injuryCounts) {
        const newKey = shortToFull(key);
        popupData[newKey] = injuryCounts[key];
      }

      setFallsPopUpData(popupData);
      updateFallsChart(injuryCounts);
    };

    fetchAllData();
  }, [currentMonth]);

  const updateHomesChart = (nonComplianceCounts) => {
    const newData = Object.entries(nonComplianceCounts).map(([home, counts]) => ({
      name: home,
      totalNonCompliance: counts.poaNotNotified + counts.unwrittenNotes,
    }));

    newData.sort((a, b) => b.totalNonCompliance - a.totalNonCompliance);

    setHomesChartData({
      labels: newData.map((item) => shortToFull(item.name)),
      datasets: [
        {
          label: 'Total Non-Compliance',
          data: newData.map((item) => item.totalNonCompliance),
          backgroundColor: 'rgba(76, 175, 80, 0.6)',
          borderColor: 'rgb(76, 175, 80)',
          borderWidth: 1,
          indexAxis: 'x',
        },
      ],
    });
  };

  const onClickHomes = (event, elements) => {
    if (!elements.length) return;

    const index = elements[0].index;
    const locationName = homesChartData.labels[index];
    const homeData = homesPopUpData[locationName];

    const content = [
      <div style={{ textAlign: 'left', fontSize: '16px' }}>
        <div style={{ marginLeft: '20px' }}>
          <div style={{ fontSize: '22px', marginBottom: '10px'}}>
            <b style={{fontWeight: 'bold',}}>Incidents of Non-Compliance</b>
          </div>
          <ul>
            <li style={{ marginBottom: '8px', fontSize: '19px'}}>POAs Not Notified: {homeData.poaNotNotified}</li>
            <li style={{ marginBottom: '8px', fontSize: '19px' }}>Unwritten Post-Fall Notes: {homeData.unwrittenNotes}</li>
          </ul>
        </div>
      </div>
    ];
    
    openModal(locationName, content);
  };

  useEffect(() => {
    const homes = ['home1', 'home2', 'home3', 'home4'];
    let nonComplianceCounts = {
      home1: { poaNotNotified: 0, unwrittenNotes: 0 },
      home2: { poaNotNotified: 0, unwrittenNotes: 0 },
      home3: { poaNotNotified: 0, unwrittenNotes: 0 },
      home4: { poaNotNotified: 0, unwrittenNotes: 0 },
    };

    const fetchDataForHome = (home) => {
      const fallsRef = ref(db, `/${home}/2024/${currentMonth}`);
      return new Promise((resolve) => {
        onValue(fallsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            Object.values(data).forEach((item) => {
              const fallDate = new Date(item.date);
              const currentDate = new Date();
              const daysDifference = Math.abs(currentDate - fallDate) / (1000 * 60 * 60 * 24);

              // Count POAs not contacted
              if (item.poaContacted.toLowerCase() !== 'yes') {
                nonComplianceCounts[home].poaNotNotified += 1;
              }

              // Count unwritten post-fall notes (if more than 3 days after the fall and postFallNotes < 3)
              if (daysDifference > 3 && parseInt(item.postFallNotes) < 3) {
                nonComplianceCounts[home].unwrittenNotes += 1;
              }
            });
          } else {
            console.warn(`No data found in Firebase for ${home}`);
          }
          resolve();
        });
      });
    };

    const fetchAllData = async () => {
      const allDataPromises = homes.map(fetchDataForHome);
      await Promise.all(allDataPromises);

      updateHomesChart(nonComplianceCounts);
      const popupData = {};
      for (const key in nonComplianceCounts) {
        const newKey = shortToFull(key);
        popupData[newKey] = nonComplianceCounts[key];
      }
      setHomesPopUpData(popupData);
    };

    fetchAllData();
  }, [currentMonth]);

  const openModal = (title, content) => {
    setModalTitle(title);
    setModalContent(content);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const baseOptions = {
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
      legend: { display: true },
    },
    animations: {
      duration: 0,
    },
  };

  const createOptions = (onClickHandler) => ({
    ...baseOptions,
    onClick: onClickHandler,
  });

  const [summaryData, setSummaryData] = useState([]);

  useEffect(() => {
    const updatedSummaryData = [
      {
        value: dataLengths['home1'],
        subtitle: 'Home 1',
        fallrate: (dataLengths['home1'] / 100) * 100, // Sample calculation
        linkTo: '/home1',
      },
      {
        value: dataLengths['home2'],
        subtitle: 'Home 2',
        fallrate: (dataLengths['home2'] / 150) * 100,
        linkTo: '/home2',
      },
      {
        value: dataLengths['home3'],
        subtitle: 'Home 3',
        fallrate: (dataLengths['home3'] / 50) * 100,
        linkTo: '/home3',
      },
      {
        value: dataLengths['home4'],
        subtitle: 'Home 4',
        fallrate: (dataLengths['home4'] / 75) * 100,
        linkTo: '/home4',
      },
    ];

    updatedSummaryData.sort((a, b) => b.fallrate - a.fallrate);

    setSummaryData(updatedSummaryData);
  }, [dataLengths]);

  const logout = () => {
    navigate('/login');
  };

  const getMonthName = (month) => {
    const monthNames = [
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
    return monthNames[month - 1]; // Subtract 1 because array is 0-indexed
  };

  const downloadCSV = async () => {
    const homes = ['home1', 'home2', 'home3', 'home4'];
    const fallsData = [];

    await Promise.all(
      months.map((month) =>
        Promise.all(
          homes.map((home) => {
            return new Promise((resolve) => {
              const fallsRef = ref(db, `/${home}/2024/${month}`);
              onValue(fallsRef, (snapshot) => {
                const data = snapshot.val();
                const homeName = shortToFull(home);
                const monthYear = `${getMonthName(month)} 2024`; // Format month as two digits
                const fallsCount = data ? Object.keys(data).length : 0;
                let poaNotNotified = 0;
                let unwrittenNotes = 0;
                let significantInjury = 0;

                if (data) {
                  Object.values(data).forEach((item) => {
                    const fallDate = new Date(item.date);
                    const currentDate = new Date();
                    const daysDifference = Math.abs(currentDate - fallDate) / (1000 * 60 * 60 * 24);

                    // Non-compliance calculations
                    if (item.poaContacted.toLowerCase() !== 'yes') {
                      poaNotNotified += 1;
                    }
                    if (daysDifference > 3 && parseInt(item.postFallNotes) < 3) {
                      unwrittenNotes += 1;
                    }

                    // Significant injury calculations
                    const hasHeadInjury = item.injury.toLowerCase().includes('head injury');
                    const hasFracture = item.injury.toLowerCase().includes('fracture');
                    const hasSkinTear = item.injury.toLowerCase().includes('skin tear');

                    if (hasHeadInjury || hasFracture || hasSkinTear) {
                      significantInjury += 1;
                    }
                  });
                }

                // Append data for each home and month to fallsData
                fallsData.push({
                  Community: homeName,
                  MonthYear: monthYear,
                  Falls: fallsCount,
                  Incidents: poaNotNotified + unwrittenNotes,
                  SignificantInjury: significantInjury,
                });

                resolve();
              });
            });
          })
        )
      )
    );

    fallsData.sort((a, b) => {
      const dateA = new Date(a.MonthYear);
      const dateB = new Date(b.MonthYear);
      return dateB - dateA;
    });

    // Generate CSV content
    const headers = 'Community,Month/Year,Falls,Incidents of non-compliance,Falls w/ significant injury\n';
    const rows = fallsData
      .map((row) => `${row.Community},${row.MonthYear},${row.Falls},${row.Incidents},${row.SignificantInjury}`)
      .join('\n');
    const csvContent = headers + rows;

    // Save CSV using file-saver
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'falls_data_all_months.csv');
  };

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.h1}>United Active Living Dashboard</h1>
        <div className={styles['button-container']}>
          <button className={styles['download-button']} onClick={downloadCSV}>
            Download CSV
          </button>
          <button className={styles['logout-button']} onClick={logout}>
            Log Out
          </button>
        </div>
      </header>
      <select
        value={currentMonth}
        onChange={(e) => {
          setCurrentMonth(e.target.value);
        }}
        style={{
          fontSize: '16px',
          padding: '10px',
          height: '40px',
        }}
      >
        <option value="10">October</option>
        <option value="11">November</option>
        <option value="12">December</option>
      </select>
      <div className={styles['chart-container']}>
        <div className={styles['chart']}>
          <h2 id="fallsHeader">Falls with significant injury</h2>
          {/* <select
            id="fallsTimeRange"
            value={fallsTimeRange}
            className={styles.select}
            onChange={(e) => {
              setFallsTimeRange(e.target.value);
            }}
          >
            <option value="12">Current Month</option>
            <option value="11">November 2024</option>
          </select> */}
          {fallsChartData.datasets.length > 0 && <Bar data={fallsChartData} options={createOptions(onClickFalls)} />}
        </div>

        <div className={styles['chart']}>
          <h2 id="homesHeader">Number of incidents of non-compliance</h2>
          {/* <select
            id="homesTimeRange"
            value={homesTimeRange}
            onChange={(e) => {
              setHomesTimeRange(e.target.value);
            }}
          >
            <option value="12">Current Month</option>
            <option value="11">November 2024</option>
          </select> */}
          {homesChartData.datasets.length > 0 && <Bar data={homesChartData} options={createOptions(onClickHomes)} />}
        </div>
      </div>

      <div className={styles['summary-container']}>
        <h2>Fall Summary</h2>
        <div className={styles['summary-cards']}>
          {summaryData.map((item, index) => (
            <SummaryCard
              key={index}
              value={item.value}
              subtitle={item.subtitle}
              linkTo={item.linkTo}
              fallrate={item.fallrate}
            />
          ))}
        </div>
      </div>

      <Modal showModal={showModal} handleClose={closeModal} modalContent={modalContent} title={modalTitle} />
    </div>
  );
}
