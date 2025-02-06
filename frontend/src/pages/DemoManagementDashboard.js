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
  const [isLoading, setIsLoading] = useState(true);
  const [incidentType, setIncidentType] = useState('Falls');

  const [fallsChartData, setFallsChartData] = useState({
    labels: [],
    datasets: [],
  });

  const [fallsPopUpData, setFallsPopUpData] = useState([]);
  const [dataLengths, setDataLengths] = useState({});

  // Add this mock data near the top of the component
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

  const getDataLengths = async () => {
    setIsLoading(true);
    
    if (incidentType !== 'Falls') {
      // Use mock data for other incident types
      const mockData = MOCK_INCIDENT_DATA[incidentType];
      setIsLoading(false);
      setDataLengths(mockData);
      return mockData;
    }

    const homes = ['home1', 'home2', 'home3', 'home4', 'vmltc', 'oneill', 'lancaster', 'goderich'];
    const dataLengths = {};

    try {
      await Promise.all(
        homes.map((home) => {
          return new Promise((resolve) => {
            const year = home === 'goderich' ? '2025' : '2024';
            const month = home === 'goderich' ? '01' : currentMonth;
            const homeRef = ref(db, `/${home}/${year}/${month}`);
            
            onValue(homeRef, (snapshot) => {
              const data = snapshot.val();
              if (data) {
                if (home === 'goderich') {
                  const rowCount = Object.keys(data).filter(key => key.startsWith('row-')).length;
                  dataLengths[home] = rowCount;
                } else {
                  dataLengths[home] = Object.keys(data).length;
                }
              } else {
                dataLengths[home] = 0;
              }
              resolve();
            }, {
              onlyOnce: true
            });
          });
        })
      );

      setDataLengths(dataLengths);
      return dataLengths;
    } catch (error) {
      console.error('Error fetching data:', error);
      return {};
    } finally {
      setIsLoading(false);
    }
  };

  // Modify the useEffect that updates the chart
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const lengths = await getDataLengths();
      
      if (Object.keys(lengths).length > 0) {
        setDataLengths(lengths);
        
        // Update chart data
        const newData = Object.entries(lengths).map(([home, count]) => ({
          name: home,
          value: count
        }));

        newData.sort((a, b) => b.value - a.value);

        setFallsChartData({
          labels: newData.map((item) => shortToFull(item.name)),
          datasets: [
            {
              label: `Total ${incidentType}`,
              data: newData.map((item) => item.value),
              backgroundColor: 'rgba(76, 175, 80, 0.6)',
              borderColor: 'rgb(76, 175, 80)',
              borderWidth: 1,
              indexAxis: 'x',
            },
          ],
        });

        // Update summary cards data without fall rate for non-Falls incidents
        const updatedSummaryData = [
          {
            value: lengths['home1'],
            subtitle: 'Wynford',
            linkTo: '/home1',
            // Only include fallrate for Falls incident type
            ...(incidentType === 'Falls' && {
              fallrate: (lengths['home1'] / HOME_POPULATIONS['home1']) * 100
            })
          },
          {
            value: lengths['home2'],
            subtitle: 'Burlington',
            linkTo: '/home2',
            ...(incidentType === 'Falls' && {
              fallrate: (lengths['home2'] / HOME_POPULATIONS['home2']) * 100
            })
          },
          {
            value: lengths['home3'],
            subtitle: 'Unionville',
            linkTo: '/home3',
            ...(incidentType === 'Falls' && {
              fallrate: (lengths['home3'] / HOME_POPULATIONS['home3']) * 100
            })
          },
          {
            value: lengths['home4'],
            subtitle: 'Watford',
            linkTo: '/home4',
            ...(incidentType === 'Falls' && {
              fallrate: (lengths['home4'] / HOME_POPULATIONS['home4']) * 100
            })
          },
          {
            value: lengths['vmltc'],
            subtitle: 'Victoria Manor',
            linkTo: '/vmltc',
            ...(incidentType === 'Falls' && {
              fallrate: (lengths['vmltc'] / HOME_POPULATIONS['vmltc']) * 100
            })
          },
          {
            value: lengths['oneill'],
            subtitle: "O'James Centre",
            linkTo: '/oneill',
            ...(incidentType === 'Falls' && {
              fallrate: (lengths['oneill'] / HOME_POPULATIONS['oneill']) * 100
            })
          },
          {
            value: lengths['lancaster'],
            subtitle: 'Lancasie Living',
            linkTo: '/lancaster',
            ...(incidentType === 'Falls' && {
              fallrate: (lengths['lancaster'] / HOME_POPULATIONS['lancaster']) * 100
            })
          },
          {
            value: lengths['goderich'],
            subtitle: 'Goderich Place',
            linkTo: '/goderich',
            ...(incidentType === 'Falls' && {
              fallrate: (lengths['goderich'] / HOME_POPULATIONS['goderich']) * 100
            })
          }
        ];

        // Only sort by fallrate if we're showing Falls
        if (incidentType === 'Falls') {
          updatedSummaryData.sort((a, b) => b.fallrate - a.fallrate);
        } else {
          updatedSummaryData.sort((a, b) => b.value - a.value);
        }
        
        setSummaryData(updatedSummaryData);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [currentMonth, incidentType]);

  const shortToFull = (home) => {
    switch (home) {
      case 'home1':
        return 'Wynford';
      case 'home2':
        return 'Burlington';
      case 'home3':
        return 'Unionville';
      case 'home4':
        return 'Watford';
      case 'vmltc':
        return 'Victoria Manor';
      case 'oneill':
        return "O'James Centre";
      case 'lancaster':
        return 'Lancasie Living';
      case 'goderich':
        return 'Goderich Place';
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

  const updateFallsChart = () => {
    console.log('Updating chart with dataLengths:', dataLengths); // Debug log
    
    // Make sure we have data to work with
    if (!dataLengths || Object.keys(dataLengths).length === 0) {
      console.log('No data lengths available');
      return;
    }

    const newData = Object.entries(dataLengths).map(([home, count]) => {
      console.log(`Processing ${home}: ${count} falls`); // Debug each entry
      return {
        name: home,
        value: count
      };
    });

    newData.sort((a, b) => b.value - a.value);
    console.log('Processed chart data:', newData);

    // Update the chart data state
    setFallsChartData({
      labels: newData.map((item) => shortToFull(item.name)),
      datasets: [
        {
          label: `Total ${incidentType}`,  // Update label to reflect incident type
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
    const homes = ['home1', 'home2', 'home3', 'home4', 'vmltc', 'oneill', 'lancaster', 'goderich'];

    const injuryCounts = {
      home1: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0 },
      home2: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0 },
      home3: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0 },
      home4: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0 },
      vmltc: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0 },
      oneill: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0 },
      lancaster: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0 },
      goderich: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0 }
    };

    const fetchDataForHome = async (home) => {
      const fallsRef = ref(db, `/${home}/2024/${currentMonth}`);
      return new Promise((resolve) => {
        onValue(fallsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            Object.values(data).forEach((item) => {
              const injury = item.injury || ''; // Add default empty string
              const hasHeadInjury = injury.includes('head injury') || injury.includes('Head Injury');
              const hasFracture = injury.includes('fracture') || injury.includes('Fracture');
              const hasSkinTear = injury.includes('skin tear') || injury.includes('Skin Tear');

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
      updateFallsChart();
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
    maintainAspectRatio: true,
    aspectRatio: 4.5,
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

  // Add population constants if not already present
  const HOME_POPULATIONS = {
    'home1': 110,  // Need this number
    'home2': 125,  // Need this number
    'home3': 111,  // Need this number
    'home4': 95,   // Need this number
    'vmltc': 175,  // Need this number
    'oneill': 110, // Need this number
    'lancaster': 50, // Need this number
    'goderich': 100  // Need this number
  };

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
        <h1 className={styles.h1}>Delmanor Fall's Dashboard</h1>
        <div className={styles['button-container']}>
          <button className={styles['download-button']} onClick={downloadCSV}>
            Download CSV
          </button>
          <button className={styles['logout-button']} onClick={logout}>
            Log Out
          </button>
        </div>
      </header>
      <div className={styles['chart-container']}>
        <div className={styles['chart']}>
          <h2>Total Incidents by Home</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
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

            <select 
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              style={{
                fontSize: '16px',
                padding: '10px',
                height: '40px',
              }}
            >
              <option value="Falls">Falls</option>
              <option value="Abuse/Neglect/Personal Expression of Needs">Abuse/Neglect/Personal Expression of Needs</option>
              <option value="Death">Death</option>
              <option value="Injury">Injury</option>
              <option value="Elopement">Elopement</option>
              <option value="Fire">Fire</option>
            </select>
          </div>
          {isLoading ? (
            <div>Loading data...</div>
          ) : (
            fallsChartData.datasets.length > 0 && 
            <Bar data={fallsChartData} options={createOptions(onClickFalls)} />
          )}
        </div>
      </div>

      <div className={styles['summary-container']}>
        <h2>Data Summary</h2>
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
