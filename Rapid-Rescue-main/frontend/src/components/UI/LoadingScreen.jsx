import React from 'react';
import './LoadingScreen.css';
import { FaSpinner } from 'react-icons/fa';

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <FaSpinner className="loading-spinner" />
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};

export default LoadingScreen; 