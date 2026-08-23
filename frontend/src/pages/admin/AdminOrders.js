import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { formatStatus } from '../../utils/format';
import toast from 'react-hot-toast';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    adminAPI.orders(filter, null, page).then((res) => setOrders(res.data)).catch(() => toast.error('Failed'));
  }, [filter, page]);

  return (
    <div className="page admin-page">
      <h2>Orders</h2>

      <div className="category-filters">
        <button className={!filter ? 'active' : ''} onClick={() => { setFilter(null); setPage(1); }}>All</button>
        {['pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'].map((s) => (
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
            <th>Product</th>
            <th>Delivery Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{order.order_number}</td>
              <td>{order.user?.name || '-'}</td>
              <td>{order.items?.map((i) => `${i.product?.name || 'Product'} x${i.quantity}`).join(', ') || '-'}</td>
              <td>{order.delivery_date}</td>
              <td>₹{order.total_amount}</td>
              <td><span className={`badge badge-${order.status}`}>{formatStatus(order.status)}</span></td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page}</span>
        <button onClick={() => setPage(page + 1)} disabled={orders.length < 20}>Next</button>
      </div>
    </div>
  );
}
