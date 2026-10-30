"""Endpoints for the /flow-intelligence frontend (Industry/AMC/Category/
Scheme drill-down). Every "flow" field here is a net-flow estimate, not
gross inflow/outflow - see docs/metric_dictionary.md. These are thin
wrappers over the SQL functions in db/migrations/013_flow_intensity.sql
and 016_trailing_returns.sql, same pattern as the rest of api/main.py.
"""
import datetime
from typing import Optional

import psycopg2.extras
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/flow-intelligence", tags=["flow-intelligence"])


def _conn():
    from main import get_conn
    return get_conn()


def _rows(sql, params):
    with _conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            return cur.fetchall()


@router.get("/industry")
def industry_overview(date: datetime.date):
    """Category rotation + AMC leaderboard for the Industry Overview screen."""
    categories = _rows("SELECT * FROM category_flow_intensity(%s)", (date,))
    amcs = _rows("SELECT * FROM amc_flow_intensity(%s)", (date,))
    return {"as_of": date, "categories": categories, "amcs": amcs}


@router.get("/industry/summary")
def industry_summary(date: datetime.date):
    """Stat-strip numbers for the Industry Overview home page: total AUM,
    net flow 1D/MTD, asset-class split of today's flow, AMC concentration,
    and category rotation-state counts."""
    summary = _rows("SELECT * FROM industry_summary(%s)", (date,))
    asset_class_flow = _rows("SELECT * FROM industry_flow_by_asset_class(%s)", (date,))
    concentration = _rows("SELECT * FROM industry_concentration(%s, 5)", (date,))
    rotation_states = _rows("SELECT state, COUNT(*) AS count FROM category_rotation_state(%s) GROUP BY state", (date,))
    return {
        "as_of": date,
        "summary": summary[0] if summary else None,
        "asset_class_flow": asset_class_flow,
        "concentration": concentration[0] if concentration else None,
        "rotation_states": {r["state"]: r["count"] for r in rotation_states},
    }


@router.get("/asset-class/{name}")
def asset_class_detail(name: str, date: datetime.date):
    """Subcategories within a broad asset class (Equity/Debt/Hybrid/...)
    - drill-down target for the home page's asset-class flow table,
    which has no single natural target since our category pages are
    keyed by subcategory, not broad asset class."""
    summary = _rows("SELECT * FROM industry_flow_by_asset_class(%s) WHERE asset_class = %s", (date, name))
    subcategories = _rows("SELECT * FROM asset_class_subcategories(%s, %s)", (date, name))
    if not summary and not subcategories:
        raise HTTPException(status_code=404, detail="Asset class not found")
    return {"as_of": date, "name": name, "summary": summary[0] if summary else None, "subcategories": subcategories}


@router.get("/asset-class/{name}/series")
def asset_class_series(name: str, start_date: datetime.date, end_date: datetime.date):
    """Daily AUM + net flow series for the asset class detail page charts."""
    if (end_date - start_date).days > 400:
        raise HTTPException(status_code=400, detail="Range too large (max ~400 days)")
    return {"series": _rows("SELECT * FROM asset_class_daily_series(%s, %s, %s)", (start_date, end_date, name))}


@router.get("/industry/series")
def industry_series(start_date: datetime.date, end_date: datetime.date):
    """Daily industry AUM + net flow series for the home page trend
    charts. Reads industry_series_cache (026_industry_series_cache.sql)
    instead of computing live - a live call over the full ~4.5-year
    history measured ~40s, confirmed 2026-10-29, too slow to support
    zooming out to multi-year view. The cache is backfilled once and
    refreshed daily; this endpoint has no practical range cap as a
    result (frontend may request the full available history for zoom/pan)."""
    return {"series": _rows(
        "SELECT as_of_date, total_aum, net_flow_1d FROM industry_series_cache WHERE as_of_date BETWEEN %s AND %s ORDER BY as_of_date",
        (start_date, end_date),
    )}


@router.get("/industry/amc-panel")
def amc_panel(date: datetime.date, subcategory_id: Optional[int] = None):
    """Home page's Overall/Category-selectable chart panel: AMC share
    (pie), AMC net flow (bar), AMC flow-intensity ranking (bar), AUM
    trend (line), and - when subcategory_id is omitted (Overall
    selected) - the broad asset-class mix (second pie)."""
    amcs = _rows("SELECT * FROM amc_breakdown(%s, %s)", (date, subcategory_id))
    result = {"as_of": date, "subcategory_id": subcategory_id, "amcs": amcs}
    if subcategory_id is None:
        result["asset_class_mix"] = _rows("SELECT * FROM asset_class_mix(%s)", (date,))
    return result


