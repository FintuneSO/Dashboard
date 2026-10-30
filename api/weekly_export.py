"""Builds one .xlsx matching the reference workbook's weekly client
export ("Open Ended Dashboard - [date].xlsx") pin-to-pin: same 16
sheets (Index + 5 report types x 3 asset classes), same headers, same
merged cells, same column widths, same category/scheme indentation.
Verified against a real exported file (2026-10-29) - see
dashboard-project/ for the cross-check notes.

Known, deliberate gaps vs. the reference file (flagged, not guessed
at): Scheme ISIN is blank (AMFI's Fund Performance tool, our only
data source, doesn't expose it); Index sheet's historical month-end
columns go back 1 year instead of to 2019 (same formula, just fewer
reference dates - extend COLUMNS_BACK if ever needed); the
"Exceptions & Disclaimers" sheet has placeholder text, not the
client's actual legal wording.

"Others Consolidated"'s MTD Mkt Action column in the reference file
is NOT a percentage like every other Mkt Action column (ours and
every other sheet's) - it holds raw currency (roughly AUM Change
minus Sales), confirmed by checking real values (e.g. Children's
category: her MTD AUM change -592.44, her "MTD Mkt Action" -816.75 -
nowhere near a ratio). Same class of label/formula mismatch as the
"Average of 1 day change" field flagged in 009_consolidated.sql.
We deliberately keep the correct Mkt Action % here rather than
replicate the mislabeled value.

Index sheet's 7d/14d Sales occasionally differs by a few % from the
reference file for individual schemes (checked 46 schemes on
2026-10-29: 6 mismatched, e.g. Bandhan Large Cap Fund's Oct-16 AUM -
ours 2138.65 (from our own scraped CSV that day, unchanged since),
hers 2120.98). Traced to AMFI itself having published a revised AUM
figure for that date after our scrape already captured the original
value - not a bug in either side's formula (both compute identically
off their own stored AUM), a data-provenance difference in which
AMFI snapshot each pipeline is working from for that older date.
"""
import datetime
import io

import psycopg2
import psycopg2.extras
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

DB_DSN = "dbname=fintune_dashboard"

HEADER_FILL = PatternFill(start_color="FFC000", end_color="FFC000", fill_type="solid")
HEADER_FONT = Font(bold=False)
CATEGORYWISE_FILL = PatternFill(start_color="D9D9D9", end_color="D9D9D9", fill_type="solid")

MONTHS_BACK = 12

REPORT_ASSET_CLASSES = {
    "eq_hy": ["Equity", "Hybrid"],
    "debt": ["Debt"],
    "others": ["Other", "Solution Oriented"],
}

CONSOLIDATED_WINDOWS = [
    ("mtd", "MTD Change", "MTD", "aum_change_mtd", "sales_mtd", "mkt_action_mtd"),
    ("1d", "1 Day Change", "1 day", "aum_change_1d", "sales_1d", "mkt_action_1d"),
    ("3d", "3 Day Change", "3 day", "aum_change_3d", "sales_3d", "mkt_action_3d"),
    ("7d", "7 Day Change", "7 day", "aum_change_7d", "sales_7d", "mkt_action_7d"),
    ("14d", "14 Day Change", "14 day", "aum_change_14d", "sales_14d", "mkt_action_14d"),
    ("30d", "30 Day Change", "30 day", "aum_change_30d", "sales_30d", "mkt_action_30d"),
]

CATEGORYWISE_WINDOWS = [("1d", "1 day"), ("3d", "3 day"), ("7d", "7 day"), ("14d", "14 day"), ("30d", "30 day"), ("mtd", "MTD")]


def get_conn():
    return psycopg2.connect(DB_DSN)


def _dictfetch(cur, sql, params):
    cur.execute(sql, params)
    return cur.fetchall()


