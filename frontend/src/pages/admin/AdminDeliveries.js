import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { formatStatus } from '../../utils/format';
import toast from 'react-hot-toast';

function Stars({ count }) {
  return (
    <span style={{ color: '#f59e0b', fontSize: '0.85rem', letterSpacing: '1px' }}>
      {'★'.repeat(count)}{'☆'.repeat(5 - count)}
    </span>
  );
}

export default function AdminDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [filter, setFilter] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    adminAPI.deliveries(filter, page).then((res) => setDeliveries(res.data)).catch(() => toast.error('Failed'));
  }, [filter, page]);

  return (
    <div className="page admin-page">
      <h2>Deliveries</h2>

      <div className="category-filters">
        <button className={!filter ? 'active' : ''} onClick={() => { setFilter(null); setPage(1); }}>All</button>
        {['assigned', 'picked_up', 'on_the_way', 'delivered', 'failed'].map((s) => (
          <button key={s} className={filter === s ? 'active' : ''} onClick={() => { setFilter(s); setPage(1); }}>
            {formatStatus(s)}
          </button>
        ))}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Customer</th>
            <th>Partner</th>
            <th>Status</th>
            <th>ETA</th>
            <th>Delivered At</th>
            <th>Quality</th>
            <th>Timing</th>
            <th>Feedback</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d) => (
            <tr key={d.id}>
              <td>{d.order_number || d.order_id.toString().slice(0, 8)}</td>
              <td>{d.customer_name || '-'}</td>
              <td>{d.delivery_partner?.name || 'Unassigned'}</td>
              <td><span className={`badge badge-${d.status}`}>{formatStatus(d.status)}</span></td>
              <td>{d.estimated_time ? `${d.estimated_time}m` : '-'}</td>
              <td>{d.delivered_at ? new Date(d.delivered_at).toLocaleString() : '-'}</td>
              <td>{d.rating ? <Stars count={d.rating.quality_rating} /> : <span style={{ color: '#9ca3af' }}>-</span>}</td>
              <td>{d.rating ? <Stars count={d.rating.timing_rating} /> : <span style={{ color: '#9ca3af' }}>-</span>}</td>
              <td style={{ maxWidth: '150px', fontSize: '0.75rem', color: '#6b7280' }}>
                {d.rating?.comment || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page}</span>
        <button onClick={() => setPage(page + 1)} disabled={deliveries.length < 20}>Next</button>
      </div>
    </div>
  );
}