@router.get("/industry/direct-regular-gap")
def direct_regular_gap(date: datetime.date):
    """Direct vs Regular plan 1Y return differential (expense-ratio drag) -
    AUM can't be split by plan (AMFI reports it scheme-level only), but
    NAV is genuinely separate per plan, so this is real, not fabricated."""
    summary = _rows("SELECT * FROM industry_direct_regular_gap(%s)", (date,))
    top_schemes = _rows(
        "SELECT * FROM scheme_direct_regular_gap(%s) ORDER BY return_gap_1y DESC LIMIT 10", (date,)
    )
    return {"as_of": date, "summary": summary[0] if summary else None, "top_schemes": top_schemes}


@router.get("/amc")
def amc_list(date: datetime.date):
    return {"as_of": date, "amcs": _rows("SELECT * FROM amc_flow_intensity(%s) ORDER BY latest_aum DESC", (date,))}


@router.get("/amc/universe-stats")
def amc_universe_stats_endpoint(date: datetime.date):
    """Cross-sectional fields for the AMC list page's quadrant scatter,
    breadth strip, HHI tile, and Direct/Regular drag column - needs
    absolute sales (bubble size) and the AMC-level return gap on top
    of what amc_flow_intensity() exposes."""
    return {"as_of": date, "amcs": _rows("SELECT * FROM amc_universe_stats(%s) ORDER BY latest_aum DESC", (date,))}


@router.get("/amc/{fund_house_id}")
def amc_detail(fund_house_id: int, date: datetime.date):
    fh = _rows("SELECT fund_house_id, name FROM fund_house WHERE fund_house_id = %s", (fund_house_id,))
    if not fh:
        raise HTTPException(status_code=404, detail="Fund house not found")
    name = fh[0]["name"]

    summary = _rows("SELECT * FROM amc_flow_intensity(%s) WHERE fund_house_name = %s", (date, name))

    schemes = _rows(
        """
        SELECT m.*, fi.flow_intensity_1d, fi.flow_intensity_7d, fi.flow_intensity_30d, fi.flow_intensity_mtd,
               r.return_1m, r.return_3m, r.return_6m, r.return_1y, r.return_3y
        FROM per_scheme_full_metrics(%(date)s, NULL) m
        JOIN scheme s ON s.scheme_id = m.scheme_id
        JOIN scheme_flow_intensity(%(date)s, NULL) fi ON fi.scheme_id = m.scheme_id
        LEFT JOIN scheme_trailing_returns(%(date)s) r ON r.scheme_id = m.scheme_id
        WHERE s.fund_house_id = %(fh_id)s
        ORDER BY m.latest_aum DESC
        """,
        {"date": date, "fh_id": fund_house_id},
    )

    category_split = _rows(
        """
        SELECT c.name AS category, SUM(m.latest_aum) AS aum, SUM(m.sales_1d) AS sales_1d, SUM(m.sales_30d) AS sales_30d
        FROM per_scheme_full_metrics(%(date)s, NULL) m
        JOIN scheme s ON s.scheme_id = m.scheme_id
        JOIN category c ON c.category_id = s.category_id
        WHERE s.fund_house_id = %(fh_id)s
        GROUP BY c.name
        ORDER BY aum DESC
        """,
        {"date": date, "fh_id": fund_house_id},
    )

    return {
        "as_of": date,
        "fund_house_id": fund_house_id,
        "name": name,
        "summary": summary[0] if summary else None,
        "category_split": category_split,
        "schemes": schemes,
    }


@router.get("/amc/{fund_house_id}/series")
def amc_series(fund_house_id: int, start_date: datetime.date, end_date: datetime.date):
    """Daily AUM, net flow, and market-share series for the AMC detail page charts."""
    if (end_date - start_date).days > 400:
        raise HTTPException(status_code=400, detail="Range too large (max ~400 days)")
    return {"series": _rows("SELECT * FROM amc_market_share_series(%s, %s, %s)", (start_date, end_date, fund_house_id))}


@router.get("/amc/{fund_house_id}/window-summary")
def amc_window_summary(fund_house_id: int, date: datetime.date):
    """AUM/net-flow/market-effect across 1D/7D/14D/30D/MTD windows - backs
    the EntityHeader's window selector and the AUM-bridge waterfall chart."""
    return {"windows": _rows("SELECT * FROM amc_window_summary(%s, %s)", (date, fund_house_id))}


@router.get("/category")
def category_list(date: datetime.date):
    return {"as_of": date, "categories": _rows("SELECT * FROM category_flow_intensity(%s) ORDER BY latest_aum DESC", (date,))}


@router.get("/category/universe-stats")
def category_universe_stats_endpoint(date: datetime.date):
    """Cross-sectional fields for the Category list page's quadrant
    scatter - needs subcategory_id, asset class, and absolute sales_1d
    on top of what category_flow_intensity() exposes."""
    return {"as_of": date, "categories": _rows("SELECT * FROM category_universe_stats(%s) ORDER BY latest_aum DESC", (date,))}


