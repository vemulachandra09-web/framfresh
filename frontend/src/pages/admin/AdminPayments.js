import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { formatStatus } from '../../utils/format';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function paymentFor(payment) {
  if (payment.subscription_id) {
    return payment.subscription?.product?.name || 'Subscription';
  }
  return payment.order_id ? 'Order' : 'Payment';
}

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    adminAPI.payments(page)
      .then((res) => setPayments(res.data))
      .catch(() => toast.error('Failed to load payments'));
  }, [page]);

  return (
    <div className="page admin-page">
      <h2>Payments</h2>

      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Customer</th>
            <th>For</th>
            <th>Period</th>
            <th>Method</th>
            <th>Status</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td>{formatDate(payment.paid_at || payment.created_at)}</td>
              <td>{payment.user?.name || '-'}</td>
              <td>{paymentFor(payment)}</td>
              <td>
                {payment.billing_period_start
                  ? `${payment.billing_period_start} to ${payment.billing_period_end}`
                  : '-'}
              </td>
              <td>{payment.upi_provider ? payment.upi_provider.toUpperCase() : payment.payment_method.toUpperCase()}</td>
              <td><span className={`badge badge-${payment.status}`}>{formatStatus(payment.status)}</span></td>
              <td>₹{payment.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page}</span>
        <button onClick={() => setPage(page + 1)} disabled={payments.length < 20}>Next</button>
      </div>
    </div>
  );
}
