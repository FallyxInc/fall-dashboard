import './App.css';
import React from 'react';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Redirect } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ManagementDashboard from './pages/ManagementDashboard';
// import TestFirebase from './components/TestFirebase';
import * as Papa from 'papaparse';
import { db } from './firebase';
import { ref, update, get, off, onValue } from 'firebase/database';
import PrivateRoute from './components/PrivateRoute';
import Unauthorized from './pages/Unauthorized';
import UpdateData from './pages/UpdateData';
import Loading from './pages/Loading';

function App() {
  // console.log('App is re-rendered');

  // const [data, setData] = useState({
  //   niagara: [],
  //   wellington: [],
  //   millCreek: [],
  //   iggh: [],
  // });

  // const dataLengths = {
  //   niagara: data.niagara.length,
  //   wellington: data.wellington.length,
  //   millCreek: data.millCreek.length,
  //   iggh: data.iggh.length,
  // };

  const dataLengths = {
    niagara: 16,
    wellington: 8,
    millCreek: 16,
    iggh: 16,
  };

  // const fetchDataFromFirebase = (key) => {
  //   const dataRef = ref(db, key); // Reference the key in Firebase

  //   // Use Firebase's onValue to listen for real-time updates
  //   const listener = onValue(
  //     dataRef,
  //     (snapshot) => {
  //       if (snapshot.exists()) {
  //         const fetchedData = snapshot.val();
  //         const fetchedArray = Object.values(fetchedData); // Convert object to array if needed
  //         console.log('fetchedArray');
  //         console.log(fetchedArray);
  //         // Update the state with the new data
  //         setData((prevData) => ({
  //           ...prevData,
  //           [key]: fetchedArray,
  //         }));
  //       } else {
  //         console.log(`${key} data not found.`);
  //       }
  //     },
  //     (error) => {
  //       console.error(`Error fetching ${key} data from Firebase:`, error);
  //     }
  //   );

  //   // Return the listener so it can be turned off later
  //   return listener;
  // };

  // const [isLoading, setIsLoading] = useState(true);

  // useEffect(() => {
  //   // Set up listeners for all datasets
  //   const niagaraListener = fetchDataFromFirebase('niagara');
  //   const wellingtonListener = fetchDataFromFirebase('wellington');
  //   const millCreekListener = fetchDataFromFirebase('millCreek');
  //   const igghListener = fetchDataFromFirebase('iggh');
  //   // Cleanup function to remove the listeners when the component unmounts
  //   return () => {
  //     off(ref(db, 'niagara'), niagaraListener);
  //     off(ref(db, 'wellington'), wellingtonListener);
  //     off(ref(db, 'millCreek'), millCreekListener);
  //     off(ref(db, 'iggh'), igghListener);
  //   };
  // }, []);

  // useEffect(() => {
  //   if (data.niagara.length > 0 && data.wellington.length > 0 && data.millCreek.length > 0 && data.iggh.length > 0) {
  //     setIsLoading(false);
  //   }
  // }, [data]); // 当数据变化时检查是否还在加载
  // console.log(isLoading);

  // if (isLoading) {
  //   return <Loading></Loading>;
  // }

  return (
    <div>
      {/* <header> */}
      {/* <nav> */}
      {/* <a href="/home">Home Page</a> */}
      {/* </nav> */}
      {/* </header> */}
      <a href="/home" style={{ display: 'none' }}>
        Redirecting to /home...
      </a>
      <Router>
        <Routes>
          {/* <Route path="/" element={<Navigate to="/home" />} /> */}

          {/* <Route path="/home" element={<Navigate to="/index.html" replace />} /> */}

          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/login" element={<Login />}></Route>
          <Route path="/unauthorized" element={<Unauthorized />} />
          {/* <Route path="/test" element={<TestFirebase />} /> */}

          <Route
            path="/update-data"
            element={
              <PrivateRoute rolesRequired={['update-data']}>
                <UpdateData />
              </PrivateRoute>
            }
          />
          <Route
            path="/responsive"
            element={
              <PrivateRoute rolesRequired={['responsive']}>
                {/* <ManagementDashboard dataLengths={dataLengths} /> */}
                <ManagementDashboard></ManagementDashboard>
              </PrivateRoute>
            }
          ></Route>
          <Route
            path="/the-wellington-ltc"
            element={
              <PrivateRoute rolesRequired={['the-wellington-ltc', 'responsive']}>
                <Dashboard
                  name="wellington"
                  title={'The Wellington LTC Falls Dashboard'}
                  unitSelectionValues={['allUnits', 'Gage North', 'Gage West', 'Lawrence']}
                />
              </PrivateRoute>
            }
          />
          <Route
            path="/niagara-ltc"
            element={
              <PrivateRoute rolesRequired={['niagara-ltc', 'responsive']}>
                <Dashboard
                  name="niagara"
                  title="Niagara LTC Falls Dashboard"
                  // data={data.niagara}
                  // handleUpdateCSV={handleUpdateCSV}
                  unitSelectionValues={[
                    'allUnits',
                    'Shaw',
                    'Shaw Two',
                    'Shaw Three',
                    'Pinery',
                    'Pinery Two',
                    'Pinery Three',
                    'Wellington',
                    'Lawrence',
                    'Gage',
                  ]}
                />
              </PrivateRoute>
            }
          />
          <Route
            path="/mill-creek-care"
            element={
              <PrivateRoute rolesRequired={['mill-creek-care', 'responsive']}>
                <Dashboard
                  name="millCreek"
                  title="Mill Creek Care Center Falls Dashboard"
                  // data={data.millCreek}
                  // handleUpdateCSV={handleUpdateCSV}
                  unitSelectionValues={['allUnits', 'Ground W', '2 East', '2 West', '3 East', '3 West']}
                />
              </PrivateRoute>
            }
          />
          <Route
            path="/iggh-ltc"
            element={
              <PrivateRoute rolesRequired={['iggh-ltc', 'responsive']}>
                <Dashboard
                  name="iggh"
                  title="Ina Grafton Gage Home Falls Dashboard"
                  // data={data.iggh}
                  // handleUpdateCSV={handleUpdateCSV}
                  unitSelectionValues={['allUnits', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor']}
                />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
