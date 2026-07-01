import React, { useEffect, useState } from 'react';
import { productsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['milk', 'curd', 'paneer', 'ghee', 'eggs'];

const emptyForm = { name: '', category: 'milk', quantity_ml: '', price_per_day: '', description: '', image_url: '' };

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    productsAPI.list().then((res) => setProducts(res.data)).catch(() => toast.error('Failed'));
  };

  useEffect(() => { load(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Product name is required');
    if (!form.quantity_ml || Number(form.quantity_ml) <= 0) return toast.error('Enter valid quantity');
    if (!form.price_per_day || Number(form.price_per_day) <= 0) return toast.error('Enter valid price');
    setSaving(true);
    try {
      await productsAPI.create({
        ...form,
        quantity_ml: Number(form.quantity_ml),
        price_per_day: Number(form.price_per_day),
      });
      toast.success('Product added');
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add product');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await productsAPI.delete(deleteTarget.id);
      toast.success('Product removed');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h2>Products</h2>
        <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {showForm && (
        <form className="add-product-form" onSubmit={handleAdd}>
          <div className="form-row">
            <div className="form-group">
              <label>Name <span className="required">*</span></label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Fresh Cow Milk 500ml" />
            </div>
            <div className="form-group">
              <label>Category <span className="required">*</span></label>
              <select name="category" value={form.category} onChange={handleChange}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{form.category === 'eggs' ? 'Quantity (pcs)' : 'Quantity (ml)'} <span className="required">*</span></label>
              <input name="quantity_ml" type="number" value={form.quantity_ml} onChange={handleChange} placeholder={form.category === 'eggs' ? 'e.g. 6' : 'e.g. 500'} />
            </div>
            <div className="form-group">
              <label>Price/Day (₹) <span className="required">*</span></label>
              <input name="price_per_day" type="number" step="0.01" value={form.price_per_day} onChange={handleChange} placeholder="e.g. 25" />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <input name="description" value={form.description} onChange={handleChange} placeholder="Optional description" />
          </div>
          <button type="submit" className="btn-primary btn-sm" disabled={saving}>
            {saving ? 'Adding...' : 'Add Product'}
          </button>
        </form>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Price/Day</th>
            <th>Available</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.category}</td>
              <td>{p.category === 'eggs' ? `${p.quantity_ml} pcs` : p.quantity_ml >= 1000 ? `${p.quantity_ml / 1000}L` : `${p.quantity_ml}ml`}</td>
              <td>₹{p.price_per_day}</td>
              <td><span className={`badge ${p.is_available ? 'badge-active' : 'badge-cancelled'}`}>{p.is_available ? 'Yes' : 'No'}</span></td>
              <td>
                <button className="btn-danger-sm" onClick={() => setDeleteTarget(p)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">⚠️</div>
            <h3>Delete Product</h3>
            <p>Are you sure you want to remove <strong>"{deleteTarget.name}"</strong> from products?</p>
            <p className="modal-sub">This will make the product unavailable for customers.</p>
            <div className="modal-actions">
              <button className="btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button className="btn-outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
