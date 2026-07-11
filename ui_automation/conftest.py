import os

import pytest


os.environ.setdefault(
    "PLAYWRIGHT_BROWSERS_PATH",
    os.path.join(os.path.dirname(__file__), ".playwright-browsers"),
)


def pytest_addoption(parser):
    parser.addoption(
        "--app-url",
        action="store",
        default=None,
        help="Base URL for the FarmFresh frontend under test.",
    )


@pytest.fixture(scope="session")
def app_url(pytestconfig):
    return (
        pytestconfig.getoption("--app-url")
        or os.getenv("UI_BASE_URL")
        or "https://framfresh-1-878z.onrender.com"
    ).rstrip("/")



@pytest.fixture(autouse=True)
def clean_browser_state(page):
    page.context.clear_cookies()
    page.goto("about:blank")
    yield
    page.evaluate("() => localStorage.clear()")