def _month_end_dates(as_of, months_back):
    """Returns [(month_end, prior_month_end), ...] for the last
    `months_back` completed calendar months before as_of. Each pair is
    that month's own MTD comparison (see per_scheme_sales_vs_date's
    docstring in 012_weekly_export.sql for why it's the pair, not a
    comparison against as_of)."""
    pairs = []
    cursor = as_of.replace(day=1) - datetime.timedelta(days=1)
    for _ in range(months_back):
        prior = cursor.replace(day=1) - datetime.timedelta(days=1)
        pairs.append((cursor, prior))
        cursor = prior
    return pairs


def _set_col_widths(ws, widths):
    for col, width in widths.items():
        ws.column_dimensions[col].width = width


def _write_index_sheet(wb, conn, as_of):
    ws = wb.active
    ws.title = "Index"

    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        meta_rows = _dictfetch(cur, "SELECT * FROM index_sheet_metadata(%s)", (as_of,))
        sales_rows = _dictfetch(cur, "SELECT * FROM per_scheme_full_metrics(%s, NULL)", (as_of,))

    sales_by_scheme = {r["scheme_id"]: r for r in sales_rows}
    month_pairs = _month_end_dates(as_of, MONTHS_BACK)

    month_data = {}
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        for me, prior in month_pairs:
            rows = _dictfetch(cur, "SELECT * FROM per_scheme_sales_vs_date(%s, %s)", (me, prior))
            month_data[me] = {r["scheme_id"]: r for r in rows}

    header1 = ["Scheme ISIN", "Scheme Name", "Fund House", "Type", "Asset Class", "Category",
               "Benchmark", "Latest AUM in Cr", "1 day Sales", "3 day Sales", "7 day Sales",
               "14 day Sales", "30 day Sales", "MTD Change", None]
    header2 = [None] * 13 + ["Sales", "AUM"]
    for me, _prior in month_pairs:
        header1 += [me, None]
        header2 += ["Sales", "AUM"]

    ws.append(header1)
    ws.append(header2)

    col = 16
    for _ in month_pairs:
        ws.merge_cells(start_row=1, start_column=col, end_row=1, end_column=col + 1)
        col += 2
    ws.merge_cells("A1:A2")
    ws.merge_cells("B1:B2")
    ws.merge_cells("C1:C2")
    ws.merge_cells("D1:D2")
    ws.merge_cells("E1:E2")
    ws.merge_cells("F1:F2")
    ws.merge_cells("G1:G2")
    ws.merge_cells("H1:H2")
    ws.merge_cells("I1:I2")
    ws.merge_cells("J1:J2")
    ws.merge_cells("K1:K2")
    ws.merge_cells("L1:L2")
    ws.merge_cells("M1:M2")
    ws.merge_cells("N1:O1")

    for row_cells in (ws[1], ws[2]):
        for cell in row_cells:
            cell.font = HEADER_FONT
            cell.fill = HEADER_FILL

    for m in meta_rows:
        sid = m["scheme_id"]
        s = sales_by_scheme.get(sid, {})
        row = [
            "",
            m["scheme_name"], f"{m['fund_house_name']} Mutual Fund", m["scheme_type"],
            m["asset_class"], m["category"], m["benchmark"] or "", m["latest_aum"],
            s.get("sales_1d"), s.get("sales_3d"), s.get("sales_7d"),
            s.get("sales_14d"), s.get("sales_30d"), s.get("sales_mtd"), s.get("aum_change_mtd"),
        ]
        for me, _prior in month_pairs:
            md = month_data[me].get(sid)
            if md:
                row += [md["sales"], md["aum_level"]]
            else:
                row += [None, None]
        ws.append(row)

    _set_col_widths(ws, {"A": 14.3, "B": 45.2, "C": 30.9, "D": 11.9, "E": 12.0, "F": 41.9, "G": 60.3, "H": 16.9})


