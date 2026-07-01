import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { paymentsAPI } from '../services/api';
import toast from 'react-hot-toast';

const UPI_OPTIONS = [
  { id: 'gpay', name: 'GPay', icon: '💳' },
  { id: 'phonepe', name: 'PhonePe', icon: '💜' },
  { id: 'paytm', name: 'Paytm', icon: '💙' },
  { id: 'bhim', name: 'BHIM UPI', icon: '🏦' },
  { id: 'other', name: 'Other UPI Apps', icon: '📱' },
];

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { amount = 0, orderId = null } = location.state || {};
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!selected) { toast.error('Select a payment method'); return; }
    setLoading(true);
    try {
      await paymentsAPI.create({
        order_id: orderId,
        amount,
        payment_method: 'upi',
        upi_provider: selected,
        transaction_id: `TXN${Date.now()}`,
      });
      toast.success('Payment successful!');
      setTimeout(() => navigate('/orders'), 1500);
    } catch (err) {
      toast.error('Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>←</button>
        <h2>Payment</h2>
      </div>

      <div className="payment-card">
        <div className="payment-total">
          <span>Total Payable</span>
          <span className="payment-amount">₹{amount}</span>
        </div>

        <p className="payment-label">Pay securely using UPI</p>

        <div className="upi-list">
          {UPI_OPTIONS.map((upi) => (
            <button
              key={upi.id}
              className={`upi-option ${selected === upi.id ? 'selected' : ''}`}
              onClick={() => setSelected(upi.id)}
            >
              <span className="upi-icon">{upi.icon}</span>
              <span>{upi.name}</span>
              <span className="upi-arrow">›</span>
            </button>
          ))}
        </div>

        <div className="payment-secure">
          <span>✅ 100% Secure Payments</span>
        </div>

        <button className="btn-primary btn-pay" onClick={handlePay} disabled={loading || !selected}>
          {loading ? 'Processing...' : `Pay ₹${amount}`}
        </button>
      </div>
    </div>
  );
}
