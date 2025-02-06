import React from 'react';
import { Link } from 'react-router-dom'; // 引入Link组件
import '../styles/SummaryCard.css';

const SummaryCard = ({ value, subtitle, linkTo, fallrate, loginCounts }) => {
  return (
    <div className="summary-card">
      <Link to={linkTo} className="summary-link">
        {/* 应用summary-link类 */}
        <div className="summary-value">{value}</div>
      </Link>
      <div className="summary-title">Falls</div>
      {fallrate !== undefined && (
        <div className="summary-fallrate">Fall Rate: {fallrate.toFixed(2)}%</div>
      )}
      <div className="summary-login-count">Logged In {loginCounts} times</div>
      <div className="summary-subtitle">{subtitle}</div>
    </div>
  );
};

export default SummaryCard;
