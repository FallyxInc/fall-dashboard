import './App.css';
import React from 'react';
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ManagementDashboard from './pages/ManagementDashboard';
// import TestFirebase from './components/TestFirebase';
import PrivateRoute from './components/PrivateRoute';
import Unauthorized from './pages/Unauthorized';
import UpdateData from './pages/UpdateData';
import UpdatePasswordPage from './pages/ResetPassword';
import DemoManagementDashboard from './pages/DemoManagementDashboard';
import GenerationsDashboard from './pages/Generations';
import ShepherdLodge from './pages/Shepherd-Lodge';
import GoderichPlace from './pages/Goderich-Place';
import Palisade from './pages/Palisade';
import Wellington from './pages/Wellington';




function App() {
  useEffect(() => {
    if (window.location.pathname === '/') {
      window.location.replace('/home');
    }
  }, []);

  return (
    <div>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />}></Route>
          <Route path="/reset-password" element={<UpdatePasswordPage />}></Route>
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
          <Route path="/demo-responsive" element={<DemoManagementDashboard></DemoManagementDashboard>}></Route>
          <Route
            path="/wynford"
            element={
              <Dashboard
                name="wynford"
                title={'The Wynford Falls dashboard'}
                unitSelectionValues={['allUnits', 'unit 1', 'unit 2', 'unit 3']}
                goal={10}
              ></Dashboard>
            }
          ></Route>
          <Route
            path="/home2"
            element={
              <Dashboard
                name="home2"
                title={'The Home 2 Falls dashboard'}
                unitSelectionValues={['allUnits', 'unit 1', 'unit 2', 'unit 3']}
                goal={18}
              ></Dashboard>
            }
          ></Route>
          <Route
            path="/home3"
            element={
              <Dashboard
                name="home3"
                title={'The Home 3 Falls dashboard'}
                unitSelectionValues={['allUnits', 'unit 1', 'unit 2', 'unit 3']}
                goal={15}
              ></Dashboard>
            }
          ></Route>
          <Route
            path="/home4"
            element={
              <Dashboard
                name="home4"
                title={'The Home 4 Falls dashboard'}
                unitSelectionValues={['allUnits', 'unit 1', 'unit 2', 'unit 3']}
                goal={20}
              ></Dashboard>
            }
          ></Route>
          <Route
            path="/wellington"
            element={
              <PrivateRoute rolesRequired={['wellington', 'responsive']}>
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
            path="/tw2"
            element={
              <PrivateRoute rolesRequired={['wellington', 'responsive', 'tw2']}>
                <Wellington
                  name="wellington"
                  title={'The Wellington LTC Falls Dashboard'}
                  unitSelectionValues={['allUnits', 'Gage North', 'Gage West', 'Lawrence']}
                  goal={10}
                />
              </PrivateRoute>
            }
          />
          <Route
            path="/niagara"
            element={
              <PrivateRoute rolesRequired={['niagara', 'responsive']}>
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
            path="/millCreek"
            element={
              <PrivateRoute rolesRequired={['millCreek', 'responsive']}>
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
            path="/iggh"
            element={
              <PrivateRoute rolesRequired={['iggh', 'responsive']}>
                <Dashboard
                  name="iggh"
                  title="Ina Grafton Gage Home Falls Dashboard"
                  unitSelectionValues={['allUnits', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor']}
                  goal={30}
                />
              </PrivateRoute>
            }
          />

          <Route
            path="/bonairltc"
            element={
              <PrivateRoute rolesRequired={['bonairltc', 'responsive']}>
                <Dashboard
                  name="bonairltc"
                  title="Bon Air LTC Falls Dashboard "
                  unitSelectionValues={['allUnits', '1', '2']}
                  goal={6}
                />
              </PrivateRoute>
            }
          />

          <Route
            path="/champlain"
            element={
              <PrivateRoute rolesRequired={['champlain', 'responsive']}>
                <Dashboard
                  name="champlain"
                  title="Champlain LTC Falls Dashboard "
                  unitSelectionValues={['allUnits', 'West', 'East']}
                  goal={12}
                />
              </PrivateRoute>
            }
          />

          <Route
            path="/lancaster"
            element={
              <PrivateRoute rolesRequired={['lancaster', 'responsive']}>
                <Dashboard
                  name="lancaster"
                  title="Lancaster LTC Falls Dashboard"
                  unitSelectionValues={['allUnits', 'East', 'North', 'South']}
                  goal={9}
                />
              </PrivateRoute>
            }
          />

          <Route
            path="/oneill"
            element={
              <PrivateRoute rolesRequired={['oneill', 'responsive']}>
                <Dashboard
                  name="oneill"
                  title="The O'Neill Centre Falls Dashboard"
                  unitSelectionValues={['allUnits', '4', '2', '3']}
                  goal={12}
                />
              </PrivateRoute>
            }
          />

          <Route
            path="/vmltc"
            element={
              <PrivateRoute rolesRequired={['vmltc', 'responsive']}>
                <Dashboard
                  name="vmltc"
                  title="Villa Marconi LTC Falls Dashboard"
                  unitSelectionValues={['allUnits', 'Casa dell Amore', 'Casa della Vita', 'Casa della Luce', 'Casa degli Amici']}
                  goal={26}
                />
              </PrivateRoute>
            }
          />

          <Route
            path="/il"
            element={
              <PrivateRoute rolesRequired={['il', 'responsive']}>
                <Dashboard
                  name="demo"
                  title="Villa Marconi LTC Falls Dashboard"
                  unitSelectionValues={['allUnits', 'Casa dell Amore', 'Casa della Vita', 'Casa della Luce', 'Casa degli Amici']}
                  goal={26}
                />
              </PrivateRoute>
            }
          />

          <Route
            path="/generations"
            element={
              <PrivateRoute rolesRequired={['generations', 'responsive']}>
                <GenerationsDashboard
                  name="generations"
                  title="Generations Falls Dashboard"
                  unitSelectionValues={['allUnits', 'SL4 2 East', 'SL4 2 South', 'SL4 2 North', 'SL4 1 East', 'SL4 1 South', 'SL4 1 North']}
                  goal={20}
                />
              </PrivateRoute>
            }
          />

          <Route
            path="/shepherd"
            element={
              <PrivateRoute rolesRequired={['shepherd', 'responsive']}>
                <ShepherdLodge 
                  name="shepherd"
                  title="Shepherd Lodge Falls Dashboard"
                  goal={60}
                
                />
              </PrivateRoute>
            }
          />

          <Route
            path="/palisade"
            element={
              <PrivateRoute rolesRequired={['palisade', 'responsive']}>
                <Palisade 
                  name="palisade"
                  title="Palisade Gardens Falls Dashboard"
                  goal={20}
                
                />
              </PrivateRoute>
            }
          />


          <Route
            path="/goderich"
            element={
              
                <GoderichPlace 
                  name="goderich"
                  title="Goderich Place Falls Dashboard"
                  goal={22}
                />
              
            }
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
