import './App.css';
import React from 'react';
import {  useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ManagementDashboard from './pages/ManagementDashboard';
// import TestFirebase from './components/TestFirebase';
import PrivateRoute from './components/PrivateRoute';
import Unauthorized from './pages/Unauthorized';
import UpdateData from './pages/UpdateData';

function App() {
  useEffect(() => {
    // 在首次加载时检测是否处于根路径，如果是，则重定向到 /home
    if (window.location.pathname === '/') {
      window.location.replace('/home'); // 使用 window.location.href 强制刷新
    }
  }, []);

  return (
    <div>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />}></Route>
          <Route path="/unauthorized" element={<Unauthorized />} />
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
                  goal={10}
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
                  goal={28}
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
                  unitSelectionValues={['allUnits', 'Ground W', '2 East', '2 West', '3 East', '3 West']}
                  goal={30}
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
                  unitSelectionValues={['allUnits', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor']}
                  goal={10}
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
