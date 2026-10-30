# Setup

One-time setup to get the dashboard running locally.

## 1. Install prerequisites

- Node.js (v20+)
- Python 3.9+
- PostgreSQL 16

**Mac** (with Homebrew):
```
brew install node python@3.11 postgresql@16
brew services start postgresql@16
```

**Windows**:
- Node.js: download and run the installer from https://nodejs.org (LTS version)
- Python: download and run the installer from https://python.org/downloads
  (check "Add python.exe to PATH" during install)
- PostgreSQL 16: download and run the installer from
  https://www.postgresql.org/download/windows/
  - Remember the password you set for the `postgres` superuser during install
  - The installer starts the Postgres service automatically; it also installs
    `pgAdmin`, which isn't required but can help if you'd rather restore the
    database visually instead of via command line (see step 3)
  - Make sure `C:\Program Files\PostgreSQL\16\bin` is on your PATH so `psql`,
    `createdb`, and `pg_restore` work from any terminal (the installer usually
    does this automatically — if `createdb` isn't recognized in step 3, add that
    folder to PATH manually via System Properties → Environment Variables)

## 2. Clone the repo

```
git clone https://github.com/FintuneSO/Dashboard.git
cd Dashboard
```

(Same command on Mac and Windows.)

## 3. Restore the database

You should have received a `fintune_dashboard.dump` file separately. Put it in the
`Dashboard` folder, then run:

**Mac**:
```
createdb fintune_dashboard
pg_restore -d fintune_dashboard fintune_dashboard.dump
```

**Windows**: Postgres on Windows usually requires a username/password since there's
no peer-auth trust like Mac/Linux. Use the `postgres` superuser and the password you
set during install:
```
createdb -U postgres fintune_dashboard
pg_restore -U postgres -d fintune_dashboard fintune_dashboard.dump
```
(It will prompt for the password each time — that's expected.)

## 4. Set up and start the backend

In one terminal window:

**Mac**:
```
cd api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Windows** (PowerShell):
```
cd api
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```
(If `Activate.ps1` is blocked by execution policy, run PowerShell as Administrator
once and execute `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, then retry.)

Leave this running. It serves the API on `http://localhost:8000`.

**Windows only — one required code change**: `api/main.py` connects to Postgres with
`DB_DSN = "dbname=fintune_dashboard"`, which relies on Mac/Linux's passwordless local
trust auth. On Windows this will fail to connect. Open `api/main.py` and change that
line to include the username and password you set in step 1, e.g.:
```python
DB_DSN = "dbname=fintune_dashboard user=postgres password=YOUR_PASSWORD_HERE"
```

## 5. Set up and start the frontend

In a **second** terminal window:

```
cd dashboard
npm install
npm run dev
```

(Same commands on Mac and Windows.) Leave this running too. It serves the app on
`http://localhost:5173`.

## 6. Open it

Go to `http://localhost:5173` in your browser.

---

## Every time after the first setup

You don't need to repeat steps 1-3 or reinstall dependencies.

**Mac**:
```
brew services start postgresql@16   # if it's not already running

# terminal 1
cd Dashboard/api
source venv/bin/activate
uvicorn main:app --reload

# terminal 2
cd Dashboard/dashboard
npm run dev
```

**Windows**: Postgres runs as a Windows service and starts automatically on boot, so
usually nothing extra is needed there.
```
# terminal 1
cd Dashboard\api
venv\Scripts\Activate.ps1
uvicorn main:app --reload

# terminal 2
cd Dashboard\dashboard
npm run dev
```

## Troubleshooting

- **"Failed to fetch" / no data showing**: the backend isn't running, or isn't connected
  to the database. Check terminal 1 for errors.
- **`pg_restore` fails with connection/auth errors**: make sure Postgres is running, and
  on Windows make sure you're passing `-U postgres` and the right password.
- **`createdb`/`pg_restore` not recognized (Windows)**: the Postgres `bin` folder isn't
  on your PATH — see step 1.
- **Backend can't connect to the database at all (Windows)**: you likely still have the
  default `DB_DSN` from `main.py` — see the Windows note under step 4.
- **Port already in use**: something else is already running on 8000 or 5173. Stop it,
  or Vite will auto-pick the next free port (5174, etc.) — if so, the frontend may
  complain it can't reach the API; just use whatever port Vite printed.
