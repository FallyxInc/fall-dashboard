import React, { useState } from 'react';
import { ref, set, remove } from 'firebase/database';
import Papa from 'papaparse'; // 如果你没有安装 Papa Parse，记得安装 `npm install papaparse`
import { db } from '../firebase'; // 引入 Firebase 实例

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

  // 设置年范围
  const years = Array.from({ length: 10 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      alert('Please select a CSV file!');
      return;
    }

    if (!selectedDashboard) {
      alert('Please select a dashboard!');
      return;
    }

    if (!selectedYear) {
      alert('Please select a year!');
      return;
    }

    if (!selectedMonth) {
      alert('Please select a month!');
      return;
    }

    setUploading(true);

    // Firebase 数据库路径包括仪表盘、年份和月份
    const dashboardRef = ref(db, `${selectedDashboard}/${selectedYear}/${selectedMonth}`);
    remove(dashboardRef).then(() => {
      console.log('Previous data removed successfully');

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        quoteChar: '"',
        complete: async (results) => {
          console.log('CSV parsing complete:', results.data);

          try {
            results.data.forEach((row, index) => {
              const rowRef = ref(db, `${selectedDashboard}/${selectedYear}/${selectedMonth}/row-${index}`);
              set(rowRef, row)
                .then(() => {
                  console.log(`Row ${index} uploaded successfully`);
                })
                .catch((error) => {
                  console.error(`Error uploading row ${index}:`, error);
                });
            });
            alert('CSV file successfully uploaded to Firebase!');
          } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed!');
          }

          setUploading(false);
          e.target.value = null;
        },
        error: (error) => {
          console.error('Parsing error:', error);
          alert('CSV parsing failed!');
          setUploading(false);
          e.target.value = null;
        },
      });
    });
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
