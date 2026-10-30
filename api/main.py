"""FastAPI backend for the Fintune dashboard.

Thin layer over the SQL calc functions in db/migrations/003_category_sales_calc.sql -
this file has no business logic of its own, it just validates request
params, calls the DB function, and shapes the response as JSON (or, for
/categories/sales/export, as an .xlsx file). See
dashboard-project/top-categories-pivot/PROGRESS.md for the full picture.
"""
import datetime
import io
from typing import Optional

import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill

from weekly_export import build_weekly_export

DB_DSN = "dbname=fintune_dashboard"

WINDOW_COLUMNS = [
    ("sales_1d", "Sum of 1 day Sales", 1),
    ("sales_3d", "Sum of 3 day Sales", 3),
    ("sales_7d", "Sum of 7 day Sales", 7),
    ("sales_14d", "Sum of 14 day Sales", 14),
    ("sales_30d", "Sum of 30 day Sales", 30),
    ("sales_mtd", "Sum of MTD Sales", None),
]


def window_header_label(as_of: datetime.date, base_label: str, days_back: Optional[int]) -> str:
    """Yojana flagged (2026-09-29) that she couldn't verify individual
    columns against her own data because the header just said e.g. "Sum
    of 1 day Sales" with no indication of WHICH two dates that's
    comparing - she'd have to already know our internal date math to
    check it. Spelling out the actual comparison dates in the header
    makes each column self-explanatory without needing to ask us."""
    if days_back is None:
        mtd_start = (as_of.replace(day=1) - datetime.timedelta(days=1))
        return f"{base_label} ({as_of.strftime('%d-%b')} vs {mtd_start.strftime('%d-%b')})"
    compare_date = as_of - datetime.timedelta(days=days_back)
    return f"{base_label} ({as_of.strftime('%d-%b')} vs {compare_date.strftime('%d-%b')})"

app = FastAPI(title="Fintune Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["GET"],
    allow_headers=["*"],
)

from flow_intelligence import router as flow_intelligence_router
app.include_router(flow_intelligence_router)


def get_conn():
    return psycopg2.connect(DB_DSN)


REPORT_ASSET_CLASSES = {
    "eq_hy": ["Equity", "Hybrid"],
    "debt": ["Debt"],
    "others": ["Other", "Solution Oriented"],
}


def resolve_asset_classes(report: Optional[str]) -> Optional[list]:
    if report is None:
        return None
    if report not in REPORT_ASSET_CLASSES:
        raise HTTPException(status_code=400, detail=f"Unknown report '{report}', expected one of {list(REPORT_ASSET_CLASSES)}")
    return REPORT_ASSET_CLASSES[report]


def fetch_category_sales(date: datetime.date, fund_house: Optional[str], report: Optional[str] = None):
    """Shared by the JSON endpoint and the Excel export - one query, two renderers."""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM category_sales_summary(%s, %s, %s)",
                (date, fund_house, resolve_asset_classes(report)),
            )
            return cur.fetchall()
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        conn.close()


