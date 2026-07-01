import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionsAPI, paymentsAPI } from '../services/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = { active: '#16a34a', paused: '#f59e0b', cancelled: '#ef4444' };

function getDaysUsed(startDate, status, pausedFrom) {
  const start = new Date(startDate);
  const end = status === 'cancelled' || status === 'paused'
    ? (pausedFrom ? new Date(pausedFrom) : new Date())
    : new Date();
  const diff = Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  return diff;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Subscriptions() {
  const [subs, setSubs] = useState([]);
  const [pauseTarget, setPauseTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [skipTarget, setSkipTarget] = useState(null);
  const [skipDates, setSkipDates] = useState([]);
  const [pauseUntil, setPauseUntil] = useState('');
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    subscriptionsAPI.list().then((res) => setSubs(res.data)).catch(() => toast.error('Failed to load'));
  };

  useEffect(() => { load(); }, []);

  const calcBill = (sub) => {
    const days = getDaysUsed(sub.start_date, sub.status, sub.paused_from);
    const perDay = (sub.product?.price_per_day || 0) * sub.quantity;
    return { days, perDay, total: days * perDay };
  };

  const handlePause = async () => {
    if (!pauseTarget || !pauseUntil) return;
    setProcessing(true);
    try {
      const from = new Date().toISOString().split('T')[0];
      await subscriptionsAPI.pause(pauseTarget.id, { paused_from: from, paused_until: pauseUntil });
      toast.success('Subscription paused');
      setPauseTarget(null);
      setPauseUntil('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleResume = async (id) => {
    try {
      await subscriptionsAPI.resume(id);
      toast.success('Subscription resumed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setProcessing(true);
    try {
      await subscriptionsAPI.cancel(cancelTarget.id);
      toast.success('Subscription cancelled');
      setCancelTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setProcessing(false);
    }
  };

  const handlePay = async () => {
    if (!payTarget) return;
    setProcessing(true);
    try {
      const bill = calcBill(payTarget);
      await paymentsAPI.create({
        amount: bill.total,
        payment_method: 'upi',
        upi_provider: 'gpay',
        transaction_id: `SUB-TXN${Date.now()}`,
      });
      toast.success(`Payment of ₹${bill.total} successful!`);
      setPayTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddDateToList = (dateStr) => {
    if (!dateStr || skipDates.includes(dateStr)) return;
    const existing = (skipTarget?.skip_dates || []).map((s) => s.skip_date);
    if (existing.includes(dateStr)) {
      toast.error('Already skipped');
      return;
    }
    setSkipDates((prev) => [...prev, dateStr].sort());
  };

  const handleRemoveDateFromList = (dateStr) => {
    setSkipDates((prev) => prev.filter((d) => d !== dateStr));
  };

  const handleSubmitSkipDates = async () => {
    if (!skipTarget || skipDates.length === 0) return;
    setProcessing(true);
    try {
      await subscriptionsAPI.addSkipDates(skipTarget.id, skipDates);
      toast.success(`${skipDates.length} day${skipDates.length > 1 ? 's' : ''} skipped!`);
      setSkipDates([]);
      setSkipTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveSkipDate = async (subId, skipId) => {
    try {
      await subscriptionsAPI.removeSkipDate(subId, skipId);
      toast.success('Skip date removed');
      load();
    } catch (err) {
      toast.error('Failed to remove');
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const futureSkips = (sub) =>
    (sub.skip_dates || [])
      .filter((s) => new Date(s.skip_date) >= new Date(new Date().toISOString().split('T')[0]))
      .sort((a, b) => new Date(a.skip_date) - new Date(b.skip_date));

  return (
    <div className="page">
      <div className="page-header">
        <h2>My Subscriptions</h2>
        <button className="btn-primary btn-sm" onClick={() => navigate('/')}>+ New</button>
      </div>

      {subs.length === 0 ? (
        <div className="empty-state">
          <p>No subscriptions yet</p>
          <button className="btn-primary" onClick={() => navigate('/')}>Browse Plans</button>
        </div>
      ) : (
        <div className="sub-list">
          {subs.map((sub) => {
            const bill = calcBill(sub);
            const skips = futureSkips(sub);
            return (
              <div key={sub.id} className="sub-card">
                <div className="sub-header">
                  <span className="sub-badge" style={{ background: STATUS_COLORS[sub.status] }}>
                    {sub.status}
                  </span>
                  <span className="sub-cycle">{sub.billing_cycle}</span>
                </div>
                <h4>{sub.product?.name || 'Subscription'}</h4>
                <div className="sub-details">
                  <span>Qty: {sub.quantity}</span>
                  <span>From: {sub.start_date}</span>
                  {sub.product && <span>₹{sub.product.price_per_day * sub.quantity}/day</span>}
                </div>

                {sub.status !== 'cancelled' && (
                  <div className="sub-bill-summary">
                    <div className="sub-bill-row">
                      <span>Days used</span>
                      <span>{bill.days} days</span>
                    </div>
                    <div className="sub-bill-row">
                      <span>Rate</span>
                      <span>₹{bill.perDay}/day</span>
                    </div>
                    <div className="sub-bill-row sub-bill-total">
                      <span>Amount due</span>
                      <span>₹{bill.total}</span>
                    </div>
                  </div>
                )}

                {skips.length > 0 && (
                  <div className="skip-dates-list">
                    <span className="skip-label">Skipping:</span>
                    {skips.map((s) => (
                      <span key={s.id} className="skip-chip">
                        {formatDate(s.skip_date)}
                        <button onClick={() => handleRemoveSkipDate(sub.id, s.id)}>&times;</button>
                      </span>
                    ))}
                  </div>
                )}

                {sub.paused_from && (
                  <p className="sub-pause-info">Paused: {sub.paused_from} to {sub.paused_until}</p>
                )}

                <div className="sub-actions">
                  {sub.status === 'active' && (
                    <>
                      <button className="btn-primary btn-sm" onClick={() => setPayTarget(sub)}>Pay ₹{bill.total}</button>
                      <button className="btn-outline" onClick={() => setSkipTarget(sub)}>Skip Days</button>
                      <button className="btn-outline" onClick={() => setPauseTarget(sub)}>Pause</button>
                      <button className="btn-danger-outline" onClick={() => setCancelTarget(sub)}>Cancel</button>
                    </>
                  )}
                  {sub.status === 'paused' && (
                    <>
                      <button className="btn-primary btn-sm" onClick={() => setPayTarget(sub)}>Pay ₹{bill.total}</button>
                      <button className="btn-outline" onClick={() => handleResume(sub.id)}>Resume</button>
                      <button className="btn-danger-outline" onClick={() => setCancelTarget(sub)}>Cancel</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pay Modal */}
      {payTarget && (() => {
        const bill = calcBill(payTarget);
        return (
          <div className="modal-overlay" onClick={() => !processing && setPayTarget(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-icon">💳</div>
              <h3>Pay for Subscription</h3>
              <p><strong>{payTarget.product?.name}</strong></p>
              <div className="sub-bill-summary" style={{ margin: '1rem 0' }}>
                <div className="sub-bill-row"><span>Days used</span><span>{bill.days} days</span></div>
                <div className="sub-bill-row"><span>Rate</span><span>₹{bill.perDay}/day x {bill.days}</span></div>
                <div className="sub-bill-row sub-bill-total"><span>Total</span><span>₹{bill.total}</span></div>
              </div>
              <div className="modal-actions">
                <button className="btn-primary" onClick={handlePay} disabled={processing}>
                  {processing ? 'Processing...' : `Pay ₹${bill.total}`}
                </button>
                <button className="btn-outline" onClick={() => setPayTarget(null)} disabled={processing}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Skip Days Modal */}
      {skipTarget && (
        <div className="modal-overlay" onClick={() => !processing && setSkipTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🏖️</div>
            <h3>Skip Delivery Days</h3>
            <p><strong>{skipTarget.product?.name}</strong></p>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.5rem 0' }}>
              Pick dates and click Add. Submit all at once when done.
            </p>

            {futureSkips(skipTarget).length > 0 && (
              <div style={{ margin: '0.5rem 0' }}>
                <span className="skip-label">Already skipping:</span>
                <div className="skip-dates-list" style={{ marginTop: '0.3rem', justifyContent: 'center' }}>
                  {futureSkips(skipTarget).map((s) => (
                    <span key={s.id} className="skip-chip">
                      {formatDate(s.skip_date)}
                      <button onClick={() => handleRemoveSkipDate(skipTarget.id, s.id)}>&times;</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group" style={{ margin: '0.75rem 0' }}>
              <label>Pick a date</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="date"
                  min={minDate}
                  style={{ flex: 1 }}
                  onChange={(e) => {
                    handleAddDateToList(e.target.value);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {skipDates.length > 0 && (
              <div style={{ margin: '0.5rem 0' }}>
                <span className="skip-label">Selected ({skipDates.length}):</span>
                <div className="skip-dates-list" style={{ marginTop: '0.3rem', justifyContent: 'center' }}>
                  {skipDates.map((d) => (
                    <span key={d} className="skip-chip skip-chip-new">
                      {formatDate(d)}
                      <button onClick={() => handleRemoveDateFromList(d)}>&times;</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-primary" onClick={handleSubmitSkipDates} disabled={processing || skipDates.length === 0}>
                {processing ? 'Saving...' : `Skip ${skipDates.length} day${skipDates.length !== 1 ? 's' : ''}`}
              </button>
              <button className="btn-outline" onClick={() => { setSkipTarget(null); setSkipDates([]); }} disabled={processing}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {pauseTarget && (() => {
        const bill = calcBill(pauseTarget);
        return (
          <div className="modal-overlay" onClick={() => !processing && setPauseTarget(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-icon">⏸️</div>
              <h3>Pause subscription</h3>
              <p><strong>{pauseTarget.product?.name}</strong></p>
              <div className="sub-bill-summary" style={{ margin: '1rem 0' }}>
                <div className="sub-bill-row"><span>Days used so far</span><span>{bill.days} days</span></div>
                <div className="sub-bill-row sub-bill-total"><span>Amount due</span><span>₹{bill.total}</span></div>
              </div>
              <div className="form-group" style={{ margin: '1rem 0' }}>
                <label>Pause until</label>
                <input type="date" value={pauseUntil} onChange={(e) => setPauseUntil(e.target.value)} min={minDate} />
              </div>
              <div className="modal-actions">
                <button className="btn-primary" onClick={handlePause} disabled={processing || !pauseUntil}>
                  {processing ? 'Pausing...' : 'Pause subscription'}
                </button>
                <button className="btn-outline" onClick={() => { setPauseTarget(null); setPauseUntil(''); }} disabled={processing}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Cancel Modal */}
      {cancelTarget && (() => {
        const bill = calcBill(cancelTarget);
        return (
          <div className="modal-overlay" onClick={() => !processing && setCancelTarget(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-icon">⚠️</div>
              <h3>Cancel subscription</h3>
              <p>Are you sure you want to cancel <strong>{cancelTarget.product?.name}</strong>?</p>
              <div className="sub-bill-summary" style={{ margin: '1rem 0' }}>
                <div className="sub-bill-row"><span>Days used</span><span>{bill.days} days</span></div>
                <div className="sub-bill-row"><span>Rate</span><span>₹{bill.perDay}/day</span></div>
                <div className="sub-bill-row sub-bill-total"><span>Final bill to pay</span><span>₹{bill.total}</span></div>
              </div>
              <p className="modal-sub">You will need to pay ₹{bill.total} for {bill.days} days of usage.</p>
              <div className="modal-actions">
                <button className="btn-danger" onClick={handleCancel} disabled={processing}>
                  {processing ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
                <button className="btn-outline" onClick={() => setCancelTarget(null)} disabled={processing}>Keep subscription</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
