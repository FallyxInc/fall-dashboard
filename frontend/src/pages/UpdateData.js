import React, { useState } from 'react';
import { ref, set, remove, get } from 'firebase/database';
import Papa from 'papaparse';
import { db } from '../firebase';

const UpdateData = () => {
  const [uploading, setUploading] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const dashboards = [
    { name: 'wellington', label: 'The Wellington LTC' },
    { name: 'niagara', label: 'Niagara LTC' },
    { name: 'millCreek', label: 'Mill Creek Care Center' },
    { name: 'iggh', label: 'Ina Grafton Gage Home' },
    { name: 'bonairltc', label: 'Bon Air LTC' },
    { name: 'champlain', label: 'Champlain LTC' },
    { name: 'lancaster', label: 'Lancaster LTC' },
    { name: 'oneill', label: "The O'Neill Centre" },
    { name: 'vmltc', label: 'Villa Marconi LTC' },
    { name: 'home1', label: 'Homes1' },
    { name: 'home2', label: 'Homes2' },
    { name: 'home3', label: 'Homes3' },
    { name: 'home4', label: 'Homes4' },
    { name: 'generations', label: 'generations' },
  ];

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const years = Array.from({ length: 10 }, (_, i) => {
    const year = new Date().getFullYear() + 5 - i;
    return { value: year.toString(), label: year.toString() };
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];

    if (!file || !selectedDashboard || !selectedYear || !selectedMonth) {
      alert('Please ensure all fields are selected and a file is chosen.');
      return;
    }

    setUploading(true);

    const dashboardRef = ref(db, `${selectedDashboard}/${selectedYear}/${selectedMonth}`);

    // Special fields list for generations
    const fieldsWithIsUpdated = selectedDashboard === 'generations' ? [
      'interventions',
      'type',
      'incident_location',
      'room',
      'injuries',
      'witnessed',
      'fallsThisMonth',
      'fallsInThreeMonths',
      'nearMissesInThreeMonths',
      'cause',
      'poaContacted',
      'transfer_to_hospital',
      'postFallNotesColor',
      'dayOfTheWeek',
      'longTermIntervention'
    ] : [
      'incidentReport',
      'physicianRef',
      'poaContacted',
      'postFallNotes',
      'ptRef',
      'transfer_to_hospital',
      'hir',
      'cause',
      'interventions',
    ];

    try {
      const snapshot = await get(dashboardRef);
      const existingData = snapshot.exists() ? snapshot.val() : {};

      remove(dashboardRef).then(() => {
        console.log('Previous data removed successfully');

        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            const newData = results.data;

            for (let i = 0; i < newData.length; i++) {
              const row = newData[i];

              if (selectedDashboard === 'generations') {
                // Special handling for generations
                const updatedRow = {
                  date: row.date,
                  name: row.name,
                  time: row.time,
                  room: row.room || '',
                  injuries: row.injuries || '',
                  interventions: row.interventions || '',
                  cause: row.cause || '',
                  transfer_to_hospital: row.transfer_to_hospital || 'no',
                  postFallNotesColor: 'default',
                  witnessed: row.witnessed || 'N',
                  id: row.id || String(i),
                  'Falls This Month': row['Falls This Month'] || '',
                  'Falls in 3 Months': row['Falls in 3 Months'] || '',
                  'Near Missses in 3 Months': row['Near Missses in 3 Months'] || '',
                  'Day of the Week': row['Day of the Week'] || '',
                  type: row.type || '',
                  incident_location: row.incident_location || '',
                  longTermIntervention: row.longTermIntervention || 'Click here to add',
                  poaContacted: row.poaContacted || 'no',
                  isTransfer_to_hospitalUpdated: 'no',
                  isPostFallNotesUpdated: 'no'
                };

                const rowRef = ref(db, `${selectedDashboard}/${selectedYear}/${selectedMonth}/row-${i}`);
                await set(rowRef, updatedRow);
              } else {
                // Original code for other dashboards remains unchanged
                const { date, name, homeUnit, time, injury, ...otherFields } = row;
                const updatedRow = { date, name, homeUnit, time, injury, ...otherFields };

                for (let j = 0; j < fieldsWithIsUpdated.length; j++) {
                  const field = fieldsWithIsUpdated[j];
                  const isUpdatedKey = `is${field.charAt(0).toUpperCase() + field.slice(1)}Updated`;

                  if (!(isUpdatedKey in updatedRow)) {
                    updatedRow[isUpdatedKey] = 'no';
                  } else {
                    updatedRow[isUpdatedKey] = updatedRow[isUpdatedKey].toLowerCase();
                  }
                }

                // firebase data
                const existingEntryKey = Object.keys(existingData).find((key) => {
                  const existingRow = existingData[key];
                  return existingRow.date === date && existingRow.name === name && existingRow.time === time;
                });

                const rowRef = ref(db, `${selectedDashboard}/${selectedYear}/${selectedMonth}/row-${i}`);

                if (existingEntryKey) {
                  const existingRow = existingData[existingEntryKey];

                  for (let j = 0; j < fieldsWithIsUpdated.length; j++) {
                    const field = fieldsWithIsUpdated[j];
                    const isUpdatedKey = `is${field.charAt(0).toUpperCase() + field.slice(1)}Updated`;

                    if (!(isUpdatedKey in existingRow)) {
                      existingRow[isUpdatedKey] = 'no';
                    }
                  }

                  for (let j = 0; j < fieldsWithIsUpdated.length; j++) {
                    const field = fieldsWithIsUpdated[j];
                    const isUpdatedKey = `is${field.charAt(0).toUpperCase() + field.slice(1)}Updated`;

                    if (existingRow[isUpdatedKey] === 'yes') {
                      console.log(`Conflict for field ${field} in row ${i}. Skipping update.`);
                    } else {
                      existingRow[field] = updatedRow[field];
                    }
                  }

                  console.log('existingRow');
                  console.log(existingRow);

                  set(rowRef, existingRow)
                    .then(() => {
                      console.log(`Row ${i} uploaded successfully`);
                    })
                    .catch((error) => {
                      console.error(`Failed to upload row ${i}:`, error);
                    });
                } else {
                  set(rowRef, updatedRow)
                    .then(() => {
                      console.log(`Row ${i} uploaded successfully`);
                    })
                    .catch((error) => {
                      console.error(`Failed to upload row ${i}:`, error);
                    });
                }
              }
            }

            setUploading(false);
            alert('CSV file uploaded successfully!');
          },
          error: (error) => {
            console.error('Parsing error:', error);
            setUploading(false);
            alert('Failed to parse the CSV file.');
          },
        });
      });
    } catch (error) {
      console.error('Error during upload:', error);
      setUploading(false);
      alert('An error occurred while processing the upload.');
    }
  };

  return (
    <div>
      <h2>Upload Data to Dashboard</h2>
      <div>
        <label>Select a dashboard:</label>
        <select value={selectedDashboard} onChange={(e) => setSelectedDashboard(e.target.value)}>
          <option value="">-- Select a Dashboard --</option>
          {dashboards.map((dashboard) => (
            <option key={dashboard.name} value={dashboard.name}>
              {dashboard.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: '20px' }}>
        <label>Select a year:</label>
        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
          <option value="">-- Select a Year --</option>
          {years.map((year) => (
            <option key={year.value} value={year.value}>
              {year.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: '20px' }}>
        <label>Select a month:</label>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
          <option value="">-- Select a Month --</option>
          {months.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: '20px' }}>
        <input type="file" accept=".csv" style={{ display: 'none' }} id="uploadCSV" onChange={handleFileChange} />
        <label htmlFor="uploadCSV" style={{ cursor: 'pointer' }}>
          {uploading ? 'Uploading...' : 'Upload CSV'}
        </label>
      </div>
    </div>
  );
};

export default UpdateData;
