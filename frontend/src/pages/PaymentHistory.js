import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { paymentsAPI } from '../services/api';
import { formatStatus } from '../utils/format';

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

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    paymentsAPI.list()
      .then((res) => setPayments(res.data))
      .catch(() => toast.error('Failed to load payments'));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Payment History</h2>
      </div>

      {payments.length === 0 ? (
        <div className="empty-state"><p>No payments found</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
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
      )}
    </div>
  );
}