@router.get("/category/{subcategory_id}")
def category_detail(subcategory_id: int, date: datetime.date):
    """NOTE: 'category' here is subcategory-level granularity (e.g.
    "Large Cap", "Equity Savings") - see category_flow_intensity()'s
    comment in 016_trailing_returns.sql. subcategory_id, not category_id."""
    cat = _rows("SELECT subcategory_id, name FROM subcategory WHERE subcategory_id = %s", (subcategory_id,))
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    name = cat[0]["name"]

    summary = _rows("SELECT * FROM category_flow_intensity(%s) WHERE category = %s", (date, name))

    schemes = _rows(
        """
        SELECT m.*, fi.flow_intensity_1d, fi.flow_intensity_7d, fi.flow_intensity_30d, fi.flow_intensity_mtd,
               r.return_1m, r.return_3m, r.return_6m, r.return_1y, r.return_3y
        FROM per_scheme_full_metrics(%(date)s, NULL) m
        JOIN scheme s ON s.scheme_id = m.scheme_id
        JOIN scheme_flow_intensity(%(date)s, NULL) fi ON fi.scheme_id = m.scheme_id
        LEFT JOIN scheme_trailing_returns(%(date)s) r ON r.scheme_id = m.scheme_id
        WHERE s.subcategory_id = %(subcat_id)s
        ORDER BY m.latest_aum DESC
        """,
        {"date": date, "subcat_id": subcategory_id},
    )

    amc_split = _rows(
        """
        SELECT fh.name AS fund_house, SUM(m.latest_aum) AS aum, SUM(m.sales_1d) AS sales_1d, SUM(m.sales_30d) AS sales_30d
        FROM per_scheme_full_metrics(%(date)s, NULL) m
        JOIN scheme s ON s.scheme_id = m.scheme_id
        JOIN fund_house fh ON fh.fund_house_id = s.fund_house_id
        WHERE s.subcategory_id = %(subcat_id)s
        GROUP BY fh.name
        ORDER BY aum DESC
        """,
        {"date": date, "subcat_id": subcategory_id},
    )

    return {
        "as_of": date,
        "category_id": subcategory_id,
        "name": name,
        "summary": summary[0] if summary else None,
        "amc_split": amc_split,
        "schemes": schemes,
    }


@router.get("/category/{subcategory_id}/series")
def category_series(subcategory_id: int, start_date: datetime.date, end_date: datetime.date):
    """Daily AUM + net flow series for the category detail page charts."""
    if (end_date - start_date).days > 400:
        raise HTTPException(status_code=400, detail="Range too large (max ~400 days)")
    return {"series": _rows("SELECT * FROM category_daily_series(%s, %s, %s)", (start_date, end_date, subcategory_id))}


@router.get("/category/{subcategory_id}/window-summary")
def category_window_summary(subcategory_id: int, date: datetime.date):
    """AUM/net-flow/market-effect across 1D/7D/14D/30D/MTD windows - backs
    the EntityHeader's window selector and the AUM-bridge waterfall chart."""
    return {"windows": _rows("SELECT * FROM category_window_summary(%s, %s)", (date, subcategory_id))}


@router.get("/category/{subcategory_id}/outlier-series")
def category_outlier_series(subcategory_id: int, date: datetime.date):
    """Category-level rolling 100-day outlier band (summed Sales across
    every scheme in the subcategory, with its own mean+-2SD bounds)."""
    return {"series": _rows("SELECT * FROM category_sales_outlier_series(%s, %s)", (subcategory_id, date))}


@router.get("/scheme")
def scheme_list(date: datetime.date, q: Optional[str] = None, limit: int = 500):
    """Scheme search/list for the Scheme List page (rail nav 'Scheme'
    with no id previously had no matching route at all - it fell
    through to the catch-all and rendered the unrelated Scheme Master
    app, confirmed 2026-10-30). Without a query, returns the top
    `limit` schemes by AUM; with `q`, name-searches across all schemes
    (not capped the same way) since a name search is already narrow."""
    metrics_rows = _rows(
        """
        WITH metrics AS MATERIALIZED (SELECT * FROM per_scheme_full_metrics(%(date)s, NULL)),
        scoped AS (
            SELECT m.*, fi.flow_intensity_1d, fi.flow_intensity_30d,
                   r.return_1y, r.return_3y,
                   s.fund_house_id, fh.name AS fund_house
            FROM metrics m
            JOIN scheme_flow_intensity(%(date)s, NULL) fi ON fi.scheme_id = m.scheme_id
            JOIN scheme s ON s.scheme_id = m.scheme_id
            JOIN fund_house fh ON fh.fund_house_id = s.fund_house_id
            LEFT JOIN scheme_trailing_returns(%(date)s) r ON r.scheme_id = m.scheme_id
            WHERE %(q)s IS NULL OR m.scheme_name ILIKE '%%' || %(q)s || '%%'
        )
        SELECT * FROM scoped ORDER BY latest_aum DESC LIMIT %(limit)s
        """,
        {"date": date, "q": q, "limit": limit},
    )
    return {"as_of": date, "schemes": metrics_rows}


