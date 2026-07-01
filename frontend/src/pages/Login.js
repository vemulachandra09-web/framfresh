import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', password: '', email: '', address: '', city: '', pincode: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setForm({ ...form, phone: digits });
    } else if (name === 'pincode') {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      setForm({ ...form, pincode: digits });
    } else {
      setForm({ ...form, [name]: value });
    }
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const validate = () => {
    const errs = {};
    if (isRegister) {
      if (!form.name.trim()) errs.name = 'Name is required';
      else if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address';
      if (form.pincode && !/^\d{6}$/.test(form.pincode)) errs.pincode = 'Pincode must be 6 digits';
    }
    if (!form.phone) errs.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(form.phone)) errs.phone = 'Phone number must be exactly 10 digits';
    if (!form.password) errs.password = 'Password is required';
    else if (isRegister) {
      if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
      else if (!/[A-Z]/.test(form.password)) errs.password = 'Must contain an uppercase letter';
      else if (!/[a-z]/.test(form.password)) errs.password = 'Must contain a lowercase letter';
      else if (!/[0-9]/.test(form.password)) errs.password = 'Must contain a number';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      if (isRegister) {
        await register(form);
        toast.success('Account created!', { duration: 3000 });
      } else {
        await login(form.phone, form.password);
        toast.success('Welcome back!', { duration: 3000 });
      }
      navigate('/');
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg = 'Something went wrong';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((d) => d.msg || d.message || JSON.stringify(d)).join(', ');
      }
      toast.error(msg, { duration: 4000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="brand-icon-lg">🐄</span>
          <h1>FarmFresh</h1>
          <p>Fresh Milk. Pure Health. Daily to Your Doorstep.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <>
              <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
                <label>Full Name <span className="required">*</span></label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Enter your name" />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>
              <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
                <label>Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="your@email.com" />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
            </>
          )}

          <div className={`form-group ${errors.phone ? 'has-error' : ''}`}>
            <label>Phone Number <span className="required">*</span></label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="10-digit mobile number" inputMode="numeric" maxLength={10} />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </div>

          <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
            <label>Password <span className="required">*</span></label>
            <div className="password-wrapper">
              <input name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} placeholder={isRegister ? 'Min 8 chars, A-Z, a-z, 0-9' : 'Enter password'} />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          {isRegister && (
            <>
              <div className="form-group">
                <label>Address</label>
                <input name="address" value={form.address} onChange={handleChange} placeholder="Delivery address" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input name="city" value={form.city} onChange={handleChange} placeholder="City" />
                </div>
                <div className={`form-group ${errors.pincode ? 'has-error' : ''}`}>
                  <label>Pincode</label>
                  <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="6-digit pincode" inputMode="numeric" maxLength={6} />
                  {errors.pincode && <span className="field-error">{errors.pincode}</span>}
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Login'}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          <button onClick={() => { setIsRegister(!isRegister); setErrors({}); }} className="btn-link">
            {isRegister ? 'Login' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}
