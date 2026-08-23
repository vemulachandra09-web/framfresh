import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deliveryAPI } from '../services/api';
import { formatStatus } from '../utils/format';
import toast from 'react-hot-toast';

const STEPS = ['assigned', 'picked_up', 'on_the_way', 'delivered'];

export default function TrackDelivery() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState(null);

  useEffect(() => {
    deliveryAPI.track(orderId)
      .then((res) => setDelivery(res.data))
      .catch(() => toast.error('Tracking not available'));
  }, [orderId]);

  const currentStep = delivery ? STEPS.indexOf(delivery.status) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>←</button>
        <h2>Track Your Delivery</h2>
      </div>

      {delivery ? (
        <div className="tracking-card">
          <div className="tracking-map-placeholder">
            <div className="map-icon">📍</div>
            <p>Live tracking</p>
          </div>

          <div className="tracking-steps">
            {STEPS.map((step, i) => (
              <div key={step} className={`tracking-step ${i <= currentStep ? 'completed' : ''}`}>
                <div className="step-dot" />
                <span>{formatStatus(step)}</span>
              </div>
            ))}
          </div>

          {delivery.delivery_partner && (
            <div className="partner-info">
              <h4>Delivery Partner</h4>
              <p className="partner-name">{delivery.delivery_partner.name}</p>
              <div className="partner-status">
                <span>Status</span>
                <span className="status-text">{formatStatus(delivery.status)}</span>
              </div>
              {delivery.estimated_time && (
                <div className="partner-eta">
                  <span className="eta-value">{delivery.estimated_time} mins</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="loading-screen"><div className="spinner" /></div>
      )}
    </div>
  );
}
