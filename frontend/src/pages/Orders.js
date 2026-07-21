import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersAPI, deliveryAPI } from '../services/api';
import toast from 'react-hot-toast';

const STATUS_ICONS = {
  pending: '⏳', confirmed: '✅', out_for_delivery: '🚚', delivered: '📦', cancelled: '❌',
};

function StarPicker({ value, onChange, label }) {
  return (
    <div className="star-picker">
      <span className="star-label">{label}</span>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className={`star ${n <= value ? 'filled' : ''}`} onClick={() => onChange(n)}>
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState(null);
  const [rateTarget, setRateTarget] = useState(null);
  const [quality, setQuality] = useState(0);
  const [timing, setTiming] = useState(0);
  const [comment, setComment] = useState('');
  const [rated, setRated] = useState({});
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    ordersAPI.list(filter).then((res) => setOrders(res.data)).catch(() => toast.error('Failed to load orders'));
  }, [filter]);

  const openRate = (order) => {
    setRateTarget(order);
    setQuality(0);
    setTiming(0);
    setComment('');
  };

  const handleRate = async () => {
    if (!rateTarget || quality === 0 || timing === 0) {
      toast.error('Please select both ratings');
      return;
    }
    setProcessing(true);
    try {
      await deliveryAPI.rate(rateTarget.delivery.id, {
        quality_rating: quality,
        timing_rating: timing,
        comment: comment || null,
      });
      toast.success('Thanks for your feedback!');
      setRated((prev) => ({ ...prev, [rateTarget.id]: true }));
      setRateTarget(null);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to submit';
      if (msg === 'Already rated this delivery') {
        setRated((prev) => ({ ...prev, [rateTarget.id]: true }));
        setRateTarget(null);
      }
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>My Orders</h2>
      </div>

      <div className="category-filters">
        <button className={!filter ? 'active' : ''} onClick={() => setFilter(null)}>All</button>
        {['pending', 'confirmed', 'out_for_delivery', 'delivered'].map((s) => (
          <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>
            {STATUS_ICONS[s]} {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="empty-state"><p>No orders found</p></div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header" onClick={() => navigate(`/orders/${order.id}`)}>
                <div className="order-title">
                  {order.items && order.items.length > 0 ? (
                    <span className="order-product-name">
                      {order.items.map((item) => `${item.product?.name || 'Product'} x${item.quantity}`).join(', ')}
                    </span>
                  ) : (
                    <span className="order-product-name">Order</span>
                  )}
                  <span className="order-id">Order ID: {order.order_number}</span>
                </div>
                <span className={`order-status status-${order.status}`}>
                  {STATUS_ICONS[order.status]} {order.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="order-body">
                <span>📅 {order.delivery_date}</span>
                <span className="order-amount">₹{order.total_amount}</span>
              </div>
              <div className="order-footer">
                {order.status === 'out_for_delivery' && (
                  <button className="btn-track" onClick={() => navigate(`/track/${order.id}`)}>
                    Track Delivery
                  </button>
                )}
                {order.status === 'delivered' && order.delivery && !rated[order.id] && (
                  <button className="btn-rate" onClick={() => openRate(order)}>
                    ⭐ Rate Delivery
                  </button>
                )}
                {rated[order.id] && (
                  <span className="rated-badge">✅ Rated</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rating Modal */}
      {rateTarget && (
        <div className="modal-overlay" onClick={() => !processing && setRateTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">⭐</div>
            <h3>Rate Your Delivery</h3>
            <p><strong>{rateTarget.order_number}</strong></p>
            {rateTarget.delivery?.delivery_partner && (
              <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                Partner: {rateTarget.delivery.delivery_partner.name}
              </p>
            )}

            <div className="rating-section">
              <StarPicker value={quality} onChange={setQuality} label="Product Quality" />
              <StarPicker value={timing} onChange={setTiming} label="Delivery Timing" />
            </div>

            <div className="form-group" style={{ margin: '1rem 0', textAlign: 'left' }}>
              <label>Comment (optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us about your experience..."
                rows={3}
                style={{ width: '100%', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0.5rem', fontSize: '0.85rem', resize: 'vertical' }}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={handleRate} disabled={processing || quality === 0 || timing === 0}>
                {processing ? 'Submitting...' : 'Submit Rating'}
              </button>
              <button className="btn-outline" onClick={() => setRateTarget(null)} disabled={processing}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
