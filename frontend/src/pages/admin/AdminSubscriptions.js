import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function AdminSubscriptions() {
  const [subs, setSubs] = useState([]);
  const [filter, setFilter] = useState(null);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    adminAPI.subscriptions(filter, page).then((res) => setSubs(res.data)).catch(() => toast.error('Failed'));
  }, [filter, page]);

  const today = new Date().toISOString().split('T')[0];

  const futureSkips = (sub) =>
    (sub.skip_dates || [])
      .filter((s) => s.skip_date >= today)
      .sort((a, b) => a.skip_date.localeCompare(b.skip_date));

  return (
    <div className="page admin-page">
      <h2>Subscriptions</h2>

      <div className="category-filters">
        <button className={!filter ? 'active' : ''} onClick={() => { setFilter(null); setPage(1); }}>All</button>
        {['active', 'paused', 'cancelled'].map((s) => (
          <button key={s} className={filter === s ? 'active' : ''} onClick={() => { setFilter(s); setPage(1); }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Cycle</th>
            <th>Start Date</th>
            <th>Status</th>
            <th>Paused Until</th>
            <th>Skipped Days</th>
          </tr>
        </thead>
        <tbody>
          {subs.map((sub) => {
            const skips = futureSkips(sub);
            return (
              <tr key={sub.id}>
                <td>{sub.user?.name || sub.user_id.toString().slice(0, 8)}</td>
                <td>{sub.product?.name || '-'}</td>
                <td>{sub.quantity}</td>
                <td>{sub.billing_cycle}</td>
                <td>{sub.start_date}</td>
                <td><span className={`badge badge-${sub.status}`}>{sub.status}</span></td>
                <td>{sub.paused_until || '-'}</td>
                <td>
                  {skips.length === 0 ? (
                    <span style={{ color: '#9ca3af' }}>-</span>
                  ) : (
                    <div>
                      <button
                        className="skip-count-btn"
                        onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
                      >
                        {skips.length} day{skips.length > 1 ? 's' : ''}
                        <span style={{ fontSize: '0.7rem', marginLeft: '0.25rem' }}>
                          {expanded === sub.id ? '▲' : '▼'}
                        </span>
                      </button>
                      {expanded === sub.id && (
                        <div className="skip-dates-dropdown">
                          {skips.map((s) => (
                            <span key={s.id} className="skip-chip">{formatDate(s.skip_date)}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page}</span>
        <button onClick={() => setPage(page + 1)} disabled={subs.length < 20}>Next</button>
      </div>
    </div>
  );
}
