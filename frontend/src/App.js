import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import InstallBanner from './components/InstallBanner';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Home from './pages/Home';
import Subscribe from './pages/Subscribe';
import OrderNow from './pages/OrderNow';
import Subscriptions from './pages/Subscriptions';
import Orders from './pages/Orders';
import Payment from './pages/Payment';
import TrackDelivery from './pages/TrackDelivery';
import Profile from './pages/Profile';
import Dashboard from './pages/admin/Dashboard';
import Customers from './pages/admin/Customers';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProducts from './pages/admin/AdminProducts';
import AdminDeliveries from './pages/admin/AdminDeliveries';
import Reports from './pages/admin/Reports';

export default function App() {
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  return (
    <div className="app">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <InstallBanner />
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/'} /> : <Login />} />

          {/* Customer Routes */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/subscribe/:productId" element={<ProtectedRoute><Subscribe /></ProtectedRoute>} />
          <Route path="/order/:productId" element={<ProtectedRoute><OrderNow /></ProtectedRoute>} />
          <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
          <Route path="/track/:orderId" element={<ProtectedRoute><TrackDelivery /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>} />
          <Route path="/admin/customers" element={<ProtectedRoute adminOnly><Customers /></ProtectedRoute>} />
          <Route path="/admin/subscriptions" element={<ProtectedRoute adminOnly><AdminSubscriptions /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute adminOnly><AdminOrders /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute adminOnly><AdminProducts /></ProtectedRoute>} />
          <Route path="/admin/deliveries" element={<ProtectedRoute adminOnly><AdminDeliveries /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      {user && !isAdmin && (
        <footer className="contact-footer">
          <div className="contact-inner">
            <span>Need help?</span>
            <a href="tel:8019491998" className="contact-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Call us: 8019491998
            </a>
            <a href="https://wa.me/918019491998?text=help" target="_blank" rel="noopener noreferrer" className="contact-link whatsapp-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785c-1.89 0-3.744-.508-5.37-1.468l-.386-.228-3.998 1.049 1.068-3.898-.251-.399A9.724 9.724 0 0 1 1.63 12.05C1.632 6.305 6.306 1.63 12.053 1.63c2.775 0 5.385 1.082 7.346 3.046a10.327 10.327 0 0 1 3.042 7.35c-.003 5.746-4.677 10.42-10.39 10.42zm0-22.414C5.46-.63.003 4.826 0 11.61a11.32 11.32 0 0 0 1.533 5.68L.03 23.37l6.228-1.634a11.38 11.38 0 0 0 5.44 1.384h.005c6.59 0 11.95-5.36 11.953-11.95a11.87 11.87 0 0 0-3.498-8.456A11.87 11.87 0 0 0 12.05-.63z"/></svg>
              WhatsApp Bot
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}