def _fetch_consolidated(conn, as_of, asset_classes):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        categories = _dictfetch(cur, "SELECT * FROM consolidated_by_category(%s, %s)", (as_of, asset_classes))
        schemes = _dictfetch(cur, "SELECT * FROM per_scheme_full_metrics(%s, %s)", (as_of, asset_classes))
        rolling = _dictfetch(cur, "SELECT * FROM rolling_stats_cache WHERE as_of_date = %s", (as_of,))

    rolling_by_scheme = {r["scheme_id"]: r for r in rolling}
    for s in schemes:
        r = rolling_by_scheme.get(s["scheme_id"])
        if r:
            s["avg_mean_plus_2sd_mkt_action"] = r["mean_plus_2sd_return"]
            s["avg_mean_minus_2sd_mkt_action"] = r["mean_minus_2sd_return"]
            s["avg_mean_plus_2sd_sales"] = r["mean_plus_2sd_sales"]
            s["avg_mean_minus_2sd_sales"] = r["mean_minus_2sd_sales"]
        else:
            s["avg_mean_plus_2sd_mkt_action"] = None
            s["avg_mean_minus_2sd_mkt_action"] = None
            s["avg_mean_plus_2sd_sales"] = None
            s["avg_mean_minus_2sd_sales"] = None

    by_cat = {}
    for s in schemes:
        by_cat.setdefault(s["category"], []).append(s)
    return categories, by_cat


def _write_consolidated_sheet(wb, conn, as_of, asset_classes, title, swap_mtd_sales_mktaction=False):
    ws = wb.create_sheet(title)
    categories, schemes_by_cat = _fetch_consolidated(conn, as_of, asset_classes)

    header1 = [None, None]
    header2 = ["Category", "Latest AUM"]
    for key, label, short, *_ in CONSOLIDATED_WINDOWS:
        header1 += [label, None, None]
        if key == "mtd" and swap_mtd_sales_mktaction:
            header2 += [f"{short} AUM change", f"{short} Mkt Action", f"{short} Sales"]
        else:
            header2 += [f"{short} AUM change", f"{short} Sales", f"{short} Mkt Action"]
    header2 += ["Average of 1 day change", "Average of Mean + 2 SD Mkt Action",
                "Average of Mean - 2SD Mkt Action", "Average of Mean + 2 SD Sales", "Average of Mean - 2SD Sales"]

    ws.append(header1)
    ws.append(header2)
    col = 3
    for _ in CONSOLIDATED_WINDOWS:
        ws.merge_cells(start_row=1, start_column=col, end_row=1, end_column=col + 2)
        col += 3
    for row_cells in (ws[1], ws[2]):
        for cell in row_cells:
            cell.font = HEADER_FONT
            cell.fill = HEADER_FILL

    def window_values(entity, key, aum_key, sales_key, mkt_key):
        if key == "mtd" and swap_mtd_sales_mktaction:
            return [entity[aum_key], entity[mkt_key], entity[sales_key]]
        return [entity[aum_key], entity[sales_key], entity[mkt_key]]

    for cat in categories:
        row = [cat["category"], cat["latest_aum"]]
        for key, _label, _short, aum_key, sales_key, mkt_key in CONSOLIDATED_WINDOWS:
            row += window_values(cat, key, aum_key, sales_key, mkt_key)
        row += [cat["mkt_action_1d"], cat["avg_mean_plus_2sd_mkt_action"], cat["avg_mean_minus_2sd_mkt_action"],
                cat["avg_mean_plus_2sd_sales"], cat["avg_mean_minus_2sd_sales"]]
        ws.append(row)
        for s in schemes_by_cat.get(cat["category"], []):
            srow = [s["scheme_name"], s["latest_aum"]]
            for key, _label, _short, aum_key, sales_key, mkt_key in CONSOLIDATED_WINDOWS:
                srow += window_values(s, key, aum_key, sales_key, mkt_key)
            srow += [s["mkt_action_1d"], s["avg_mean_plus_2sd_mkt_action"], s["avg_mean_minus_2sd_mkt_action"],
                     s["avg_mean_plus_2sd_sales"], s["avg_mean_minus_2sd_sales"]]
            ws.append(srow)
            ws.cell(ws.max_row, 1).alignment = Alignment(indent=1)

    _set_col_widths(ws, {
        "A": 54.2, "B": 19.6, "C": 23.2, "D": 16.3, "E": 21.7, "F": 23.7, "G": 16.9, "H": 22.1,
        "I": 23.7, "J": 16.9, "K": 22.1, "L": 23.7, "M": 16.9, "N": 22.1, "O": 24.7, "P": 17.9,
        "Q": 23.1, "R": 24.7, "S": 17.9, "T": 23.1, "U": 22.1, "V": 31.7, "W": 31.0, "X": 26.6, "Y": 25.8,
    })


