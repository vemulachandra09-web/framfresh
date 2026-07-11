# FarmFresh UI Automation

Python UI automation for the FarmFresh React app using pytest and Playwright.

## Install

```powershell
python -m venv .venv-ui
.\.venv-ui\Scripts\Activate.ps1
python -m pip install -r ui_automation\requirements.txt
$env:PLAYWRIGHT_BROWSERS_PATH = "D:\farmfresh.updated\ui_automation\.playwright-browsers"
python -m playwright install chromium
```

## Run The App

By default, the tests run against the deployed app:

```text
https://framfresh-1-878z.onrender.com
```

To test local changes instead, start the FarmFresh stack first:

```powershell
docker-compose up --build
```

Override the target URL when needed:

```powershell
$env:UI_BASE_URL = "http://localhost:3000"
python -m pytest ui_automation
```

Or pass it directly:

```powershell
python -m pytest ui_automation --app-url https://framfresh-1-878z.onrender.com
```

If you see `Executable doesn't exist` from Playwright, install the browser once:

```powershell
cd D:\farmfresh.updated
.\ui_automation\.venv\Scripts\Activate.ps1
$env:PLAYWRIGHT_BROWSERS_PATH = "D:\farmfresh.updated\ui_automation\.playwright-browsers"
python -m playwright install chromium
pytest ui_automation\tests\test_login_smoke.py
```

Run only smoke tests:

```powershell
python -m pytest -m smoke ui_automation
```

## Default Test Users

- Admin: `9999999999` / `Admin@123`
- Customer: `9123456789` / `Admin@123`

These credentials come from the seeded development data.
