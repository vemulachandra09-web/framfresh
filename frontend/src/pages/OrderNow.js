import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsAPI, ordersAPI } from '../services/api';
import toast from 'react-hot-toast';

const CATEGORY_ICONS = { milk: '🥛', curd: '🍶', paneer: '🧀', ghee: '🫙', eggs: '🥚' };

export default function OrderNow() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    productsAPI.get(productId).then((res) => setProduct(res.data)).catch(() => toast.error('Product not found'));
  }, [productId]);

  const total = product ? (product.price_per_day * quantity).toFixed(0) : 0;

  const handleOrder = async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.create({
        product_id: productId,
        quantity,
        delivery_date: deliveryDate,
      });
      toast.success('Order placed!');
      navigate('/payment', { state: { amount: Number(total), orderId: res.data.id } });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (!product) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>←</button>
        <h2>Order Now</h2>
      </div>

      <div className="subscription-card">
        <div className="sub-product">
          <span className="sub-icon">{CATEGORY_ICONS[product.category] || '📦'}</span>
          <div>
            <h3>{product.name}</h3>
            <p>{product.category === 'eggs' ? `${product.quantity_ml} pcs` : product.quantity_ml >= 1000 ? `${product.quantity_ml / 1000}L` : `${product.quantity_ml}ml`}</p>
          </div>
        </div>

        <div className="form-group">
          <label>Delivery Date</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="form-group">
          <label>Quantity</label>
          <div className="qty-selector">
            <button type="button" onClick={() => quantity > 1 && setQuantity(quantity - 1)}>−</button>
            <span>{quantity}</span>
            <button type="button" onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>
        </div>

        <div className="bill-summary">
          <div className="bill-row">
            <span>Unit Price</span>
            <span>₹{product.price_per_day}/unit</span>
          </div>
          <div className="bill-row">
            <span>Quantity</span>
            <span>x {quantity}</span>
          </div>
          <div className="bill-row total">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
        </div>

        <button className="btn-primary btn-pay" onClick={handleOrder} disabled={loading}>
          {loading ? 'Placing Order...' : `Place Order & Pay ₹${total}`}
        </button>
      </div>
    </div>
  );
}
