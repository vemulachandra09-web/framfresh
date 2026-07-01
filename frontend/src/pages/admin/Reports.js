import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

export default function Reports() {
  const today = new Date();
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const [startDate, setStartDate] = useState(formatDate(oneMonthAgo));
  const [endDate, setEndDate] = useState(formatDate(today));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReport = async (start, end) => {
    setLoading(true);
    try {
      const res = await adminAPI.revenue(start || undefined, end || undefined);
      setData(res.data);
    } catch {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(startDate, endDate);
  }, []);

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalTxns = data.reduce((sum, d) => sum + d.transactions, 0);

  return (
    <div className="page admin-page">
      <h2>Reports</h2>

      <div className="report-filters">
        <div className="form-group">
          <label>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={() => loadReport(startDate, endDate)} disabled={loading}>
          {loading ? 'Loading...' : 'Generate'}
        </button>
      </div>

      {data.length > 0 && (
        <>
          <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            <div className="stat-card">
              <div>
                <p className="stat-label">Total Revenue</p>
                <h3 className="stat-value">₹{totalRevenue.toLocaleString()}</h3>
              </div>
            </div>
            <div className="stat-card">
              <div>
                <p className="stat-label">Total Transactions</p>
                <h3 className="stat-value">{totalTxns.toLocaleString()}</h3>
              </div>
            </div>
          </div>

          <div className="chart-card">
            <h3>Daily Revenue</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#16a34a" name="Revenue (₹)" />
                <Bar dataKey="transactions" fill="#3b82f6" name="Transactions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {!loading && data.length === 0 && (
        <div className="empty-state"><p>No revenue data for this period</p></div>
      )}
    </div>
  );
}
