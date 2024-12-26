import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import styles from '../styles/ManagementDashboard.module.css';
import { useNavigate } from 'react-router-dom';
import SummaryCard from './SummaryCard';
import Modal from './Modal';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { ref, onValue, get, set } from 'firebase/database';
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
  const [loginCounts, setLoginCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [residentsNeedingReview, setResidentsNeedingReview] = useState([]);

  const getDataLengths = async () => {
    const homes = ['niagara', 'millCreek', 'wellington', 'iggh'];
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

  const role2home = (role) => {
    const mapping = {
      'iggh-ltc': 'iggh',
      'niagara-ltc': 'niagara',
      'mill-creek-care': 'millCreek',
      'the-wellington-ltc': 'wellington',
    };

    return mapping[role];
  };

  const getLoginCounts = async () => {
    const roles = ['iggh-ltc', 'niagara-ltc', 'mill-creek-care', 'the-wellington-ltc'];
    const loginCounts = {};

    await Promise.all(
      roles.map((role) => {
        return new Promise((resolve) => {
          const userRef = ref(db, `/users`);
          onValue(userRef, (snapshot) => {
            const data = snapshot.val();

            for (const userId in data) {
              if (data[userId].role === role) {
                loginCounts[role2home(role)] = data[userId].loginCount || 0;
                break;
              }
            }
            resolve();
          });
        });
      })
    );

    return loginCounts;
  };

  useEffect(() => {
    const fetchData = async () => {
      const lengths = await getDataLengths();
      setDataLengths(lengths);
      setIsLoading(false);
    };

    fetchData();
  }, [currentMonth]);

  useEffect(() => {
    const fetchData = async () => {
      const counts = await getLoginCounts();
      setLoginCounts(counts);
    };

    fetchData();
  }, [currentMonth]);

  const shortToFull = (home) => {
    switch (home) {
      case 'iggh':
        return 'Ina Grafton LTC';
      case 'millCreek':
        return 'Mill Creek LTC';
      case 'niagara':
        return 'Niagara LTC';
      case 'wellington':
        return 'The Wellington LTC';
      default:
        return home;
    }
  };

  const onClickFalls = (event, elements) => {
    if (!elements.length) return;

    const index = elements[0].index;
    const locationName = fallsChartData.labels[index];
    const fallsData = fallsPopUpData[locationName];
    const totalFalls = summaryData.find(item => item.subtitle === locationName)?.value || 0;

    const { headInjury, fracture, skinTear, significantInjury } = fallsData;
    // Calculate percentage only if there are falls
    const percentage = totalFalls > 0 ? ((significantInjury / totalFalls) * 100).toFixed(1) : '0';
    
    // const content = [
    //   `Total Falls: ${totalFalls}`,
    //   `Falls with Significant Injuries: ${significantInjury} (${percentage}%)`,
    //   '----------------------------------------',
    //   'Breakdown of Significant Injuries:',
    //   '',
    //   `Head Injuries:          ${headInjury}`,
    //   `Fractures:             ${fracture}`,
    //   `Skin Tears:            ${skinTear}`,
    //   '----------------------------------------',
    //   `Total:                 ${significantInjury}`
    // ];

    const content = (
      <div style={{ textAlign: 'left', fontSize: '16px' }}>
        <div style={{ marginLeft: '20px' }}>
          <div style={{ fontSize: '22px', marginBottom: '10px'}}>
            <b style={{fontWeight: 'bold',}}># of Falls with Significant Injuries: {significantInjury} </b> ({percentage}%)
          </div>
          <ul>
          <li style={{ marginBottom: '8px', fontSize: '19px'}}>
            Head Injuries: {headInjury}
          </li>
          <li style={{ marginBottom: '8px', fontSize: '19px' }}>
            Fractures: {fracture}
          </li>
          <li style={{ marginBottom: '8px', fontSize: '19px' }}>
            Skin Tears: {skinTear}
          </li>
          </ul>
          
        </div>
      </div>
    );
    openModal(locationName, content);
  };

  const updateFallsChart = (injuryCounts) => {
    const newData = Object.entries(injuryCounts).map(([home, counts]) => {
      const totalFalls = dataLengths[home];
      const percentage = totalFalls > 0 ? (counts.significantInjury / totalFalls) * 100 : 0;
      
      console.log(`${home} stats:`, {
        totalFalls,
        significantInjuries: counts.significantInjury,
        percentage: percentage.toFixed(1)
      });

      return {
        name: home,
        value: percentage
      };
    });

    newData.sort((a, b) => b.value - a.value);

    setFallsChartData({
      labels: newData.map((item) => shortToFull(item.name)),
      datasets: [
        {
          label: '% of Falls with Significant Injuries',
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
    if (isLoading) return;

    const homes = ['iggh', 'millCreek', 'niagara', 'wellington'];
    const injuryCounts = {
      iggh: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0 },
      millCreek: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0 },
      niagara: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0 },
      wellington: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0 },
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

              // Count individual types
              if (hasHeadInjury) injuryCounts[home].headInjury += 1;
              if (hasFracture) injuryCounts[home].fracture += 1;
              if (hasSkinTear) injuryCounts[home].skinTear += 1;

              // Count total significant injuries
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
  }, [currentMonth, isLoading]);

  const updateHomesChart = (nonComplianceCounts) => {
    const newData = Object.entries(nonComplianceCounts).map(([home, counts]) => {
      const totalFalls = dataLengths[home];
      // Use the totalFallsWithIssues count we tracked
      const percentage = totalFalls > 0 ? (counts.totalFallsWithIssues / totalFalls) * 100 : 0;
      
      return {
        name: home,
        value: percentage
      };
    });

    newData.sort((a, b) => b.value - a.value);

    setHomesChartData({
      labels: newData.map((item) => shortToFull(item.name)),
      datasets: [
        {
          label: '% of Falls with Non-Compliance Issues',
          data: newData.map((item) => item.value),
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

    const content = (
      <div style={{ textAlign: 'left', fontSize: '16px' }}>
        <div style={{ marginLeft: '20px' }}>
          <div style={{ fontSize: '22px', marginBottom: '10px'}}>
            <b style={{fontWeight: 'bold',}}># of Falls with Non-Compliance Issues: {homeData.fallsWithNonCompliance}</b> ({homeData.percentage}%)
          </div>
          <ul>
          <li style={{ marginBottom: '8px', fontSize: '19px'}}>
            # of POAs not Contacted: {homeData.poaNotContacted}
          </li>
          <li style={{ marginBottom: '8px', fontSize: '19px' }}>
            # of No Fall Notes: {homeData.noFallNote}
          </li>
          <li style={{ marginBottom: '8px', fontSize: '19px' }}>
            # of Less than 3 Post-Fall Notes: {homeData.lessThanThreeNotes}
          </li>
          </ul>
          
        </div>
      </div>
    );
    
    openModal(locationName, content);
  };

  useEffect(() => {
    const homes = ['iggh', 'millCreek', 'niagara', 'wellington'];
    let nonComplianceCounts = {
      niagara: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
      millCreek: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
      wellington: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
      iggh: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
    };

    const fetchDataForHome = (home) => {
      const fallsRef = ref(db, `/${home}/2024/${currentMonth}`);
      return new Promise((resolve) => {
        onValue(fallsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            Object.values(data).forEach((fall) => {
              // Increment total falls counter
              nonComplianceCounts[home].totalFalls++;
              
            let poaNotContacted = fall.poaContacted.toLowerCase() !== 'yes';
            let noFallNote = fall.cause === "No Fall Note";
            let lessThanThreeNotes = parseInt(fall.postFallNotes) < 3;

            // Track specific POA non-compliance
            if (fall.poaContacted.toLowerCase() !== 'yes') {
              nonComplianceCounts[home].poaNotContacted++;
            }

            if (fall.cause === "No Fall Note") {
              nonComplianceCounts[home].noFallNote++;
            }

            if (parseInt(fall.postFallNotes) < 3) {
              nonComplianceCounts[home].lessThanThreeNotes++;
            }

              // Check for any non-compliance conditions
              const hasNonCompliance = (
                poaNotContacted ||  // POA not contacted
                noFallNote ||              // No fall note
                lessThanThreeNotes           // Less than 3 post-fall notes
              );

              // If any non-compliance condition is met, increment counter
              if (hasNonCompliance) {
                nonComplianceCounts[home].fallsWithNonCompliance++;
              }
            });
          }
          resolve();
        });
      });
    };

    const fetchAllData = async () => {
      await Promise.all(homes.map(fetchDataForHome));

      // Calculate percentages and update chart
      const chartData = Object.entries(nonComplianceCounts).map(([home, counts]) => {
        const percentage = counts.totalFalls > 0 
          ? (counts.fallsWithNonCompliance / counts.totalFalls) * 100 
          : 0;
        
        return {
          name: home,
          value: percentage,
          fallsWithNonCompliance: counts.fallsWithNonCompliance,
          totalFalls: counts.totalFalls
        };
      });

      // Sort by percentage
      chartData.sort((a, b) => b.value - a.value);

      // Update chart data
      setHomesChartData({
        labels: chartData.map(item => shortToFull(item.name)),
        datasets: [{
          data: chartData.map(item => item.value),
          backgroundColor: 'rgba(76, 175, 80, 0.6)',
          borderColor: 'rgb(76, 175, 80)',
          borderWidth: 1,
          indexAxis: 'x',
        }]
      });

      // Save detailed data for modal popup
      const popupData = {};
      chartData.forEach(item => {
        popupData[shortToFull(item.name)] = {
          fallsWithNonCompliance: item.fallsWithNonCompliance,
          poaNotContacted: nonComplianceCounts[item.name].poaNotContacted,  // Include this count
          noFallNote: nonComplianceCounts[item.name].noFallNote,
          lessThanThreeNotes: nonComplianceCounts[item.name].lessThanThreeNotes,
          totalFalls: item.totalFalls,
          percentage: item.value.toFixed(1)
        };
      });
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
          callback: function(value) {
            return value + '%';
          }
        }
      },
    },
    plugins: {
      tooltip: { 
        enabled: false 
      },
      legend: { 
        display: false
      },
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
        value: dataLengths['niagara'],
        subtitle: 'Niagara LTC',
        fallrate: (dataLengths['niagara'] / 103) * 100,
        loginCount: loginCounts['niagara'],
        linkTo: '/niagara-ltc',
      },
      {
        value: dataLengths['millCreek'],
        subtitle: 'Mill Creek LTC',
        fallrate: (dataLengths['millCreek'] / 160) * 100,
        loginCount: loginCounts['millCreek'],
        linkTo: '/mill-creek-care',
      },
      {
        value: dataLengths['wellington'],
        subtitle: 'The Wellington LTC',
        fallrate: (dataLengths['wellington'] / 78) * 100,
        loginCount: loginCounts['wellington'],
        linkTo: '/the-wellington-ltc',
      },
      {
        value: dataLengths['iggh'],
        subtitle: 'Ina Grafton LTC',
        fallrate: (dataLengths['iggh'] / 128) * 100,
        loginCount: loginCounts['iggh'],
        linkTo: '/iggh-ltc',
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
    const homes = ['niagara', 'millCreek', 'wellington', 'iggh'];
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

  useEffect(() => {
    const homes = ['iggh', 'millCreek', 'wellington', 'niagara'];
    
    homes.forEach(home => {
      // Get falls data
      const fallsRef = ref(db, `/${home}/2024/${currentMonth}`);
      // Get reviews data
      const reviewsRef = ref(db, `/reviews/${home}/2024/${currentMonth}`);
      
      onValue(fallsRef, async (snapshot) => {
        const fallsData = snapshot.val();
        // Get reviews data
        const reviewsSnapshot = await get(reviewsRef);
        const reviewsData = reviewsSnapshot.val() || {};

        if (fallsData) {
          // Count falls per resident
          const fallCounts = {};
          Object.values(fallsData).forEach(fall => {
            // Only count if not reviewed
            if (!reviewsData[fall.name]) {
              fallCounts[fall.name] = (fallCounts[fall.name] || 0) + 1;
            }
          });

          // Check who has 3+ falls without review
          const needReview = Object.entries(fallCounts)
            .filter(([_, count]) => count >= 3)
            .map(([name]) => ({
              name,
              home
            }));

          setResidentsNeedingReview(current => [...current, ...needReview]);
        }
      });
    });
  }, [currentMonth]);

  const markReviewDone = async (resident) => {
    // Simply mark the review as done in the reviews node
    const reviewRef = ref(db, `/reviews/${resident.home}/2024/${currentMonth}/${resident.name}`);
    await set(reviewRef, 'reviewed');
    
    // Remove this resident from the state
    setResidentsNeedingReview(current => 
      current.filter(r => !(r.name === resident.name && r.home === resident.home))
    );
  };

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.h1}>Responsive Management Dashboard</h1>
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
          <h2 style={{ marginLeft: '10px',}} id="fallsHeader">% of Falls With Significant Injury</h2>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            fallsChartData.datasets.length > 0 && 
            <Bar data={fallsChartData} options={createOptions(onClickFalls)} />
          )}
        </div>

        <div className={styles['chart']}>
          <h2 style={{ marginLeft: '10px',}} >% of Falls with Non-Compliance Issues</h2>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            homesChartData.datasets.length > 0 && 
            <Bar data={homesChartData} options={createOptions(onClickHomes)} />
          )}
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
              loginCount={item.loginCount}
            />
          ))}
        </div>
      </div>

      <Modal showModal={showModal} handleClose={closeModal} modalContent={modalContent} title={modalTitle} />
    </div>
  );
}