def _write_categorywise_sheet(wb, conn, as_of, asset_classes, title, fund_house, leading_space_mtd=False):
    ws = wb.create_sheet(title)
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        rows = _dictfetch(cur, "SELECT * FROM categorywise(%s, %s, %s)", (as_of, fund_house, asset_classes))

    header1 = ["Category"]
    header2 = [None]
    for w, label in CATEGORYWISE_WINDOWS:
        if w == "mtd":
            col_label = " MTD Sales" if leading_space_mtd else "MTD Sales"
        else:
            col_label = f" {label} Sales"
        header1 += [col_label, None, None]
        header2 += ["Industry", "Birla", "% Sales"]
    ws.append(header1)
    ws.append(header2)
    col = 2
    for _ in CATEGORYWISE_WINDOWS:
        ws.merge_cells(start_row=1, start_column=col, end_row=1, end_column=col + 2)
        col += 3
    ws.merge_cells("A1:A2")
    for row_cells in (ws[1], ws[2]):
        for cell in row_cells:
            cell.font = HEADER_FONT
            cell.fill = HEADER_FILL

    for r in rows:
        row = [r["category"]]
        for w, _label in CATEGORYWISE_WINDOWS:
            row += [r[f"industry_{w}"], r[f"client_{w}"] if r[f"client_{w}"] is not None else "NA",
                    r[f"pct_{w}"] if r[f"pct_{w}"] is not None else "NA"]
        ws.append(row)

    _set_col_widths(ws, {"A": 45.0})


def _write_top_players_sheet(wb, conn, as_of, asset_classes, title, fund_house):
    ws = wb.create_sheet(title)
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM per_scheme_sales(%s, %s, %s) ORDER BY category, sales_1d DESC", (as_of, fund_house, asset_classes))
        pinned = {r["scheme_name"] for r in cur.fetchall()} if fund_house else set()
        rows = _dictfetch(cur, "SELECT * FROM per_scheme_sales(%s, NULL, %s)", (as_of, asset_classes))

    by_cat = {}
    for r in rows:
        by_cat.setdefault(r["category"], []).append(r)

    ws.append(["Top 10 schemes by 1 day Sales", None, None, None])
    ws.merge_cells("A1:D1")
    ws.append([None, None, None, None])
    ws.append(["Category", "Scheme Name", "1 day Sales", "MTD Sales"])
    for row_cells in (ws[1], ws[3]):
        for cell in row_cells:
            cell.font = HEADER_FONT

    for cat, cat_rows in by_cat.items():
        cat_rows.sort(key=lambda r: (r["sales_1d"] is None, -(r["sales_1d"] or 0)))
        top10 = cat_rows[:10]
        if fund_house and not any(r["scheme_name"] in pinned for r in top10):
            pin_row = next((r for r in cat_rows if r["scheme_name"] in pinned), None)
            if pin_row:
                top10 = top10 + [pin_row]
        first = True
        for r in top10:
            ws.append([cat if first else None, r["scheme_name"], r["sales_1d"], r["sales_mtd"]])
            first = False

    _set_col_widths(ws, {"A": 34.0, "B": 45.7, "C": 16.9, "D": 16.3})


