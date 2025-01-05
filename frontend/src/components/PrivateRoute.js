import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { db, auth } from '../firebase'; // 引入Firebase认证
import { ref, get } from 'firebase/database';

const PrivateRoute = ({ rolesRequired, children }) => {
  const [authorized, setAuthorized] = useState(false); // 初始化为 false
  const [loading, setLoading] = useState(true); // 用于处理数据加载状态
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      const userRef = ref(db, `users/${user.uid}`);
      get(userRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            let role = snapshot.val().role;
            // Add the same role mapping as in Login.js
            const roleMapping = {
              'niagara-ltc': 'niagara',
              // Add other mappings if needed
            };
            role = roleMapping[role] || role;
            
            if (rolesRequired.includes(role)) {
              setAuthorized(true);
            } else {
              setAuthorized(false);
            }
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [user, rolesRequired]);

  if (loading) {
    return <div>Loading...</div>; // 数据加载时显示加载状态
  }

  if (!user) {
    return <Navigate to="/unauthorized" />;
  }

  return authorized ? children : <Navigate to="/unauthorized" />;
};

export default PrivateRoute;
