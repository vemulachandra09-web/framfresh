-- FarmFresh - Seed Data

-- Default admin user (password: Admin@123)
INSERT INTO users (name, phone, email, password_hash, role) VALUES
('Admin', '9999999999', 'admin@farmfresh.in', '$2b$12$SOdMlXmwdDv4fWYjTxc84.Bc.vZnUuehz6ewX5uoAbvMETiGaKhGK', 'admin');

-- Sample delivery partners (password: Admin@123)
INSERT INTO users (name, phone, email, password_hash, role, is_active) VALUES
('Sathish Kumar', '9876543210', 'sathish@farmfresh.in', '$2b$12$SOdMlXmwdDv4fWYjTxc84.Bc.vZnUuehz6ewX5uoAbvMETiGaKhGK', 'delivery_partner', TRUE),
('Rajesh Singh', '9876543211', 'rajesh@farmfresh.in', '$2b$12$SOdMlXmwdDv4fWYjTxc84.Bc.vZnUuehz6ewX5uoAbvMETiGaKhGK', 'delivery_partner', TRUE);

-- Sample customers (password: Admin@123)
INSERT INTO users (name, phone, email, password_hash, address, city, pincode) VALUES
('Ramesh Kumar', '9123456789', 'ramesh@gmail.com', '$2b$12$SOdMlXmwdDv4fWYjTxc84.Bc.vZnUuehz6ewX5uoAbvMETiGaKhGK', '123 MG Road', 'Bangalore', '560001'),
('Suresh Babu', '9123456790', 'suresh@gmail.com', '$2b$12$SOdMlXmwdDv4fWYjTxc84.Bc.vZnUuehz6ewX5uoAbvMETiGaKhGK', '456 Brigade Road', 'Bangalore', '560025'),
('Anita Sharma', '9123456791', 'anita@gmail.com', '$2b$12$SOdMlXmwdDv4fWYjTxc84.Bc.vZnUuehz6ewX5uoAbvMETiGaKhGK', '789 Koramangala', 'Bangalore', '560034');

-- Products
INSERT INTO products (name, description, category, quantity_ml, price_per_day, is_available) VALUES
('Fresh Cow Milk 250ml', 'Pure farm-fresh cow milk, 250ml pack', 'milk', 250, 12.00, TRUE),
('Fresh Cow Milk 500ml', 'Pure farm-fresh cow milk, 500ml pack', 'milk', 500, 20.00, TRUE),
('Fresh Cow Milk 1L', 'Pure farm-fresh cow milk, 1 litre pack', 'milk', 1000, 36.00, TRUE),
('Fresh Cow Milk 2L', 'Pure farm-fresh cow milk, 2 litre pack', 'milk', 2000, 70.00, TRUE),
('Fresh Curd 500ml', 'Homemade fresh curd, 500ml', 'curd', 500, 25.00, TRUE),
('Fresh Paneer 200g', 'Soft and fresh paneer, 200g', 'paneer', 200, 60.00, TRUE),
('Pure Ghee 500ml', 'Traditional pure cow ghee, 500ml', 'ghee', 500, 350.00, TRUE),
('Farm Eggs (6 pack)', 'Fresh farm eggs, pack of 6', 'eggs', 6, 42.00, TRUE);

-- App settings
INSERT INTO app_settings (key, value, description) VALUES
('delivery_charge', '0', 'Delivery charge per order'),
('min_order_amount', '0', 'Minimum order amount'),
('delivery_start_time', '05:00', 'Daily delivery start time'),
('delivery_end_time', '08:00', 'Daily delivery end time'),
('whatsapp_enabled', 'true', 'Enable WhatsApp notifications'),
('business_name', 'FarmFresh Dairy', 'Business display name'),
('business_phone', '9999999999', 'Business contact number');
