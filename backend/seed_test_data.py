import random
import string
import uuid
from datetime import date, datetime, timedelta
import psycopg2

conn = psycopg2.connect(dbname="farmfresh", user="postgres", password="1234", host="localhost")
cur = conn.cursor()

cur.execute("SELECT id FROM users WHERE role='customer'")
customers = [r[0] for r in cur.fetchall()]

cur.execute("SELECT id FROM users WHERE role='delivery_partner'")
partners = [r[0] for r in cur.fetchall()]

cur.execute("SELECT id, price_per_day FROM products WHERE category='milk'")
milk_products = cur.fetchall()

today = date.today()
orders_created = 0
payments_created = 0

for cust_id in customers:
    prod_id, price = random.choice(milk_products)
    for day_offset in range(30, 0, -1):
        d = today - timedelta(days=day_offset)
        order_num = "FF-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
        order_id = str(uuid.uuid4())
        total = float(price)

        status = "delivered" if day_offset > 1 else random.choice(["confirmed", "out_for_delivery"])

        cur.execute(
            "INSERT INTO orders (id, order_number, user_id, delivery_date, total_amount, status, created_at) VALUES (%s,%s,%s,%s,%s,%s,%s)",
            (order_id, order_num, str(cust_id), d, total, status, datetime(d.year, d.month, d.day, 5, 30)),
        )

        cur.execute(
            "INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price) VALUES (%s,%s,%s,1,%s,%s)",
            (str(uuid.uuid4()), order_id, str(prod_id), total, total),
        )

        partner = random.choice(partners)
        del_status = "delivered" if status == "delivered" else "on_the_way"
        delivered_at = datetime(d.year, d.month, d.day, 6, random.randint(0, 59)) if del_status == "delivered" else None
        cur.execute(
            "INSERT INTO deliveries (id, order_id, delivery_partner_id, status, estimated_time, delivered_at, created_at) VALUES (%s,%s,%s,%s,%s,%s,%s)",
            (str(uuid.uuid4()), order_id, str(partner), del_status, random.randint(10, 25), delivered_at, datetime(d.year, d.month, d.day, 5, 0)),
        )

        if status == "delivered":
            cur.execute(
                "INSERT INTO payments (id, user_id, order_id, amount, payment_method, upi_provider, transaction_id, status, paid_at, created_at) VALUES (%s,%s,%s,%s,'upi',%s,%s,'success',%s,%s)",
                (str(uuid.uuid4()), str(cust_id), order_id, total, random.choice(["gpay", "phonepe", "paytm"]),
                 "TXN" + "".join(random.choices(string.digits, k=10)),
                 datetime(d.year, d.month, d.day, 7, random.randint(0, 59)),
                 datetime(d.year, d.month, d.day, 7, 0)),
            )
            payments_created += 1
        orders_created += 1

# Today's active orders
for cust_id in customers:
    prod_id, price = random.choice(milk_products)
    order_num = "FF-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    order_id = str(uuid.uuid4())
    total = float(price)
    cur.execute(
        "INSERT INTO orders (id, order_number, user_id, delivery_date, total_amount, status) VALUES (%s,%s,%s,%s,%s,'out_for_delivery')",
        (order_id, order_num, str(cust_id), today, total),
    )
    cur.execute(
        "INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price) VALUES (%s,%s,%s,1,%s,%s)",
        (str(uuid.uuid4()), order_id, str(prod_id), total, total),
    )
    partner = random.choice(partners)
    cur.execute(
        "INSERT INTO deliveries (id, order_id, delivery_partner_id, status, estimated_time) VALUES (%s,%s,%s,'on_the_way',%s)",
        (str(uuid.uuid4()), order_id, str(partner), random.randint(10, 20)),
    )
    orders_created += 1

conn.commit()
cur.close()
conn.close()
print(f"Created {orders_created} orders, {payments_created} payments")
