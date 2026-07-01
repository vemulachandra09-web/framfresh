import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { productsAPI } from '../services/api';
import toast from 'react-hot-toast';

const CATEGORY_ICONS = { milk: '🥛', curd: '🍶', paneer: '🧀', ghee: '🫙', eggs: '🥚' };

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    productsAPI.list(filter).then((res) => setProducts(res.data)).catch(() => toast.error('Failed to load products'));
  }, [filter]);

  const categories = ['milk', 'curd', 'paneer', 'ghee', 'eggs'];

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="hero-banner">
        <div className="hero-content">
          <h2>Hello, {user?.name?.split(' ')[0]} 👋</h2>
          <p>Fresh Milk Delivered Daily From Our Farm to Your Home</p>
        </div>
      </div>

      <section className="section">
        <h3>Choose Your Plan</h3>

        <div className="search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button className="search-clear" onClick={() => setSearch('')}>&times;</button>}
        </div>

        <div className="category-filters">
          <button className={!filter ? 'active' : ''} onClick={() => setFilter(null)}>All</button>
          {categories.map((cat) => (
            <button key={cat} className={filter === cat ? 'active' : ''} onClick={() => setFilter(cat)}>
              {CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {filtered.length === 0 && search ? (
            <p style={{ color: '#6b7280', textAlign: 'center', gridColumn: '1/-1', padding: '2rem 0' }}>No products found for "{search}"</p>
          ) : null}
          {filtered.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-icon">{CATEGORY_ICONS[product.category] || '📦'}</div>
              <div className="product-info">
                <h4>{product.name}</h4>
                <p className="product-qty">
                  {product.category === 'eggs' ? `${product.quantity_ml} pcs` : product.quantity_ml >= 1000 ? `${product.quantity_ml / 1000}L` : `${product.quantity_ml}ml`}
                </p>
                <p className="product-price">₹{product.price_per_day}/day</p>
                {product.category === 'milk' && (
                  <p className="product-monthly">₹{(product.price_per_day * 30).toFixed(0)}/month</p>
                )}
              </div>
              <div className="product-actions">
                <button className="btn-order" onClick={() => navigate('/order/' + product.id)}>
                  Order
                </button>
                <button className="btn-subscribe-text" onClick={() => navigate('/subscribe/' + product.id)}>
                  Subscribe
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section features">
        <h3>Why FarmFresh?</h3>
        <div className="feature-grid">
          <div className="feature-item">
            <span>🌿</span>
            <div><strong>Fresh from Farm</strong><br />To your home</div>
          </div>
          <div className="feature-item">
            <span>✅</span>
            <div><strong>Hygienic & Pure</strong><br />100% Pure</div>
          </div>
          <div className="feature-item">
            <span>🚚</span>
            <div><strong>On-time Delivery</strong><br />Every morning</div>
          </div>
          <div className="feature-item">
            <span>💚</span>
            <div><strong>Healthy Family</strong><br />Happy Family</div>
          </div>
        </div>
      </section>
    </div>
  );
}
