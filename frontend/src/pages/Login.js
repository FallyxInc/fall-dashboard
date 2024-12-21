import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { db, auth } from '../firebase';
import '../styles/Login.css';
import fallyxLogo from '../assets/fallyxlogo.jpeg';
import { Link } from 'react-router-dom';
// import { setLogLevel } from 'firebase/app';
// setLogLevel('debug');

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    if (event) event.preventDefault();

    // performance.clearMarks();
    // performance.clearMeasures();

    const fakeEmail = `${username}@example.com`;

    // performance.mark('start-signin');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, fakeEmail, password);
      // performance.mark('end-signin');
      // performance.measure('Sign-in Time', 'start-signin', 'end-signin');

      // const signInEntries = performance.getEntriesByName('Sign-in Time');
      // const signInTime = signInEntries[signInEntries.length - 1].duration;
      // console.log('Sign-in Time:', signInTime, 'ms');

      // Now measure the get(userRef) operation
      // performance.mark('start-getUser');

      const userId = userCredential.user.uid;
      const userSnapshot = await get(ref(db, `users/${userCredential.user.uid}`));
      // performance.mark('end-getUser');
      // performance.measure('Get User Time', 'start-getUser', 'end-getUser');

      // const getUserEntries = performance.getEntriesByName('Get User Time');
      // const getUserTime = getUserEntries[getUserEntries.length - 1].duration;
      // console.log('Get User Time:', getUserTime, 'ms');

      // Proceed with navigation
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        const updatedLoginCount = (userData.loginCount || 0) + 1;
        await set(ref(db, `users/${userId}/loginCount`), updatedLoginCount);

        const role = userSnapshot.val().role;
        navigate('/' + role);
      }
    } catch (error) {
      console.error('Error during login:', error);
      setErrorMessage('Login failed. Please check your credentials.');
    }
  };

  const handleDemoLogin = async () => {
    setErrorMessage('');
    try {
      await signInAnonymously(auth);
      // console.log('Anonymous login successful.');
      navigate('/demo-responsive');
    } catch (error) {
      console.error('Error during anonymous login:', error);
      setErrorMessage('Demo login failed. Please try again later.');
    }
  };

  return (
    <div className="login-container">
      <img src={fallyxLogo} alt="Logo" className="logoLogin" />
      <h2 className="login-title">Falls Analysis Tool Login</h2>

      <div className="login-input-group">
        <label htmlFor="login-email">Username</label>
        <input
          id="login-email"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              document.getElementById('login-password').focus(); // 当按下Enter时跳转到密码输入框
            }
          }}
        />
      </div>

      <div className="login-input-group">
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleLogin();
            }
          }}
        />
      </div>

      {errorMessage && <p className="login-error-message">{errorMessage}</p>}

      <button className="login-button" onClick={handleLogin}>
        Login
      </button>

      <button className="login-button" onClick={handleDemoLogin}>
        Demo Login
      </button>

      <div className="resetPasswordLink">
        <Link to="/reset-password">Forgot Password? Reset here</Link>
      </div>
    </div>
  );
}
