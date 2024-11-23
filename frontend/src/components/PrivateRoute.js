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
            const role = snapshot.val().role;
            if (rolesRequired.includes(role)) {
              setAuthorized(true); // 用户有权限访问
            } else {
              setAuthorized(false); // 用户没有权限访问
            }
          }
          setLoading(false); // 数据加载完毕
        })
        .catch(() => {
          setLoading(false); // 如果有错误，也终止加载状态
        });
    } else {
      setLoading(false); // 没有用户时，也终止加载状态
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
