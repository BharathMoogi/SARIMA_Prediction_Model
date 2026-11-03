# Monthly Price Forecasting System

A full-stack, production-ready time-series forecasting web application built with **Next.js**, **Django REST Framework**, and **Statsmodels SARIMA**. The system forecasts monthly prices 12 months into the future with 95% confidence intervals based on 20+ years of historical data.

---

## Table of Contents
- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Dataset Specifications](#dataset-specifications)
- [Machine Learning & Model Design](#machine-learning--model-design)
- [Model Evaluation Methodology](#model-evaluation-methodology)
- [REST API Reference](#rest-api-reference)
- [Screenshots & UI Showcase](#screenshots--ui-showcase)
- [Project Structure](#project-structure)
- [Installation & Setup (Windows PowerShell)](#installation--setup-windows-powershell)
- [License & Authors](#license--authors)

---

## Project Overview

### Problem Statement
Accurate monthly price forecasting is critical for financial planning, supply chain budgeting, and inventory risk management. Monthly economic and commodity time series often exhibit non-stationary trends and strong annual seasonality (12-month cyclical patterns), making simple linear models or unconstrained ML models prone to overfitting and poor out-of-sample extrapolation.

### Objective
This project builds an end-to-end forecasting pipeline that:
1. Ingests and standardizes 249 monthly price observations spanning from **January 2005 through September 2025**.
2. Deploys a verified **SARIMA(0, 1, 2) × (0, 0, 1)₁₂** statistical model to generate 12-month future forecasts from **October 2025 through September 2026**.
3. Quantifies forecast uncertainty using **95% confidence intervals**.
4. Delivers an interactive, responsive analytics dashboard built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Recharts**.

---

## System Architecture

The application adopts a decoupled client-server architecture:

```
┌────────────────────────────────────────────────────────┐
│               Frontend: Next.js 16 (App Router)        │
│    TypeScript • Tailwind CSS • Recharts • Lucide React │
│             Runs on: http://localhost:3000             │
└───────────────────────────▲────────────────────────────┘
                            │ REST / JSON (CORS enabled)
┌───────────────────────────▼────────────────────────────┐
│          Backend: Django 5 + Django REST Framework     │
│       SQLite Database • Environment Variables (.env)   │
│             Runs on: http://127.0.0.1:8000             │
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│      Time-Series Engine: Statsmodels SARIMAX (Python)  │
│  SARIMA(0, 1, 2)(0, 0, 1)₁₂ • In-sample Evaluation     │
│     Artifact: backend/ml_models/sarima_model.pkl       │
└────────────────────────────────────────────────────────┘
```

- **Frontend (`frontend/`)**: Modern dashboard featuring KPI overview cards, interactive time-window filters, dual-series comparison charts, confidence interval shaded bands, and CSV upload capabilities.
- **Backend (`backend/`)**: RESTful service exposing model metadata, forecast schedules, historical records, and file upload endpoints with atomic transactions and validation.
- **Forecasting Engine (`forecasting/services.py`)**: Native Statsmodels model loader, in-sample residual evaluation engine, and horizon generator.

---

## Dataset Specifications

- **File Path**: `backend/data/price_data.csv`
- **Total Observations**: **249 monthly records**
- **Temporal Range**: **January 1, 2005 &rarr; September 1, 2025** (20.75 continuous years)
- **Frequency**: Monthly (Standardized to Month-Start: `YYYY-MM-01`)
- **Missing Values**: 0 missing dates, 0 missing prices
- **Price Range**: $5,466.00 (historical low) &rarr; $16,000.00 (historical high)
- **Latest Observation**: September 2025 ($15,750.00)

---

## Machine Learning & Model Design

The forecasting model belongs to the **Seasonal Autoregressive Integrated Moving Average (SARIMA)** family, designated as:

$$\text{SARIMA}(p=0, d=1, q=2) \times (P=0, D=0, Q=1)_{s=12}$$

### Hyperparameter Configuration
- **Regular Order $(p, d, q) = (0, 1, 2)$**:
  - $p = 0$: No non-seasonal autoregressive lags.
  - $d = 1$: First-order differencing applied to achieve stationarity ($\Delta Y_t = Y_t - Y_{t-1}$).
  - $q = 2$: Two moving average terms capturing short-term shock persistence.
- **Seasonal Order $(P, D, Q)_s = (0, 0, 1)_{12}$**:
  - $P = 0$: No seasonal autoregression.
  - $D = 0$: No seasonal differencing required.
  - $Q = 1$: Seasonal moving average term capturing 12-month annual cyclicality.
  - $s = 12$: Annual monthly seasonality period.
- **Forecast Horizon**: **12 Months** (October 2025 to September 2026).
- **Uncertainty Bounds**: **95% Confidence Intervals** ($\alpha = 0.05$).

### Verified Forecast Schedule (October 2025 – September 2026)

| Forecast Month | Predicted Mean | 95% Lower CI | 95% Upper CI | Uncertainty Spread |
| :---: | :---: | :---: | :---: | :---: |
| **2025-10-01** | **$15,715.48** | $14,048.12 | $17,382.83 | &plusmn;$1,667.36 |
| **2025-11-01** | **$15,744.58** | $13,421.66 | $18,067.51 | &plusmn;$2,322.93 |
| **2025-12-01** | **$15,771.05** | $12,906.09 | $18,636.02 | &plusmn;$2,864.97 |
| **2026-01-01** | **$15,798.39** | $12,478.74 | $19,118.04 | &plusmn;$3,319.65 |
| **2026-02-01** | **$15,798.35** | $12,079.19 | $19,517.50 | &plusmn;$3,719.16 |
| **2026-03-01** | **$15,719.35** | $11,639.62 | $19,799.08 | &plusmn;$4,079.73 |
| **2026-04-01** | **$15,716.80** | $11,305.87 | $20,127.72 | &plusmn;$4,410.93 |
| **2026-05-01** | **$15,716.79** | $10,997.86 | $20,435.72 | &plusmn;$4,718.93 |
| **2026-06-01** | **$15,717.06** | $10,709.04 | $20,725.09 | &plusmn;$5,008.03 |
| **2026-07-01** | **$15,670.18** | $10,388.86 | $20,951.51 | &plusmn;$5,281.33 |
| **2026-08-01** | **$15,696.60** | $10,155.44 | $21,237.76 | &plusmn;$5,541.16 |
| **2026-09-01** | **$15,677.63** | $9,888.29 | $21,466.97 | &plusmn;$5,789.34 |

---

## Model Evaluation Methodology

This project explicitly separates **in-sample model-fit statistics** from **out-of-sample hold-out validation metrics** to preserve statistical integrity:

### 1. Information Criteria (Goodness-of-Fit / Model Selection)
Computed across the full 249 observations:
- **AIC (Akaike Information Criterion)**: **`3,816.4657`** (evaluates likelihood penalized by parameter count).
- **BIC (Bayesian Information Criterion)**: **`3,830.2698`** (incorporates sample-size penalty $k \ln(n)$).
- **HQIC (Hannan-Quinn Information Criterion)**: **`3,822.0321`** (strongly consistent criterion).

### 2. In-Sample One-Step-Ahead Residual Statistics
Calculated by comparing the model's in-sample fitted values against actual prices for all 248 differenced observations:
- **Mean Absolute Error (MAE)**: **`$411.71`**
- **Root Mean Squared Error (RMSE)**: **`$838.69`**
- **Mean Absolute Percentage Error (MAPE)**: **`5.23%`**

### 3. Out-of-Sample Validation Distinction
- **In-sample fit**: Reflects how well the mathematical parameters describe the existing 20-year series.
- **Hold-out validation**: Evaluates performance on unseen time steps (e.g., training on 2005–2024 and validating against withheld 2025). The production model is estimated using 100% of available historical observations through September 2025 so that future 2025–2026 forecasts capture the latest economic levels.

---

## REST API Reference

The backend exposes 5 core query endpoints and 1 upload action under `/api/`:

| Method | Endpoint | Description | Sample Output / Payload |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/` | Consolidated KPI summary | Latest price, MoM/YoY change, forecast stats, active model info |
| `GET` | `/api/forecast/` | 12-Month SARIMA forecast | 12 forecast items with point estimate and 95% confidence intervals |
| `GET` | `/api/historical/` | Chronological records list | 249 monthly observations (`id`, `date`, `price`, `created_at`) |
| `GET` | `/api/visualization/` | Unified charting timeline | 261 timeline items combining historical actuals and forecast bands |
| `GET` | `/api/model-info/` | Model metadata & metrics | Order `[0,1,2]`, seasonal order `[0,0,1,12]`, AIC, BIC, MAE, RMSE, MAPE |
| `POST` | `/api/historical/upload/` | Ingest new CSV data | Accepts `file` multipart (supports `avg_monthly_price` or `price`) |

---

## Screenshots & UI Showcase

*(Place screenshots in `docs/screenshots/` and update paths below)*

### 1. Executive Dashboard Overview
![Dashboard Overview Placeholder](docs/screenshots/overview_dashboard.png)
*Figure 1: Executive KPI cards, dual-series historical vs. forecast chart with 95% confidence interval shaded band, and forecast schedule.*

### 2. Interactive Historical Price Chart
![Historical Chart Placeholder](docs/screenshots/historical_chart.png)
*Figure 2: Long-term historical monthly price trajectory (2005–2025) with dynamic timeframe filters (ALL, 10Y, 5Y, 2Y) and window stats.*

### 3. Model Performance & Statistical Evaluation
![Model Performance Placeholder](docs/screenshots/model_performance.png)
*Figure 3: SARIMA orders, information criteria (AIC/BIC/HQIC), in-sample error metrics, and statistical explanation banner.*

### 4. Historical Data Records & CSV Ingestion
![Historical Data Table Placeholder](docs/screenshots/data_management.png)
*Figure 4: Searchable, sortable, paginated data table with live CSV upload interface.*

---

## Project Structure

```
SARIMA_Prediction_Model/
├── README.md                      # Comprehensive project documentation
├── .gitignore                     # Git exclusion rules (venv, node_modules, .next, etc.)
│
├── backend/                       # Django REST Framework Backend
│   ├── manage.py                  # Django management CLI
│   ├── requirements.txt           # Python dependencies (locked)
│   ├── .env.example               # Backend environment template
│   ├── core/                      # Django project configuration
│   │   ├── settings.py            # Settings, CORS, DRF, SARIMA configuration
│   │   ├── urls.py                # Base routing (/api/, /admin/)
│   │   └── wsgi.py
│   ├── forecasting/               # Main forecasting Django application
│   │   ├── models.py              # MonthlyPriceRecord, ModelMetadata, ForecastCache
│   │   ├── services.py            # SARIMAService, model loader, forecast generator
│   │   ├── serializers.py         # DRF serializers
│   │   ├── views.py               # ViewSets and APIViews
│   │   ├── urls.py                # API URL routing
│   │   ├── tests.py               # Automated test suite (12 tests)
│   │   ├── admin.py               # Django Admin registration
│   │   └── management/commands/   # Custom commands (load_price_data)
│   ├── data/                      # Historical datasets
│   │   └── price_data.csv         # 249 raw observations (2005–2025)
│   └── ml_models/                 # Serialized model artifacts
│       └── sarima_model.pkl       # Verified Statsmodels SARIMAX production model (~10 MB)
│
└── frontend/                      # Next.js 16 + TypeScript Frontend
    ├── package.json               # Next.js dependencies (Recharts, Lucide, Tailwind)
    ├── next.config.ts             # Webpack / Next.js compilation config
    ├── postcss.config.mjs         # PostCSS Tailwind CSS setup
    ├── tsconfig.json              # TypeScript strict configuration
    ├── .env.example               # Frontend environment template
    ├── app/                       # App Router
    │   ├── layout.tsx             # Root layout with system font stack
    │   ├── page.tsx               # Primary dashboard page (tabs & state)
    │   └── globals.css            # Tailwind styles
    ├── components/                # Reusable dashboard UI components
    │   ├── Sidebar.tsx            # Navigation sidebar with model badge
    │   ├── Header.tsx             # Header with dataset span & live API status
    │   ├── KPICards.tsx           # Latest price, forecast mean, records, horizon
    │   ├── HistoricalChart.tsx    # Interactive Recharts area chart with time filters
    │   ├── ForecastComparisonChart.tsx # Combined actual vs forecast chart with 95% CI
    │   ├── ForecastTable.tsx      # 12-Month forecast schedule with CSV download
    │   ├── ModelPerformance.tsx   # Model specifications, AIC/BIC, separated metrics
    │   ├── HistoricalDataTable.tsx# Table with search, sorting, pagination & upload
    │   └── LoadingState.tsx       # Loading spinner and error boundary states
    └── lib/                       # Types and API service layer
        ├── types.ts               # TypeScript API response definitions
        └── api.ts                 # Typed fetch client connecting to Django API
```

---

## Installation & Setup (Windows PowerShell)

### Prerequisites
- **Python**: Version 3.11+
- **Node.js**: Version 18+ (tested on Node v24)
- **PowerShell**: Windows PowerShell 5.1 or PowerShell Core 7+

---

### Step 1: Clone the Repository
```powershell
git clone https://github.com/your-username/monthly-price-forecasting.git
cd monthly-price-forecasting
```

---

### Step 2: Configure & Start the Django Backend

1. Navigate to the backend directory:
   ```powershell
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. Install locked dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```powershell
   Copy-Item .env.example .env
   ```

5. Apply database migrations:
   ```powershell
   python manage.py migrate
   ```

6. Ingest the historical dataset (`price_data.csv`):
   ```powershell
   python manage.py load_price_data
   ```

7. Run automated backend verification tests:
   ```powershell
   python manage.py test forecasting
   ```

8. Start the development server:
   ```powershell
   python manage.py runserver 127.0.0.1:8000
   ```
   *The backend REST API will now be live at `http://127.0.0.1:8000/api/`.*

---

### Step 3: Configure & Start the Next.js Frontend

1. Open a **new PowerShell terminal window** and navigate to `frontend/`:
   ```powershell
   cd monthly-price-forecasting\frontend
   ```

2. Install Node packages:
   ```powershell
   npm install
   ```

3. Configure environment variables:
   ```powershell
   Copy-Item .env.example .env.local
   ```
   *(Ensure `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` is set in `.env.local`)*

4. Run the production build check:
   ```powershell
   npm run build
   ```

5. Launch the frontend development server:
   ```powershell
   npm run dev
   ```
   *Open **`http://localhost:3000`** in your browser to access the dashboard.*

---

## Model Artifact Handling

The verified production model artifact is located at:
`backend/ml_models/sarima_model.pkl` (~10.2 MB).

Because the file size is well within GitHub's 100 MB file limit, it can be tracked directly in version control. If preferred, the model can also be re-estimated at any time from `backend/data/price_data.csv` using the built-in retraining pipeline:
```powershell
# Via API POST request:
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/train/ -Method Post
```

---

## License & Authors

Developed by **Bharath** as an applied Machine Learning & Full-Stack AI Engineering portfolio project.
- **Frontend**: Next.js, React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
- **Backend & ML**: Django, Django REST Framework, Statsmodels, Pandas, NumPy, Scipy.
- **License**: MIT License.
