import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI } from '../services/api';
import { FiHome, FiShoppingBag, FiUser, FiMenu, FiX, FiLogOut, FiGrid, FiBell } from 'react-icons/fi';

const NOTIF_ICONS = { delivery: '🚚', payment: '💳', subscription: '📋', reminder: '⏰', order: '🛒' };

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const fetchCount = () => {
      notificationsAPI.unreadCount().then((res) => setUnread(res.data.count)).catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const openNotifs = async () => {
    if (showNotifs) { setShowNotifs(false); return; }
    try {
      const res = await notificationsAPI.list();
      setNotifs(res.data);
      setShowNotifs(true);
    } catch { }
  };

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  const handleMarkAllRead = async () => {
    await notificationsAPI.markAllRead();
    setUnread(0);
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      await notificationsAPI.markRead(notif.id);
      setUnread((c) => Math.max(0, c - 1));
      setNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    setShowNotifs(false);
    if (isAdmin) {
      if (notif.type === 'delivery') navigate('/admin/deliveries');
      else if (notif.type === 'order') navigate('/admin/orders');
      else if (notif.type === 'payment') navigate('/admin/orders');
      else if (notif.type === 'subscription') navigate('/admin/subscriptions');
    } else {
      if (notif.type === 'delivery') navigate('/orders');
      else if (notif.type === 'payment') navigate('/orders');
      else if (notif.type === 'subscription') navigate('/subscriptions');
    }
  };

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          <span className="brand-icon">🐄</span>
          <span>FarmFresh</span>
        </Link>

        <div className="navbar-right">
          <div className="notif-wrapper" ref={dropdownRef}>
            <button className="notif-bell" onClick={openNotifs}>
              <FiBell size={20} />
              {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
            </button>

            {showNotifs && (
              <div className="notif-dropdown">
                <div className="notif-header">
                  <strong>Notifications</strong>
                  {unread > 0 && (
                    <button className="notif-mark-all" onClick={handleMarkAllRead}>Mark all read</button>
                  )}
                </div>
                {notifs.length === 0 ? (
                  <div className="notif-empty">No notifications yet</div>
                ) : (
                  <div className="notif-list">
                    {notifs.map((n) => (
                      <div
                        key={n.id}
                        className={`notif-item ${!n.is_read ? 'notif-unread' : ''}`}
                        onClick={() => handleNotifClick(n)}
                      >
                        <span className="notif-icon">{NOTIF_ICONS[n.type] || '🔔'}</span>
                        <div className="notif-body">
                          <p className="notif-title">{n.title}</p>
                          <p className="notif-msg">{n.message}</p>
                          <span className="notif-time">{timeAgo(n.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {isAdmin ? (
            <>
              <Link to="/admin" onClick={closeMenu} className={isActive('/admin') ? 'active' : ''}>Dashboard</Link>
              <Link to="/admin/customers" onClick={closeMenu} className={isActive('/admin/customers') ? 'active' : ''}>Customers</Link>
              <Link to="/admin/subscriptions" onClick={closeMenu} className={isActive('/admin/subscriptions') ? 'active' : ''}>Subscriptions</Link>
              <Link to="/admin/orders" onClick={closeMenu} className={isActive('/admin/orders') ? 'active' : ''}>Orders</Link>
              <Link to="/admin/products" onClick={closeMenu} className={isActive('/admin/products') ? 'active' : ''}>Products</Link>
              <Link to="/admin/deliveries" onClick={closeMenu} className={isActive('/admin/deliveries') ? 'active' : ''}>Delivery</Link>
              <Link to="/admin/reports" onClick={closeMenu} className={isActive('/admin/reports') ? 'active' : ''}>Reports</Link>
            </>
          ) : (
            <>
              <Link to="/" onClick={closeMenu} className={isActive('/') ? 'active' : ''}>Home</Link>
              <Link to="/subscriptions" onClick={closeMenu} className={isActive('/subscriptions') ? 'active' : ''}>Subscriptions</Link>
              <Link to="/orders" onClick={closeMenu} className={isActive('/orders') ? 'active' : ''}>Orders</Link>
              <Link to="/profile" onClick={closeMenu} className={isActive('/profile') ? 'active' : ''}>Profile</Link>
            </>
          )}
          <button className="btn-logout" onClick={handleLogout}>
            <FiLogOut /> Logout
          </button>
        </div>
      </nav>

      {!isAdmin && (
        <div className="bottom-tabs">
          <Link to="/" className={`tab ${isActive('/') ? 'active' : ''}`}>
            <FiHome size={20} /><span>Home</span>
          </Link>
          <Link to="/orders" className={`tab ${isActive('/orders') ? 'active' : ''}`}>
            <FiShoppingBag size={20} /><span>Orders</span>
          </Link>
          <Link to="/subscriptions" className={`tab ${isActive('/subscriptions') ? 'active' : ''}`}>
            <FiGrid size={20} /><span>Subscription</span>
          </Link>
          <Link to="/profile" className={`tab ${isActive('/profile') ? 'active' : ''}`}>
            <FiUser size={20} /><span>Profile</span>
          </Link>
        </div>
      )}
    </>
  );
}