@app.get("/categories/sales")
def categories_sales(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    fund_house: Optional[str] = Query(None, description="Fund house name to filter to; omit for industry-wide"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    rows = fetch_category_sales(date, fund_house, report)
    return {"as_of": date.isoformat(), "fund_house": fund_house, "report": report, "categories": rows}


def _write_category_sheet(ws, title, fund_house_label, rows, as_of: datetime.date):
    ws.title = title

    header_font = Font(color="FFFFFF", bold=True)
    header_fill = PatternFill(start_color="4F6AB8", end_color="4F6AB8", fill_type="solid")

    headers = [window_header_label(as_of, label, days_back) for _, label, days_back in WINDOW_COLUMNS]

    ws.append([f"Fund House: {fund_house_label}", f"As of: {as_of.strftime('%d-%b-%Y')}"])
    ws.append([])
    ws.append(["Category"] + headers)
    for cell in ws[3]:
        cell.font = header_font
        cell.fill = header_fill

    for row in rows:
        ws.append([row["category"]] + [row[key] for key, _, _ in WINDOW_COLUMNS])

    ws.column_dimensions["A"].width = 42
    for col_letter in "BCDEFG":
        ws.column_dimensions[col_letter].width = 30


@app.get("/categories/sales/export")
def categories_sales_export(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    fund_house: Optional[str] = Query(None, description="Fund house name for the client-view sheet; omit for industry-only"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    """Same data as /categories/sales, rendered as an .xlsx download instead
    of JSON. Mirrors the dashboard's two-table layout as two sheets:
    Industry-wide always included; Client view included only when a
    fund_house is given."""
    industry_rows = fetch_category_sales(date, None, report)

    wb = Workbook()
    _write_category_sheet(wb.active, "Industry-wide", "All", industry_rows, date)

    if fund_house:
        client_rows = fetch_category_sales(date, fund_house, report)
        client_ws = wb.create_sheet()
        _write_category_sheet(client_ws, "Client view", fund_house, client_rows, date)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"top-categories-pivot-{date.isoformat()}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def fetch_top_players(date: datetime.date, fund_house: Optional[str], report: Optional[str] = None):
    """Shared by the JSON endpoint and the Excel export for Top Players -
    see db/migrations/004_top_players.sql for the ranking/pinning logic."""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM top_players(%s, %s, %s)",
                (date, fund_house, resolve_asset_classes(report)),
            )
            return cur.fetchall()
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        conn.close()


@app.get("/top-players")
def top_players_endpoint(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    fund_house: Optional[str] = Query(None, description="Fund house name to pin at #11 if not already in the top 10; omit for plain top 10 with no pinning"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    rows = fetch_top_players(date, fund_house, report)
    return {"as_of": date.isoformat(), "fund_house": fund_house, "report": report, "rows": rows}


@app.get("/top-players/export")
def top_players_export(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    fund_house: Optional[str] = Query(None, description="Fund house name to pin at #11; omit for plain top 10"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    rows = fetch_top_players(date, fund_house, report)

    wb = Workbook()
    ws = wb.active
    ws.title = "Top Players"

    header_font = Font(color="FFFFFF", bold=True)
    header_fill = PatternFill(start_color="4F6AB8", end_color="4F6AB8", fill_type="solid")
    pin_fill = PatternFill(start_color="FFF3CD", end_color="FFF3CD", fill_type="solid")

    label = f"Top 10 schemes by 1 day Sales ({fund_house} pinned at #11 if outside top 10)" if fund_house else "Top 10 schemes by 1 day Sales"
    ws.append([label])
    ws.append([f"As of: {date.strftime('%d-%b-%Y')}"])
    ws.append([])
    ws.append(["Category", "Scheme Name", "Sum of 1 day Sales", "Sum of MTD Sales"])
    for cell in ws[4]:
        cell.font = header_font
        cell.fill = header_fill

    last_category = None
    for row in rows:
        category_cell = row["category"] if row["category"] != last_category else None
        last_category = row["category"]
        ws.append([category_cell, row["scheme_name"], row["sales_1d"], row["sales_mtd"]])
        if row["is_client_pin"]:
            for cell in ws[ws.max_row]:
                cell.fill = pin_fill

    ws.column_dimensions["A"].width = 30
    ws.column_dimensions["B"].width = 42
    ws.column_dimensions["C"].width = 20
    ws.column_dimensions["D"].width = 20

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"top-players-{date.isoformat()}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


SALES_WINDOW_COLS = [("sales_1d", "1d"), ("sales_3d", "3d"), ("sales_7d", "7d"), ("sales_14d", "14d"), ("sales_30d", "30d")]
AUM_CHANGE_WINDOW_COLS = [("aum_change_1d", "1d"), ("aum_change_3d", "3d"), ("aum_change_7d", "7d"), ("aum_change_14d", "14d"), ("aum_change_30d", "30d")]


def fetch_top_schemes(date: datetime.date, report: Optional[str] = None):
    """Returns both rankings (by Sales and by raw AUM change) - see
    db/migrations/005_top_schemes.sql for why these are two genuinely
    different, independently-computed lists, not duplicates."""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            asset_classes = resolve_asset_classes(report)
            cur.execute("SELECT * FROM top_scheme_by_sales(%s, %s)", (date, asset_classes))
            by_sales = cur.fetchall()
            cur.execute("SELECT * FROM top_scheme_by_aum_change(%s, %s)", (date, asset_classes))
            by_aum_change = cur.fetchall()
            return by_sales, by_aum_change
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        conn.close()


@app.get("/top-schemes")
def top_schemes_endpoint(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    by_sales, by_aum_change = fetch_top_schemes(date, report)
    return {"as_of": date.isoformat(), "report": report, "by_sales": by_sales, "by_aum_change": by_aum_change}


def _write_top_schemes_sheet(ws, title, label, rows, window_cols, as_of):
    ws.title = title
    header_font = Font(color="FFFFFF", bold=True)
    header_fill = PatternFill(start_color="4F6AB8", end_color="4F6AB8", fill_type="solid")

    ws.append([label])
    ws.append([f"As of: {as_of.strftime('%d-%b-%Y')}"])
    ws.append([])
    headers = ["Category", "Scheme Name"] + [
        window_header_label(as_of, f"Sum of {w.replace('d', ' day')} {('Sales' if 'sales' in key else 'AUM change')}", int(w.replace('d', '')))
        for key, w in window_cols
    ]
    ws.append(headers)
    for cell in ws[4]:
        cell.font = header_font
        cell.fill = header_fill

    for row in rows:
        ws.append([row["category"], row["scheme_name"]] + [row[key] for key, _ in window_cols])

    ws.column_dimensions["A"].width = 30
    ws.column_dimensions["B"].width = 42
    for col_letter in "CDEFG":
        ws.column_dimensions[col_letter].width = 30


@app.get("/top-schemes/export")
def top_schemes_export(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    by_sales, by_aum_change = fetch_top_schemes(date, report)

    wb = Workbook()
    _write_top_schemes_sheet(wb.active, "Top by Sales", "Top scheme by 30 day sales", by_sales, SALES_WINDOW_COLS, date)
    ws2 = wb.create_sheet()
    _write_top_schemes_sheet(ws2, "Top by AUM Change", "Top scheme by 30 day absolute AUM Change", by_aum_change, AUM_CHANGE_WINDOW_COLS, date)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"top-schemes-{date.isoformat()}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


CATEGORYWISE_WINDOWS = ["1d", "3d", "7d", "14d", "30d", "mtd"]


def fetch_categorywise(date: datetime.date, fund_house: str, report: Optional[str] = None):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM categorywise(%s, %s, %s)", (date, fund_house, resolve_asset_classes(report)))
            return cur.fetchall()
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        conn.close()


@app.get("/categorywise")
def categorywise_endpoint(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    fund_house: str = Query(..., description="Fund house name for the Client/%Sales columns"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    rows = fetch_categorywise(date, fund_house, report)
    return {"as_of": date.isoformat(), "fund_house": fund_house, "report": report, "rows": rows}


@app.get("/categorywise/export")
def categorywise_export(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    fund_house: str = Query(..., description="Fund house name for the Client/%Sales columns"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    rows = fetch_categorywise(date, fund_house, report)

    wb = Workbook()
    ws = wb.active
    ws.title = "Categorywise"

    header_font = Font(color="FFFFFF", bold=True)
    header_fill = PatternFill(start_color="4F6AB8", end_color="4F6AB8", fill_type="solid")

    ws.append([f"Fund House: {fund_house}", f"As of: {date.strftime('%d-%b-%Y')}"])
    ws.append([])

    top_row = ["Category"]
    sub_row = [""]
    for w in CATEGORYWISE_WINDOWS:
        label = window_header_label(date, f"{w.upper() if w == 'mtd' else w} Sales", None if w == "mtd" else int(w.replace("d", "")))
        top_row += [label, "", ""]
        sub_row += ["Industry", "Client", "% Sales"]
    ws.append(top_row)
    ws.append(sub_row)
    for row_idx in (3, 4):
        for cell in ws[row_idx]:
            cell.font = header_font
            cell.fill = header_fill

    for row in rows:
        out = [row["category"]]
        for w in CATEGORYWISE_WINDOWS:
            out += [row[f"industry_{w}"], row[f"client_{w}"], row[f"pct_{w}"]]
        ws.append(out)

    ws.column_dimensions["A"].width = 42
    for col_idx in range(2, 2 + len(CATEGORYWISE_WINDOWS) * 3):
        ws.column_dimensions[ws.cell(row=1, column=col_idx).column_letter].width = 16

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"categorywise-{date.isoformat()}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def fetch_rolling_weekly(date: datetime.date, report: Optional[str] = None):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            asset_classes = resolve_asset_classes(report)
            cur.execute("SELECT * FROM rolling_weekly_top_schemes(%s, 5, %s)", (date, asset_classes))
            schemes = cur.fetchall()
            cur.execute("SELECT * FROM rolling_weekly_top_categories(%s, 5, %s)", (date, asset_classes))
            categories = cur.fetchall()
            cur.execute("SELECT * FROM rolling_weekly_top_amcs(%s, 5, %s)", (date, asset_classes))
            amcs = cur.fetchall()
            return schemes, categories, amcs
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        conn.close()


@app.get("/rolling-weekly")
def rolling_weekly_endpoint(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    schemes, categories, amcs = fetch_rolling_weekly(date, report)
    return {"as_of": date.isoformat(), "report": report, "top_schemes": schemes, "top_categories": categories, "top_amcs": amcs}


def _write_rolling_weekly_sheet(ws, row_label_header, rows, row_label_key, as_of):
    header_font = Font(color="FFFFFF", bold=True)
    header_fill = PatternFill(start_color="4F6AB8", end_color="4F6AB8", fill_type="solid")

    ws.append([f"As of: {as_of.strftime('%d-%b-%Y')}"])
    ws.append([])
    ws.append([
        row_label_header,
        window_header_label(as_of, "Sum of 7 day Sales", 7),
        window_header_label(as_of, "Sum of 7 day AUM change", 7),
    ])
    for cell in ws[3]:
        cell.font = header_font
        cell.fill = header_fill

    for row in rows:
        ws.append([row[row_label_key], row["sales_7d"], row["aum_change_7d"]])

    ws.column_dimensions["A"].width = 36
    ws.column_dimensions["B"].width = 30
    ws.column_dimensions["C"].width = 30


@app.get("/rolling-weekly/export")
def rolling_weekly_export(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    schemes, categories, amcs = fetch_rolling_weekly(date, report)

    wb = Workbook()
    _write_rolling_weekly_sheet(wb.active, "Scheme Name", schemes, "scheme_name", date)
    wb.active.title = "Top 5 Schemes"

    ws2 = wb.create_sheet("Top 5 Categories")
    _write_rolling_weekly_sheet(ws2, "Category", categories, "category", date)

    ws3 = wb.create_sheet("Top 5 AMC")
    _write_rolling_weekly_sheet(ws3, "Fund House", amcs, "fund_house_name", date)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"rolling-weekly-{date.isoformat()}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


CONSOLIDATED_WINDOWS = ["1d", "3d", "7d", "14d", "30d", "mtd"]


def fetch_consolidated(date: datetime.date, report: Optional[str] = None):
    """Category rollups + per-scheme detail rows - the reference sheet
    interleaves category summary rows with their constituent schemes
    beneath, so the frontend needs both to replicate that layout."""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            asset_classes = resolve_asset_classes(report)
            cur.execute("SELECT * FROM consolidated_by_category(%s, %s)", (date, asset_classes))
            categories = cur.fetchall()
            cur.execute("SELECT * FROM per_scheme_full_metrics(%s, %s)", (date, asset_classes))
            schemes = cur.fetchall()
            return categories, schemes
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        conn.close()


@app.get("/consolidated")
def consolidated_endpoint(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    categories, schemes = fetch_consolidated(date, report)
    return {"as_of": date.isoformat(), "report": report, "categories": categories, "schemes": schemes}


def _consolidated_row_cells(row, is_category: bool):
    label_cells = [row["category"]] if is_category else [row["category"], row["scheme_name"]]
    cells = label_cells + [row["latest_aum"]]
    for w in CONSOLIDATED_WINDOWS:
        cells += [row[f"aum_change_{w}"], row[f"sales_{w}"], row[f"mkt_action_{w}"]]
    if is_category:
        cells += [
            row["avg_mean_plus_2sd_mkt_action"], row["avg_mean_minus_2sd_mkt_action"],
            row["avg_mean_plus_2sd_sales"], row["avg_mean_minus_2sd_sales"],
        ]
    return cells


@app.get("/consolidated/export")
def consolidated_export(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    categories, schemes = fetch_consolidated(date, report)
    schemes_by_category = {}
    for row in schemes:
        schemes_by_category.setdefault(row["category"], []).append(row)

    wb = Workbook()
    ws = wb.active
    ws.title = "Consolidated"

    header_font = Font(color="FFFFFF", bold=True)
    header_fill = PatternFill(start_color="4F6AB8", end_color="4F6AB8", fill_type="solid")

    ws.append([f"As of: {date.strftime('%d-%b-%Y')}"])
    ws.append([])

    headers = ["Category", "Scheme Name", "Latest AUM"]
    for w in CONSOLIDATED_WINDOWS:
        label = "MTD" if w == "mtd" else w
        headers += [
            window_header_label(date, f"{label} AUM Change", None if w == "mtd" else int(w.replace("d", ""))),
            window_header_label(date, f"{label} Sales", None if w == "mtd" else int(w.replace("d", ""))),
            window_header_label(date, f"{label} Market Action %", None if w == "mtd" else int(w.replace("d", ""))),
        ]
    headers += ["Mean+2SD (Mkt Action)", "Mean-2SD (Mkt Action)", "Mean+2SD (Sales)", "Mean-2SD (Sales)"]
    ws.append(headers)
    for cell in ws[3]:
        cell.font = header_font
        cell.fill = header_fill

    for cat_row in categories:
        ws.append(_consolidated_row_cells(cat_row, is_category=True))
        for scheme_row in schemes_by_category.get(cat_row["category"], []):
            ws.append(_consolidated_row_cells(scheme_row, is_category=False))

    ws.column_dimensions["A"].width = 30
    ws.column_dimensions["B"].width = 42
    for col_idx in range(3, len(headers) + 1):
        ws.column_dimensions[ws.cell(row=1, column=col_idx).column_letter].width = 18

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"consolidated-{date.isoformat()}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def fetch_nav_aum(fn_name, date, report):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(f"SELECT * FROM {fn_name}(%s, %s)", (date, resolve_asset_classes(report)))
            return cur.fetchall()
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        conn.close()


def _write_nav_aum_sheet(ws, title, value_label, rows, value_key, as_of):
    ws.title = title
    header_font = Font(color="FFFFFF", bold=True)
    header_fill = PatternFill(start_color="4F6AB8", end_color="4F6AB8", fill_type="solid")

    ws.append([f"As of: {as_of.strftime('%d-%b-%Y')}"])
    ws.append([])
    headers = ["Scheme Name", "Fund House", "Category", value_label]
    ws.append(headers)
    for cell in ws[3]:
        cell.font = header_font
        cell.fill = header_fill

    for row in rows:
        ws.append([row["scheme_name"], row["fund_house"], row["category"], row[value_key]])

    ws.column_dimensions["A"].width = 42
    ws.column_dimensions["B"].width = 30
    ws.column_dimensions["C"].width = 20
    ws.column_dimensions["D"].width = 18


@app.get("/nav-regular")
def nav_regular_endpoint(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    rows = fetch_nav_aum("nav_regular_browser", date, report)
    return {"as_of": date.isoformat(), "report": report, "rows": rows}


@app.get("/nav-regular/export")
def nav_regular_export(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    rows = fetch_nav_aum("nav_regular_browser", date, report)
    wb = Workbook()
    _write_nav_aum_sheet(wb.active, "NAV Reg", "NAV Regular", rows, "nav_value", date)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    filename = f"nav-regular-{date.isoformat()}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/nav-direct")
def nav_direct_endpoint(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    rows = fetch_nav_aum("nav_direct_browser", date, report)
    return {"as_of": date.isoformat(), "report": report, "rows": rows}


@app.get("/nav-direct/export")
def nav_direct_export(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    rows = fetch_nav_aum("nav_direct_browser", date, report)
    wb = Workbook()
    _write_nav_aum_sheet(wb.active, "NAV Direct", "NAV Direct", rows, "nav_value", date)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    filename = f"nav-direct-{date.isoformat()}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/aum")
def aum_endpoint(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    rows = fetch_nav_aum("aum_browser", date, report)
    return {"as_of": date.isoformat(), "report": report, "rows": rows}


@app.get("/aum/export")
def aum_export(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    report: Optional[str] = Query(None, description="One of 'eq_hy', 'debt', 'others'; omit for all asset classes combined"),
):
    rows = fetch_nav_aum("aum_browser", date, report)
    wb = Workbook()
    _write_nav_aum_sheet(wb.active, "AUM", "AUM in Crore", rows, "aum_value", date)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    filename = f"aum-{date.isoformat()}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/weekly-export")
def weekly_export_endpoint(
    date: datetime.date = Query(..., description="As-of date, YYYY-MM-DD"),
    fund_house: str = Query("Aditya Birla Sun Life", description="Client fund house for the pinned/Birla columns"),
):
    try:
        buf = build_weekly_export(date, fund_house)
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    filename = f"Open Ended Dashboard - {date.strftime('%d%m%Y')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/latest-date")
def latest_date():
    """The most recent date our data actually covers - used by the
    frontend to default the "As of date" picker instead of a hardcoded
    date that goes stale every time the DB is resynced (flagged as an
    open item since Step 1 of the first page built)."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT MAX(nav_date) FROM nav_fact")
            latest = cur.fetchone()[0]
    finally:
        conn.close()
    return {"latest_date": latest.isoformat() if latest else None}


@app.get("/fund-houses")
def fund_houses():
    """List of fund house names for the dashboard's dropdown."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT DISTINCT fh.name FROM fund_house fh
                   JOIN scheme s ON s.fund_house_id = fh.fund_house_id
                   WHERE s.is_active ORDER BY 1"""
            )
            rows = [r[0] for r in cur.fetchall()]
    finally:
        conn.close()
    return {"fund_houses": rows}


@app.get("/health")
def health():
    return {"status": "ok"}
