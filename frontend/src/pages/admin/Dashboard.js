import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { formatStatus } from '../../utils/format';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);

  useEffect(() => {
    adminAPI.dashboard().then((res) => setStats(res.data)).catch(() => toast.error('Failed to load'));
    adminAPI.revenue().then((res) => setRevenue(res.data)).catch(() => {});
  }, []);

  if (!stats) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page admin-page">
      <h2>Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">👥</span>
          <div>
            <p className="stat-label">Total Customers</p>
            <h3 className="stat-value">{stats.total_customers.toLocaleString()}</h3>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📋</span>
          <div>
            <p className="stat-label">Active Subscriptions</p>
            <h3 className="stat-value">{stats.active_subscriptions.toLocaleString()}</h3>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📦</span>
          <div>
            <p className="stat-label">Today's Orders</p>
            <h3 className="stat-value highlight">{stats.todays_orders.toLocaleString()}</h3>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div>
            <p className="stat-label">Monthly Revenue</p>
            <h3 className="stat-value">₹{stats.monthly_revenue.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {revenue.length > 0 && (
        <div className="chart-card">
          <h3>Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#16a34a" fill="#bbf7d0" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="recent-orders-card">
        <h3>Recent Orders</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {stats.recent_orders.map((order) => (
              <tr key={order.id}>
                <td>{order.order_number}</td>
                <td>{order.user?.name || '-'}</td>
                <td>{order.items?.map((i) => i.product?.name || '').join(', ') || '-'}</td>
                <td>{order.delivery_date}</td>
                <td>₹{order.total_amount}</td>
                <td><span className={`badge badge-${order.status}`}>{formatStatus(order.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
