import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    address: user?.address || '',
    city: user?.city || '',
    pincode: user?.pincode || '',
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      await authAPI.updateMe(form);
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Profile</h2>
        {!editing && <button className="btn-outline btn-sm" onClick={() => setEditing(true)}>Edit</button>}
      </div>

      <div className="profile-card">
        <div className="profile-avatar">
          <span>{user?.name?.charAt(0)?.toUpperCase()}</span>
        </div>
        <h3>{user?.name}</h3>
        <p className="profile-phone">📞 {user?.phone}</p>

        {editing ? (
          <div className="profile-form">
            <div className="form-group">
              <label>Name</label>
              <input name="name" value={form.name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input name="address" value={form.address} onChange={handleChange} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input name="city" value={form.city} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Pincode</label>
                <input name="pincode" value={form.pincode} onChange={handleChange} />
              </div>
            </div>
            <div className="profile-actions">
              <button className="btn-primary" onClick={handleSave}>Save</button>
              <button className="btn-outline" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="profile-info">
            {user?.email && <p>✉️ {user.email}</p>}
            {user?.address && <p>📍 {user.address}</p>}
            {user?.city && <p>🏙️ {user.city} {user.pincode}</p>}
          </div>
        )}
      </div>

      <button className="btn-danger" onClick={logout}>Logout</button>
    </div>
  );
}
