import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    adminAPI.customers(page).then((res) => setCustomers(res.data)).catch(() => toast.error('Failed'));
  }, [page]);

  return (
    <div className="page admin-page">
      <h2>Customers</h2>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>City</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.phone}</td>
              <td>{c.email || '-'}</td>
              <td>{c.city || '-'}</td>
              <td><span className={`badge ${c.is_active ? 'badge-active' : 'badge-cancelled'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page}</span>
        <button onClick={() => setPage(page + 1)} disabled={customers.length < 20}>Next</button>
      </div>
    </div>
  );
}
