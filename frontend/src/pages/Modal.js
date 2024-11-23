import React from 'react';
import '../styles/Modal.css';

const Modal = ({ showModal, handleClose, modalContent, title }) => {
  return (
    <div className={`modal ${showModal ? 'show' : ''}`} onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="close" onClick={handleClose}>
          &times;
        </span>
        <h2 className="modal-title">{title}</h2>
        <div className="modal-body">
          <ul>
            {modalContent.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Modal;
