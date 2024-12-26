import React from 'react';

const Modal = ({ showModal, handleClose, modalContent, title }) => {
  const modalStyle = {
    display: showModal ? 'block' : 'none',
    position: 'fixed',
    zIndex: 1,
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    overflow: 'auto',
    backgroundColor: 'rgba(0,0,0,0.4)',
  };

  const modalContentStyle = {
    backgroundColor: '#fefefe',
    margin: '15% auto',
    padding: '20px',
    border: '1px solid #888',
    width: '80%',
    maxWidth: '500px',
    borderRadius: '5px',
    position: 'relative',
  };

  const closeButtonStyle = {
    color: '#aaa',
    float: 'right',
    fontSize: '28px',
    fontWeight: 'bold',
    cursor: 'pointer',
  };

  return (
    <div style={modalStyle}>
      <div style={modalContentStyle}>
        <span 
          style={closeButtonStyle} 
          onClick={handleClose}
        >
          &times;
        </span>
        <h2>{title}</h2>
        <div style={{ marginTop: '20px' }}>
          {Array.isArray(modalContent) 
            ? modalContent.map((line, index) => (
                <div key={index} style={{ margin: '10px 0' }}>{line}</div>
              ))
            : modalContent
          }
        </div>
      </div>
    </div>
  );
};

export default Modal;
