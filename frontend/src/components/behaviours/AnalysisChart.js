import React, { useEffect, useState } from 'react';
import styles from '../../styles/Dashboard.module.css';
import { Bar } from 'react-chartjs-2';

const AnalysisChart = ({data, desiredYear, desiredMonth, threeMonthData}) => {
    
    const [analysisChartData, setAnalysisChartData] = useState({
        labels: [],
        datasets: [],
    });
    const [analysisType, setAnalysisType] = useState('timeOfDay');
    const [analysisTimeRange, setAnalysisTimeRange] = useState('current');
    const [analysisUnit, setAnalysisUnit] = useState('allUnits');
    const [analysisHeaderText, setAnalysisHeaderText] = useState('Behaviours by Time of Day');

    // Logic
    useEffect(() => {
        updateAnalysisChart();
    // console.log('Analysis Chart');
    }, [analysisType, analysisTimeRange, analysisUnit, data, desiredYear]);


    function countTotalBehaviours() {
        return data.length;
    }

    const countBehavioursByType = (data) => {
        const counts = {};
        data.forEach(item => {
        const type = item.incident_type;
        if (type) {
            counts[type] = (counts[type] || 0) + 1;
        }
        });
        return counts;
    };

    const countBehavioursByUnit = (data) => {
        const counts = {};
        data.forEach(item => {
        const unit = item.room;
        if (unit) {
            counts[unit] = (counts[unit] || 0) + 1;
        }
        });
        return counts;
    };

    const countBehavioursByHour = (data) => {
        const counts = Array(24).fill(0);
        data.forEach(item => {
        const hour = new Date(item.date + ' ' + item.time).getHours();
        counts[hour]++;
        });
        return counts;
    };

    const countBehavioursByAffected = (data) => {
        const counts = {};
        data.forEach(item => {
        const affected = item.affected;
        if (affected) {
            counts[affected] = (counts[affected] || 0) + 1;
        }
        });
        return counts;
    };


  const countBehavioursByTimeOfDay = (data) => {
    const counts = {
      Morning: 0,
      Evening: 0,
      Night: 0
    };

    data.forEach(item => {
      const hour = new Date(item.date + ' ' + item.time).getHours();
      if (hour >= 6 && hour < 14) {
        counts.Morning++;
      } else if (hour >= 14 && hour < 22) {
        counts.Evening++;
      } else {
        counts.Night++;
      }
    });

    return counts;
  };

  const countResidentsByTimeOfDay = (data) => {
    const counts = {
      Morning: [],
      Evening: [],
      Night: []
    };

    data.forEach(item => {
      const hour = new Date(item.date + ' ' + item.time).getHours();
      if (hour >= 6 && hour < 14) {
        counts.Morning.push(item.name);
      } else if (hour >= 14 && hour < 22) {
        counts.Evening.push(item.name);
      } else {
        counts.Night.push(item.name);
      }
    });

    return counts;
  };

  const countBehavioursByLocation = (data) => {
    const counts = {};
    data.forEach(item => {
      const location = item.location || item.incident_location;
      if (location) {
        counts[location] = (counts[location] || 0) + 1;
      }
    });
    return counts;
  };

  const countBehavioursByInjury = (data) => {
    const counts = {};
    data.forEach(item => {
      const injury = item.injuries;
      if (injury) {
        counts[injury] = (counts[injury] || 0) + 1;
      }
    });
    return counts;
  };

  const countResidentsWithRecurringBehaviours = (data) => {
    const counts = {};
    data.forEach(item => {
      if (item.name) {
        counts[item.name] = (counts[item.name] || 0) + 1;
      }
    });
    return counts;
  };

    const [residentsByTimeOfDay, setResidentsByTimeOfDay] = useState({});
    const updateAnalysisChart = () => {
        var filteredData = analysisTimeRange === '3months' ? Array.from(threeMonthData.values()).flat() : data;

        let newLabels = [];
        let newData = [];

        switch (analysisType) {
        case 'timeOfDay':
            setAnalysisHeaderText('Behaviours by Time of Day');
            newLabels = ['Morning', 'Evening', 'Night'];
            var timeOfDayCounts = countBehavioursByTimeOfDay(filteredData);
            setResidentsByTimeOfDay(countResidentsByTimeOfDay(filteredData));
            newData = [timeOfDayCounts.Morning, timeOfDayCounts.Evening, timeOfDayCounts.Night];
            break;

        case 'injuries':
            setAnalysisHeaderText('Behaviours by Injury');
            var injuryCounts = countBehavioursByInjury(filteredData);
            // Sort by count in descending order
            const sortedInjuries = Object.entries(injuryCounts)
            .sort(([,a], [,b]) => b - a);
            newLabels = sortedInjuries.map(([label]) => label);
            newData = sortedInjuries.map(([,count]) => count);
            break;

        case 'behaviourType':
            setAnalysisHeaderText('Behaviours by Type');
            var typeCounts = countBehavioursByType(filteredData);
            // Sort by count in descending order
            const sortedTypes = Object.entries(typeCounts)
            .sort(([,a], [,b]) => b - a);
            newLabels = sortedTypes.map(([label]) => label);
            newData = sortedTypes.map(([,count]) => count);
            break;

        case 'residents':
            setAnalysisHeaderText('Behaviours by Resident Name');
            var residentCounts = countResidentsWithRecurringBehaviours(filteredData);
            // Sort by count in descending order
            const sortedResidents = Object.entries(residentCounts)
            .sort(([,a], [,b]) => b - a);
            newLabels = sortedResidents.map(([label]) => label);
            newData = sortedResidents.map(([,count]) => count);
            break;

        case 'unit':
            setAnalysisHeaderText('Behaviours by Unit');
            var unitCounts = countBehavioursByUnit(filteredData);
            // Sort by count in descending order
            const sortedUnits = Object.entries(unitCounts)
            .sort(([,a], [,b]) => b - a);
            newLabels = sortedUnits.map(([label]) => label);
            newData = sortedUnits.map(([,count]) => count);
            break;

        case 'hour':
            setAnalysisHeaderText('Behaviours by Hour');
            newLabels = Array.from({length: 24}, (_, i) => `${i}:00`);
            newData = countBehavioursByHour(filteredData);
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
            tooltip: { 
            enabled: true,
            callbacks: {
                label: function(context) {
                    return residentsByTimeOfDay[context.label].map(name => `• ${name}`).join('\n');
                }
            }
            },
            legend: { display: false },
        },
    };
    
    return (
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
            <option value="injuries">Injury Breakdown</option>
            <option value="behaviourType">Behaviour Type</option>
            <option value="residents">Resident Name</option>
            <option value="unit">Unit</option>
            <option value="hour">By Hour (24hr)</option>
            </select>

            {analysisChartData.datasets.length > 0 && <Bar data={analysisChartData} options={analysisChartOptions} />}
        </div>
    );

    
};


export default AnalysisChart;