import React, { useState } from 'react';
import { ref, set, remove} from 'firebase/database';
import Papa from 'papaparse'; // 如果你没有安装 Papa Parse，记得安装 `npm install papaparse`
import { db } from '../firebase'; // 引入 Firebase 实例

const UpdateData = () => {
  const [uploading, setUploading] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState('');

  const dashboards = [
    { name: 'wellington', label: 'The Wellington LTC' },
    { name: 'niagara', label: 'Niagara LTC' },
    { name: 'millCreek', label: 'Mill Creek Care Center' },
    { name: 'iggh', label: 'Ina Grafton Gage Home' },
  ];

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

    setUploading(true);

    const dashboardRef = ref(db, selectedDashboard);
    remove(dashboardRef).then(() => {
      console.log('Previous data removed successfully');

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        quoteChar: '"',
        complete: async (results) => {
          console.log('CSV parsing complete:', results.data);

          try {
            // 遍历解析的结果并上传到 Firebase Database
            results.data.forEach((row, index) => {
              // 生成数据库引用
              const rowRef = ref(db, `${selectedDashboard}/row-${index}`);

              // 设置数据
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
        },
        error: (error) => {
          console.error('Parsing error:', error);
          alert('CSV parsing failed!');
          setUploading(false);
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
        <input type="file" accept=".csv" style={{ display: 'none' }} id="uploadCSV" onChange={handleFileChange} />
        <label htmlFor="uploadCSV" style={{ cursor: 'pointer' }}>
          {uploading ? 'Uploading...' : 'Upload CSV'}
        </label>
      </div>
    </div>
  );
};

export default UpdateData;
