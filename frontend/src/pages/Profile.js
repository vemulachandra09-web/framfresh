import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const SUPPORTED_PINCODE = '515411';
const UNSUPPORTED_PINCODE_MESSAGE = `Sorry, we currently deliver only in pincode ${SUPPORTED_PINCODE}.`;

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name' || name === 'city') {
      setForm({ ...form, [name]: value.replace(/[^A-Za-z ]/g, '').slice(0, 50) });
    } else if (name === 'address') {
      setForm({ ...form, address: value.slice(0, 200) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSave = async () => {

    if (!form.name.trim()) {
      return toast.error("Name is required");
    }

    if (form.name.length > 50) {
      return toast.error("Name cannot exceed 50 characters");
    }

    if (!/^[A-Za-z ]+$/.test(form.name)) {
      return toast.error("Name should contain only letters");
    }

    if (!form.email.trim()) {
      return toast.error("Email is required");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return toast.error("Invalid email");
    }

    if (!form.address.trim()) {
      return toast.error("Address is required");
    }

    if (form.address.trim().length < 5) {
      return toast.error("Address must be at least 5 characters");
    }

    if (form.address.length > 200) {
      return toast.error("Address is too long");
    }

    if (!form.city.trim()) {
      return toast.error("City is required");
    }

    if (!/^[A-Za-z ]+$/.test(form.city)) {
      return toast.error("Invalid city");
    }

    if (!/^[1-9][0-9]{5}$/.test(form.pincode)) {
      return toast.error("Enter valid 6 digit pincode");
    }

    if (form.pincode !== SUPPORTED_PINCODE) {
      return toast.error(UNSUPPORTED_PINCODE_MESSAGE);
    }
    try {
      await authAPI.updateMe(form);
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => d.msg || d.message || JSON.stringify(d)).join(', ')
        : detail || 'Failed to update';
      toast.error(msg);
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
              <input name="name" maxLength={50} value={form.name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input
                name="address"
                maxLength={200}
                value={form.address}
                onChange={handleChange}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  name="city"
                  maxLength={50}
                  value={form.city}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Pincode</label>
                <input
                  name="pincode"
                  maxLength={6}
                  value={form.pincode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setForm({ ...form, pincode: value });
                  }}
                />
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
