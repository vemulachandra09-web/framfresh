import pytest

from ui_automation.pages.login_page import LoginPage


@pytest.mark.smoke
def test_login_form_requires_phone_and_password(page, app_url):
    login = LoginPage(page, app_url)
    login.open()
    login.submit_empty()
    login.expect_validation_errors()


@pytest.mark.smoke
@pytest.mark.e2e
def test_customer_can_login_and_view_products(page, app_url):
    login = LoginPage(page, app_url)
    login.open()
    login.login_as_customer()
    login.expect_customer_home()


@pytest.mark.smoke
@pytest.mark.e2e
def test_admin_can_login_and_view_dashboard_navigation(page, app_url):
    login = LoginPage(page, app_url)
    login.open()
    login.login_as_admin()
    login.expect_admin_dashboard()


@pytest.mark.smoke
@pytest.mark.e2e
def test_admin_can_open_customers_page(page, app_url):
    login = LoginPage(page, app_url)
    login.open()
    login.login_as_admin()
    login.expect_admin_dashboard()

    login.open_admin_customers()
    login.expect_admin_customers()
