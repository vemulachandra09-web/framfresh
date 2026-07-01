import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsAPI, subscriptionsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Subscribe() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState({
    billing_cycle: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    delivery_time: 'morning',
    quantity: 1,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    productsAPI.get(productId).then((res) => setProduct(res.data)).catch(() => toast.error('Product not found'));
  }, [productId]);

  const monthlyBill = product ? (product.price_per_day * 30 * form.quantity).toFixed(0) : 0;
  const weeklyBill = product ? (product.price_per_day * 7 * form.quantity).toFixed(0) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await subscriptionsAPI.create({ ...form, product_id: productId });
      toast.success('Subscription created!');
      navigate('/subscriptions');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  if (!product) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>←</button>
        <h2>Subscription</h2>
      </div>

      <div className="subscription-card">
        <div className="sub-product">
          <span className="sub-icon">🥛</span>
          <div>
            <h3>Daily Delivery</h3>
            <p>{product.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Billing Cycle</label>
            <div className="toggle-group">
              {['weekly', 'monthly', 'custom'].map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  className={form.billing_cycle === cycle ? 'active' : ''}
                  onClick={() => setForm({ ...form, billing_cycle: cycle })}
                >
                  {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="form-group">
            <label>Quantity</label>
            <div className="qty-selector">
              <button type="button" onClick={() => form.quantity > 1 && setForm({ ...form, quantity: form.quantity - 1 })}>−</button>
              <span>{form.quantity}</span>
              <button type="button" onClick={() => setForm({ ...form, quantity: form.quantity + 1 })}>+</button>
            </div>
          </div>

          <div className="bill-summary">
            <div className="bill-row">
              <span>Daily Cost</span>
              <span>₹{(product.price_per_day * form.quantity).toFixed(0)}/day</span>
            </div>
            <div className="bill-row total">
              <span>{form.billing_cycle === 'weekly' ? 'Weekly' : 'Monthly'} Bill</span>
              <span>₹{form.billing_cycle === 'weekly' ? weeklyBill : monthlyBill}</span>
            </div>
            <p className="bill-note">({form.billing_cycle === 'weekly' ? '7' : '30'} Days)</p>
          </div>

          <button type="submit" className="btn-primary btn-pay" disabled={loading}>
            {loading ? 'Processing...' : 'Subscribe Now'}
          </button>
          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
            Pay later from My Subscriptions
          </p>
        </form>
      </div>
    </div>
  );
}