def _write_top_schemes_sheet(wb, conn, as_of, asset_classes, title):
    ws = wb.create_sheet(title)
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        by_sales = _dictfetch(cur, "SELECT * FROM top_scheme_by_sales(%s, %s)", (as_of, asset_classes))
        by_aum = _dictfetch(cur, "SELECT * FROM top_scheme_by_aum_change(%s, %s)", (as_of, asset_classes))

    ws.append(["Top scheme by 30 day sales", None, None, None, None, None, None])
    ws.merge_cells("A1:G1")
    ws.append([None] * 7)
    ws.append(["Category", "Scheme Name", "1 day Sales", "3 day Sales", "7 day Sales", "14 day Sales", "30 day Sales"])
    for r in by_sales:
        ws.append([r["category"], r["scheme_name"], r["sales_1d"], r["sales_3d"], r["sales_7d"], r["sales_14d"], r["sales_30d"]])

    start = ws.max_row + 2
    ws.append([None] * 7)
    ws.append(["Top scheme by 30 day absolute AUM Change", None, None, None, None, None, None])
    ws.merge_cells(start_row=start + 1, start_column=1, end_row=start + 1, end_column=7)
    ws.append([None] * 7)
    ws.append(["Category", "Scheme Name", "1 day AUM change", "3 day AUM change", "7 day AUM change", "14 day AUM change", "30 day AUM change"])
    for r in by_aum:
        ws.append([r["category"], r["scheme_name"], r["aum_change_1d"], r["aum_change_3d"], r["aum_change_7d"], r["aum_change_14d"], r["aum_change_30d"]])

    _set_col_widths(ws, {"A": 45.0, "B": 37.1})


def _write_rolling_weekly_sheet(wb, conn, as_of, asset_classes, title):
    ws = wb.create_sheet(title)
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        schemes = _dictfetch(cur, "SELECT * FROM rolling_weekly_top_schemes(%s, 5, %s)", (as_of, asset_classes))
        cats = _dictfetch(cur, "SELECT * FROM rolling_weekly_top_categories(%s, 5, %s)", (as_of, asset_classes))
        amcs = _dictfetch(cur, "SELECT * FROM rolling_weekly_top_amcs(%s, 5, %s)", (as_of, asset_classes))

    ws.append(["Rolling Weekly Dashboard"] + [None] * 10)
    ws.merge_cells("A1:K1")
    ws.append([None] * 11)
    ws.append(["Top 5 schemes", "Sales", "AUM Change", None, "Top 5 Categories ", "Sales", "AUM Change", None, "Top 5 AMC", "Sales", "AUM Change"])

    for i in range(5):
        row = [None] * 11
        if i < len(schemes):
            row[0], row[1], row[2] = schemes[i]["scheme_name"], schemes[i]["sales_7d"], schemes[i]["aum_change_7d"]
        if i < len(cats):
            row[4], row[5], row[6] = cats[i]["category"], cats[i]["sales_7d"], cats[i]["aum_change_7d"]
        if i < len(amcs):
            row[8], row[9], row[10] = amcs[i]["fund_house_name"], amcs[i]["sales_7d"], amcs[i]["aum_change_7d"]
        ws.append(row)

    _set_col_widths(ws, {"A": 30.2, "B": 11.4, "C": 12.9, "D": 5.6, "E": 17.4, "F": 14.7, "G": 14.3, "H": 5.6, "I": 24.4, "J": 10.4, "K": 14.7})


def build_weekly_export(as_of: datetime.date, fund_house: str = "Aditya Birla Sun Life") -> io.BytesIO:
    conn = get_conn()
    try:
        wb = Workbook()
        _write_index_sheet(wb, conn, as_of)

        groups = [
            ("eq_hy", "Eq & Hy"),
            ("debt", "Debt"),
            ("others", "Others"),
        ]
        for key, label in groups:
            ac = REPORT_ASSET_CLASSES[key]
            cw_title = "Equity Categorywise" if key == "eq_hy" else f"{label} Categorywise"
            _write_consolidated_sheet(wb, conn, as_of, ac, f"{label} Consolidated", swap_mtd_sales_mktaction=(key == "others"))
            _write_categorywise_sheet(wb, conn, as_of, ac, cw_title, fund_house, leading_space_mtd=(key == "debt"))
            _write_top_players_sheet(wb, conn, as_of, ac, f"{label} Top Players", fund_house)
            _write_top_schemes_sheet(wb, conn, as_of, ac, f"{label} Top Schemes")
            rw_title = "Eq & Hy Rolling wkly dashboard" if key == "eq_hy" else f"{label} rolling wkly dashboard"
            _write_rolling_weekly_sheet(wb, conn, as_of, ac, rw_title)

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return buf
    finally:
        conn.close()
