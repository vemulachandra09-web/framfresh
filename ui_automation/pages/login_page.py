from playwright.sync_api import Page, expect


CUSTOMER_PHONE = "9123456789"
ADMIN_PHONE = "9999999999"
DEFAULT_PASSWORD = "Admin@123"


class LoginPage:
    def __init__(self, page: Page, app_url: str):
        self.page = page
        self.app_url = app_url
        self.phone_input = page.locator('input[name="phone"]')
        self.password_input = page.locator('input[name="password"]')
        self.submit_button = page.locator('button[type="submit"]').first

    def open(self):
        self.page.goto(f"{self.app_url}/", wait_until="domcontentloaded")
        self.expect_loaded()

    def expect_loaded(self):
        expect(self.phone_input).to_be_visible(timeout=15000)
        expect(self.password_input).to_be_visible(timeout=15000)
        expect(self.submit_button).to_be_visible(timeout=15000)

    def submit_empty(self):
        self.submit_button.click()

    def login(self, phone: str, password: str):
        self.phone_input.fill(phone)
        self.password_input.fill(password)
        self.submit_button.click()
        self.page.wait_for_load_state("networkidle", timeout=30000)

    def login_as_customer(self):
        self.login(CUSTOMER_PHONE, DEFAULT_PASSWORD)

    def login_as_admin(self):
        self.login(ADMIN_PHONE, DEFAULT_PASSWORD)

    def expect_validation_errors(self):
        expect(self.page.get_by_text("Phone number is required")).to_be_visible()
        expect(self.page.get_by_text("Password is required")).to_be_visible()

    def expect_customer_home(self):
        expect(self.page).to_have_url(self.app_url + "/", timeout=30000)
        expect(self.page.get_by_text("Choose Your Plan")).to_be_visible(timeout=30000)
        expect(self.page.locator('input[type="text"]').first).to_be_visible(timeout=30000)

    def expect_admin_dashboard(self):
        expect(self.page).to_have_url(self.app_url + "/admin", timeout=30000)
        expect(self.page.get_by_role("link", name="Dashboard")).to_be_visible(timeout=30000)
        expect(self.page.get_by_role("link", name="Customers")).to_be_visible(timeout=30000)
        expect(self.page.get_by_role("link", name="Products")).to_be_visible(timeout=30000)

    def open_admin_customers(self):
        self.page.get_by_role("link", name="Customers").click()

    def expect_admin_customers(self):
        expect(self.page).to_have_url(self.app_url + "/admin/customers", timeout=30000)
        expect(self.page.get_by_role("link", name="Customers")).to_be_visible(timeout=30000)
