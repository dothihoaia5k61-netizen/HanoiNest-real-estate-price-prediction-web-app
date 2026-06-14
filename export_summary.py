"""
Script tổng hợp dữ liệu bất động sản Hà Nội.
Xuất các bảng tổng hợp theo: quận, loại hình, phường, đường phố.

Chạy: python export_summary.py
"""

from __future__ import annotations

import sys
from pathlib import Path

# Đảm bảo import đúng package
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

import pandas as pd

from src.housing_intel.market import (
    load_listing_data,
    prepare_market_data,
    summarize_by,
)

OUTPUT_DIR = PROJECT_ROOT / "exports"
OUTPUT_DIR.mkdir(exist_ok=True)


def vnd_tỷ(value):
    """Chuyển VNĐ → tỷ, làm tròn 2 chữ số."""
    if value is None or pd.isna(value):
        return None
    return round(float(value) / 1_000_000_000, 3)


def vnd_triệu_m2(value):
    """Chuyển VNĐ/m² → triệu/m², làm tròn 1 chữ số."""
    if value is None or pd.isna(value):
        return None
    return round(float(value) / 1_000_000, 1)


def format_summary(df: pd.DataFrame, group_col: str) -> pd.DataFrame:
    """Chuyển đơn vị và đặt tên cột tiếng Việt cho bảng tổng hợp."""
    out = df.copy()

    # Đổi tên cột nhóm sang tên thân thiện
    label_map = {
        "district_name": "Quận / Huyện",
        "property_type_name": "Loại hình BĐS",
        "ward_name": "Phường / Xã",
        "street_name": "Đường phố",
    }
    out = out.rename(columns={group_col: label_map.get(group_col, group_col)})

    # Chuyển đơn vị
    out["Số tin đăng"] = out["listing_count"].astype(int)
    out["Giá trung vị (tỷ VNĐ)"] = out["median_price_vnd"].apply(vnd_tỷ)
    out["Giá/m² trung vị (triệu)"] = out["median_price_per_m2_vnd"].apply(vnd_triệu_m2)
    out["Giá/m² Q25 (triệu)"] = out["q25_price_per_m2_vnd"].apply(vnd_triệu_m2)
    out["Giá/m² Q75 (triệu)"] = out["q75_price_per_m2_vnd"].apply(vnd_triệu_m2)
    out["Giá/m² P90 (triệu)"] = out["p90_price_per_m2_vnd"].apply(vnd_triệu_m2)

    keep = [
        label_map.get(group_col, group_col),
        "Số tin đăng",
        "Giá trung vị (tỷ VNĐ)",
        "Giá/m² trung vị (triệu)",
        "Giá/m² Q25 (triệu)",
        "Giá/m² Q75 (triệu)",
        "Giá/m² P90 (triệu)",
    ]
    return out[keep].reset_index(drop=True)


def main():
    print("[1/4] Dang load du lieu CSV...")
    raw = load_listing_data()
    print(f"   -> {len(raw):,} dong tho")

    print("[2/4] Dang lam sach du lieu...")
    df = prepare_market_data(raw)
    print(f"   -> {len(df):,} dong sau lam sach")

    groups = [
        ("district_name", 20, "theo_quan"),
        ("property_type_name", 10, "theo_loai_hinh"),
        ("ward_name", 20, "theo_phuong"),
        ("street_name", 20, "theo_duong"),
    ]

    sheets: dict[str, pd.DataFrame] = {}

    for col, min_count, sheet_name in groups:
        print(f"\n[OK] Tong hop {col} (min {min_count} tin)...")
        raw_summary = summarize_by(df, col, min_count=min_count)
        formatted = format_summary(raw_summary, col)
        sheets[sheet_name] = formatted
        print(f"   -> {len(formatted)} nhom")

    # ── Xuất CSV riêng lẻ ──────────────────────────────────────────────────
    for sheet_name, data in sheets.items():
        csv_path = OUTPUT_DIR / f"summary_{sheet_name}.csv"
        data.to_csv(csv_path, index=False, encoding="utf-8-sig")
        print(f"\n[SAVED] CSV: {csv_path}")

    # ── Xuất Excel (multi-sheet) ────────────────────────────────────────────
    excel_path = OUTPUT_DIR / "hanoi_market_summary.xlsx"
    sheet_labels = {
        "theo_quan": "Theo Quận",
        "theo_loai_hinh": "Theo Loại Hình",
        "theo_phuong": "Theo Phường",
        "theo_duong": "Theo Đường Phố",
    }

    with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
        for sheet_key, data in sheets.items():
            label = sheet_labels.get(sheet_key, sheet_key)
            data.to_excel(writer, sheet_name=label, index=False)

            # Auto-fit cột
            ws = writer.sheets[label]
            for col_idx, column_cells in enumerate(ws.columns, 1):
                max_len = max(
                    len(str(cell.value)) if cell.value is not None else 0
                    for cell in column_cells
                )
                ws.column_dimensions[column_cells[0].column_letter].width = min(max_len + 4, 50)

    print(f"\n[SAVED] Excel: {excel_path}")
    print("\n=== HOAN TAT! Kiem tra thu muc: exports/ ===")


if __name__ == "__main__":
    main()