@router.get("/scheme/{scheme_id}")
def scheme_detail(scheme_id: int, date: datetime.date):
    scheme = _rows(
        """
        SELECT s.scheme_id, s.scheme_name, c.category_id, c.name AS asset_class,
               sc.subcategory_id, sc.name AS category, fh.fund_house_id, fh.name AS fund_house
        FROM scheme s
        JOIN category c ON c.category_id = s.category_id
        LEFT JOIN subcategory sc ON sc.subcategory_id = s.subcategory_id
        JOIN fund_house fh ON fh.fund_house_id = s.fund_house_id
        WHERE s.scheme_id = %s
        """,
        (scheme_id,),
    )
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    scheme = scheme[0]

    metrics = _rows("SELECT * FROM per_scheme_full_metrics(%s, NULL) WHERE scheme_id = %s", (date, scheme_id))
    flow_intensity = _rows("SELECT * FROM scheme_flow_intensity(%s, NULL) WHERE scheme_id = %s", (date, scheme_id))
    returns = _rows("SELECT * FROM scheme_trailing_returns(%s) WHERE scheme_id = %s", (date, scheme_id))

    subcat_id = scheme["subcategory_id"]
    peers = _rows(
        """
        SELECT m.*, fi.flow_intensity_1d, fi.flow_intensity_30d,
               r.return_1m, r.return_1y, r.return_3y
        FROM per_scheme_full_metrics(%(date)s, NULL) m
        JOIN scheme s ON s.scheme_id = m.scheme_id
        JOIN scheme_flow_intensity(%(date)s, NULL) fi ON fi.scheme_id = m.scheme_id
        LEFT JOIN scheme_trailing_returns(%(date)s) r ON r.scheme_id = m.scheme_id
        WHERE """ + ("s.subcategory_id = %(peer_id)s" if subcat_id else "s.category_id = %(peer_id)s") + """
        ORDER BY m.latest_aum DESC
        """,
        {"date": date, "peer_id": subcat_id or scheme["category_id"]},
    )

    return {
        "as_of": date,
        "scheme": scheme,
        "metrics": metrics[0] if metrics else None,
        "flow_intensity": flow_intensity[0] if flow_intensity else None,
        "returns": returns[0] if returns else None,
        "peers": peers,
    }


@router.get("/scheme/{scheme_id}/window-summary")
def scheme_window_summary(scheme_id: int, date: datetime.date):
    """AUM/net-flow/market-effect across 1D/7D/14D/30D/MTD windows - backs
    the EntityHeader's window selector and the AUM-bridge waterfall chart."""
    return {"windows": _rows("SELECT * FROM scheme_window_summary(%s, %s)", (date, scheme_id))}


@router.get("/scheme/{scheme_id}/nav-series")
def scheme_nav_series(scheme_id: int, start_date: datetime.date, end_date: datetime.date):
    """NAV trend for the scheme detail chart."""
    if (end_date - start_date).days > 1200:
        raise HTTPException(status_code=400, detail="Range too large (max ~3.3 years)")
    return {"series": _rows("SELECT * FROM scheme_nav_series(%s, %s, %s)", (scheme_id, start_date, end_date))}


@router.get("/scheme/{scheme_id}/outlier-series")
def scheme_outlier_series(scheme_id: int, date: datetime.date):
    """Rolling 100-day daily-sales series with this scheme's own mean+-2SD
    bounds attached to every row, for the outlier band chart. Reuses the
    exact same bound calculation as rolling_100d_sales_stats() (008_rolling_stats.sql) -
    never a second, independently-computed version of the same bounds."""
    return {"series": _rows("SELECT * FROM scheme_sales_outlier_series(%s, %s)", (scheme_id, date))}


@router.get("/scheme/{scheme_id}/peer-scatter")
def scheme_peer_scatter(scheme_id: int, date: datetime.date):
    """AUM vs flow-intensity scatter for the scheme's peer set (same subcategory)."""
    scheme = _rows("SELECT subcategory_id FROM scheme WHERE scheme_id = %s", (scheme_id,))
    if not scheme or not scheme[0]["subcategory_id"]:
        return {"peers": []}
    return {"peers": _rows("SELECT * FROM peer_scatter(%s, %s)", (date, scheme[0]["subcategory_id"]))}


@router.get("/directory")
def directory():
    amcs = _rows("SELECT * FROM amc_directory()", ())
    categories = _rows("SELECT * FROM category_directory()", ())
    return {"amcs": amcs, "categories": categories}
