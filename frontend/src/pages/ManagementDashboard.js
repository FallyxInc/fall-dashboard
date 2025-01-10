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
  const months = ['10', '11', '12', '01'];
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  const [fallsTimeRange, setFallsTimeRange] = useState('01');
  const [homesTimeRange, setHomesTimeRange] = useState('01');
  const [currentMonth, setCurrentMonth] = useState('01');
  const [desiredYear, setDesiredYear] = useState(2025); // Set to 2025
  const [desiredMonth, setDesiredMonth] = useState(new Date().getMonth() + 1);
  const [availableYearMonth, setAvailableYearMonth] = useState({});

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
  const [loginCounts, setLoginCounts] = useState({
    'iggh': 0,
    'millCreek': 0,
    'niagara': 0,
    'wellington': 0,
    'champlain': 0,
    'lancaster': 0,
    'vmltc': 0,
    'oneill': 0,
    'bonairltc': 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [residentsNeedingReview, setResidentsNeedingReview] = useState([]);

  const getDataLengths = async () => {
    const homes = ['niagara', 'millCreek', 'wellington', 'iggh', 'bonairltc', 'champlain', 'lancaster', 'oneill', 'vmltc'];
    const dataLengths = {};

    await Promise.all(
      homes.map((home) => {
        return new Promise((resolve) => {
        const homeRef = ref(db, `/${home}/${currentMonth === '01' ? 2025 : 2024}/${currentMonth}`);


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
      setIsLoading(false);
    };

    fetchData();
  }, [currentMonth]);

  useEffect(() => {
    if (isLoading) return;

    const usersRef = ref(db, '/users');
    
    onValue(usersRef, (snapshot) => {
      const users = snapshot.val();
      const newCounts = { ...loginCounts };

      console.log('Initial newCounts:', newCounts);  // Debug log

      if (users) {
        Object.values(users).forEach(user => {
          const count = user.loginCount || user.loginCounts || 0;
          if (user.role && count) {
            let role = user.role;
            role = role.replace('-ltc', '');
            
            console.log('Processing role:', role);  // Debug log
            console.log('Available roles:', Object.keys(newCounts));  // Debug log
            
            const matchingRole = Object.keys(newCounts).find(
              key => {
                const matches = key.toLowerCase() === role.toLowerCase();
                console.log(`Comparing ${key} with ${role}: ${matches}`);  // Debug log
                return matches;
              }
            );
            
            if (matchingRole) {
              newCounts[matchingRole] = count;
              console.log(`Updated ${matchingRole} to ${count}`);  // Debug log
            } else {
              console.log(`No match found for role: ${role}`);  // Debug log
            }
          }
        });
      }

      console.log('Final newCounts:', newCounts);  // Debug log
      setLoginCounts(newCounts);
    });
  }, [isLoading]);

  useEffect(() => {
    console.log('State updated - current loginCounts:', loginCounts);
  }, [loginCounts]);

  const shortToFull = (home) => {
    switch (home) {
      case 'iggh':
        return 'Ina Grafton Gage Home';
      case 'millCreek':
        return 'Mill Creek Care Center';
      case 'niagara':
        return 'Niagara LTC';
      case 'wellington':
        return 'The Wellington LTC';
      case 'champlain':
        return 'Champlain LTC';
      case 'lancaster':
        return 'Lancaster LTC';
      case 'vmltc':
        return 'Villa Marconi LTC';
      case 'oneill':
        return 'O\'Neill Center';
      case 'bonairltc':
        return 'Bon Air LTC';
      default:
        return home;
    }
  };

  const onClickFalls = (event, elements) => {
    if (!elements.length) return;

    const index = elements[0].index;
    const locationName = fallsChartData.labels[index];
    const fallsData = fallsPopUpData[locationName];
    
    const { headInjury, fracture, skinTear, significantInjury, percentage } = fallsData;
    
    const content = (
      <div style={{ textAlign: 'left', fontSize: '16px' }}>
        <div style={{ marginLeft: '20px' }}>
          <div style={{ fontSize: '22px', marginBottom: '10px'}}>
            <b style={{fontWeight: 'bold',}}># of Falls with Significant Injuries: {significantInjury} </b> ({percentage}%)
          </div>
          <ul>
            <li style={{ marginBottom: '8px', fontSize: '19px'}}>Head Injuries: {headInjury}</li>
            <li style={{ marginBottom: '8px', fontSize: '19px' }}>Fractures: {fracture}</li>
            <li style={{ marginBottom: '8px', fontSize: '19px' }}>Skin Tears: {skinTear}</li>
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
    const homes = ['niagara', 'millCreek', 'wellington', 'iggh', 'bonairltc', 'champlain', 'lancaster', 'oneill', 'vmltc'];
    let injuryCounts = {
      iggh: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
      millCreek: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
      niagara: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
      wellington: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
      bonairltc: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
      champlain: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
      lancaster: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
      oneill: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
      vmltc: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
    };

    const fetchDataForHome = (home) => {
      const fallsRef = ref(db, `/${home}/${currentMonth === '01' ? 2025 : 2024}/${currentMonth}`);
      return new Promise((resolve) => {
        onValue(fallsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            Object.values(data).forEach((item) => {
              // Increment total falls for this home
              injuryCounts[home].totalFalls++;
              
              // Check for injuries using existing logic
              const injury = item.injuries || item.injury || '';
              
              const headInjuryVariations = ['Head Injury', 'HEAD INJURY', 'head injury', 'Head injury'];
              const fractureVariations = ['Fracture', 'FRACTURE', 'fracture'];
              const skinTearVariations = ['Skin Tear', 'SKIN TEAR', 'skin tear', 'Skin tear'];
              
              const hasHeadInjury = headInjuryVariations.some(variant => injury.includes(variant));
              const hasFracture = fractureVariations.some(variant => injury.includes(variant));
              const hasSkinTear = skinTearVariations.some(variant => injury.includes(variant));

              if (hasHeadInjury) injuryCounts[home].headInjury += 1;
              if (hasFracture) injuryCounts[home].fracture += 1;
              if (hasSkinTear) injuryCounts[home].skinTear += 1;

              if (hasHeadInjury || hasFracture || hasSkinTear) {
                injuryCounts[home].significantInjury += 1;
              }
            });
          }
          resolve();
        });
      });
    };

    const fetchAllData = async () => {
      await Promise.all(homes.map(fetchDataForHome));

      // Calculate percentages and prepare chart data
      const newData = Object.entries(injuryCounts).map(([home, counts]) => {
        const percentage = counts.totalFalls > 0 ? (counts.significantInjury / counts.totalFalls) * 100 : 0;
        return {
          name: home,
          value: percentage
        };
      });

      newData.sort((a, b) => b.value - a.value);

      // Update chart data
      setFallsChartData({
        labels: newData.map((item) => shortToFull(item.name)),
        datasets: [{
          label: '% of Falls with Significant Injuries',
          data: newData.map((item) => item.value),
          backgroundColor: 'rgba(76, 175, 80, 0.6)',
          borderColor: 'rgb(76, 175, 80)',
          borderWidth: 1,
          indexAxis: 'x',
        }]
      });

      // Prepare and set popup data
      const popupData = {};
      Object.entries(injuryCounts).forEach(([home, counts]) => {
        popupData[shortToFull(home)] = {
          headInjury: counts.headInjury,
          fracture: counts.fracture,
          skinTear: counts.skinTear,
          significantInjury: counts.significantInjury,
          totalFalls: counts.totalFalls,
          percentage: (counts.totalFalls > 0 ? (counts.significantInjury / counts.totalFalls) * 100 : 0).toFixed(1)
        };
      });
      setFallsPopUpData(popupData);
    };

    fetchAllData();
  }, [currentMonth]);

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
    const homes = ['niagara', 'millCreek', 'wellington', 'iggh', 'bonairltc', 'champlain', 'lancaster', 'oneill', 'vmltc'];
    let nonComplianceCounts = {
      niagara: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
      millCreek: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
      wellington: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
      iggh: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
      bonairltc: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
      champlain: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
      lancaster: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
      oneill: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
      vmltc: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
    };


    // LOGIC FOR graph of non-compliance!
    const fetchDataForHome = (home) => {
      const fallsRef = ref(db, `/${home}/${currentMonth === '01' ? 2025 : 2024}/${currentMonth}`);
      return new Promise((resolve) => {
        onValue(fallsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            Object.values(data).forEach((fall) => {
              nonComplianceCounts[home].totalFalls++;
              
            const poaVariations = ['Yes', 'YES', 'yes'];
            let poaNotContacted = !poaVariations.some(variant => fall.poaContacted === variant);
            let noFallNote = fall.cause === "No Fall Note";
            let lessThanThreeNotes = parseInt(fall.postFallNotes) < 3;

            // Track specific POA non-compliance
            if (!poaVariations.some(variant => fall.poaContacted === variant)) {
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
        loginCounts: loginCounts['niagara'],
        linkTo: '/niagara',
      },
      {
        value: dataLengths['millCreek'],
        subtitle: 'Mill Creek LTC',
        fallrate: (dataLengths['millCreek'] / 160) * 100,
        loginCounts: loginCounts['millCreek'],
        linkTo: '/millCreek',
      },
      {
        value: dataLengths['wellington'],
        subtitle: 'The Wellington LTC',
        fallrate: (dataLengths['wellington'] / 78) * 100,
        loginCounts: loginCounts['wellington'],
        linkTo: '/wellington',
      },
      {
        value: dataLengths['iggh'],
        subtitle: 'Ina Grafton Gage Home',
        fallrate: (dataLengths['iggh'] / 128) * 100,
        loginCounts: loginCounts['iggh'],
        linkTo: '/iggh',
      },
      {
        value: dataLengths['bonairltc'],
        subtitle: 'Bon Air LTC',
        fallrate: (dataLengths['bonairltc'] / 55) * 100,
        loginCounts: loginCounts['bonairltc'],
        linkTo: '/bonairltc',
      },
      {
        value: dataLengths['champlain'],
        subtitle: 'Champlain LTC',
        fallrate: (dataLengths['champlain'] / 60) * 100,
        loginCounts: loginCounts['champlain'],
        linkTo: '/champlain',
      },
      {
        value: dataLengths['lancaster'],
        subtitle: 'Lancaster LTC',
        fallrate: (dataLengths['lancaster'] / 60) * 100,
        loginCounts: loginCounts['lancaster'],
        linkTo: '/lancaster',
      },
      {
        value: dataLengths['oneill'],
        subtitle: 'O\'Neill LTC',
        fallrate: (dataLengths['oneill'] / 162) * 100,
        loginCounts: loginCounts['oneill'],
        linkTo: '/oneill',
      },
      {
        value: dataLengths['vmltc'], 
        subtitle: 'Villa Marconi LTC',
        fallrate: (dataLengths['vmltc'] / 128) * 100,
        loginCounts: loginCounts['vmltc'],
        linkTo: '/vmltc',
      },
    ];

    updatedSummaryData.sort((a, b) => b.fallrate - a.fallrate);
    setSummaryData(updatedSummaryData);

    // Add debug log
    console.log('Updated Summary Data with login counts:', {
      loginCounts,
      updatedSummaryData
    });
  }, [dataLengths, loginCounts]);

  const logout = () => {
    navigate('/login');
  };

  const getMonthName = (month, year) => {
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
    const monthIndex = parseInt(month, 10) - 1;
    return `${monthNames[monthIndex]} ${month === '01' ? year + 1 : year}`;
  };
  

  const downloadCSV = async () => {
    const homes = ['niagara', 'millCreek', 'wellington', 'iggh', 'bonairltc', 'champlain', 'lancaster', 'oneill', 'vmltc'];
    const fallsData = [];

    await Promise.all(
      months.map((month) => {
        // Initialize counts object for this month using same structure as graphs
        let injuryCounts = {
          iggh: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
          millCreek: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
          niagara: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
          wellington: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
          bonairltc: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
          champlain: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
          lancaster: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
          oneill: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
          vmltc: { headInjury: 0, fracture: 0, skinTear: 0, significantInjury: 0, totalFalls: 0 },
        };

        let nonComplianceCounts = {
          niagara: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
          millCreek: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
          wellington: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
          iggh: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
          bonairltc: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
          champlain: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
          lancaster: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
          oneill: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
          vmltc: { fallsWithNonCompliance: 0, totalFalls: 0, poaNotContacted: 0, noFallNote: 0, lessThanThreeNotes: 0},
        };

        return Promise.all(
          homes.map((home) => {
            return new Promise((resolve) => {
              const fallsRef = ref(db, `/${home}/${month === '01' ? 2025 : 2024}/${month}`);
              onValue(fallsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                  Object.values(data).forEach((item) => {
                    // Increment total falls for both counts
                    injuryCounts[home].totalFalls++;
                    nonComplianceCounts[home].totalFalls++;

                    // Significant Injury Logic (same as graph)
                    const injury = item.injuries || item.injury || '';
                    const headInjuryVariations = ['Head Injury', 'HEAD INJURY', 'head injury', 'Head injury'];
                    const fractureVariations = ['Fracture', 'FRACTURE', 'fracture'];
                    const skinTearVariations = ['Skin Tear', 'SKIN TEAR', 'skin tear', 'Skin tear'];
                    
                    const hasHeadInjury = headInjuryVariations.some(variant => injury.includes(variant));
                    const hasFracture = fractureVariations.some(variant => injury.includes(variant));
                    const hasSkinTear = skinTearVariations.some(variant => injury.includes(variant));

                    if (hasHeadInjury) injuryCounts[home].headInjury += 1;
                    if (hasFracture) injuryCounts[home].fracture += 1;
                    if (hasSkinTear) injuryCounts[home].skinTear += 1;
                    if (hasHeadInjury || hasFracture || hasSkinTear) {
                      injuryCounts[home].significantInjury += 1;
                    }

                    // Non-Compliance Logic (same as graph)
                    const poaVariations = ['Yes', 'YES', 'yes'];
                    const poaNotContacted = !poaVariations.some(variant => item.poaContacted === variant);
                    const noFallNote = item.cause === "No Fall Note";
                    const lessThanThreeNotes = parseInt(item.postFallNotes) < 3;

                    if (poaNotContacted) nonComplianceCounts[home].poaNotContacted++;
                    if (noFallNote) nonComplianceCounts[home].noFallNote++;
                    if (lessThanThreeNotes) nonComplianceCounts[home].lessThanThreeNotes++;
                    if (poaNotContacted || noFallNote || lessThanThreeNotes) {
                      nonComplianceCounts[home].fallsWithNonCompliance++;
                    }
                  });
                }

                // Add data for this home/month to fallsData
                fallsData.push({
                  Community: shortToFull(home),
                  MonthYear: getMonthName(month, 2024),
                  Falls: injuryCounts[home].totalFalls,
                  Incidents: nonComplianceCounts[home].fallsWithNonCompliance,
                  SignificantInjury: injuryCounts[home].significantInjury
                });

                resolve();
              });
            });
          })
        );
      })
    );

    // Sort data by date
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
    const homes = ['iggh', 'millCreek', 'wellington', 'niagara', 'bonairltc', 'champlain', 'lancaster', 'oneill', 'vmltc'];
    
    homes.forEach(home => {
      // Get falls data
      const fallsRef = ref(db, `/${home}/${currentMonth === '01' ? 2025 : 2024}/${currentMonth}`); // MAIN ONE
      // Get reviews data
      const reviewsRef = ref(db, `/${home}/${currentMonth === '01' ? 2025 : 2024}/${currentMonth}`);
      
      
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
        <option value="10">October - 2024</option>
        <option value="11">November - 2024</option>
        <option value="12">December - 2024</option>
        <option value="01">January - 2025</option>
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
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            summaryData.map((item, index) => (
              <SummaryCard
                key={index}
                value={item.value}
                subtitle={item.subtitle}
                linkTo={item.linkTo}
                fallrate={item.fallrate}
                loginCounts={item.loginCounts}
              />
            ))
          )}
        </div>
      </div>

      <Modal showModal={showModal} handleClose={closeModal} modalContent={modalContent} title={modalTitle} />
    </div>
  );
}
