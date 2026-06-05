from __future__ import annotations

from typing import Any

import pandas as pd
import streamlit as st

from src.housing_intel.market import (
    compute_deal_score,
    find_comparable_listings,
    load_listing_data,
    market_position_for_payload,
    prepare_market_data,
    summarize_by,
)
from src.housing_intel.predictor import format_vnd, load_model_artifact, predict_from_payload


st.set_page_config(
    page_title="Hanoi Real Estate Intelligence",
    page_icon="🏠",
    layout="wide",
    initial_sidebar_state="expanded",
)


DISTRICT_OPTIONS = [
    "Ba Đình",
    "Hoàn Kiếm",
    "Tây Hồ",
    "Long Biên",
    "Cầu Giấy",
    "Đống Đa",
    "Hai Bà Trưng",
    "Hoàng Mai",
    "Thanh Xuân",
    "Nam Từ Liêm",
    "Bắc Từ Liêm",
    "Hà Đông",
    "Sơn Tây",
    "Ba Vì",
    "Chương Mỹ",
    "Đan Phượng",
    "Đông Anh",
    "Gia Lâm",
    "Hoài Đức",
    "Mê Linh",
    "Mỹ Đức",
    "Phú Xuyên",
    "Phúc Thọ",
    "Quốc Oai",
    "Sóc Sơn",
    "Thạch Thất",
    "Thanh Oai",
    "Thanh Trì",
    "Thường Tín",
    "Ứng Hòa",
]

PROPERTY_TYPE_OPTIONS = [
    "Nhà",
    "Căn hộ chung cư",
    "Đất",
    "Biệt thự/Nhà liền kề",
    "Shophouse",
]

DIRECTION_OPTIONS = [
    "Unknown",
    "Đông",
    "Tây",
    "Nam",
    "Bắc",
    "Đông Bắc",
    "Đông Nam",
    "Tây Bắc",
    "Tây Nam",
]


st.markdown(
    """
    <style>
    .block-container {
        padding-top: 1.4rem;
        padding-bottom: 2rem;
    }
    .main-title {
        font-size: 34px;
        font-weight: 800;
        line-height: 1.18;
        margin-bottom: 4px;
    }
    .sub-title {
        color: #5f6368;
        font-size: 15px;
        margin-bottom: 18px;
    }
    .note {
        color: #6b7280;
        font-size: 13px;
    }
    .score-box {
        border: 1px solid rgba(31, 41, 55, 0.14);
        border-radius: 8px;
        padding: 18px 20px;
        background: #ffffff;
    }
    .score-number {
        font-size: 42px;
        font-weight: 850;
        color: #0f766e;
        line-height: 1;
    }
    .score-label {
        color: #334155;
        font-weight: 700;
        margin-top: 8px;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_resource(show_spinner=False)
def cached_artifact() -> dict[str, Any] | None:
    try:
        return load_model_artifact()
    except Exception as exc:
        st.error(f"Không load được model: {exc}")
        return None


@st.cache_data(show_spinner=False)
def cached_market_data() -> pd.DataFrame:
    return prepare_market_data(load_listing_data())


def build_sidebar_payload() -> tuple[dict[str, Any], float | None]:
    st.sidebar.title("Thông tin bất động sản")
    st.sidebar.caption("Dữ liệu hiện là snapshot listing Hà Nội trong tháng 06/2025.")

    property_type_name = st.sidebar.selectbox("Loại bất động sản", PROPERTY_TYPE_OPTIONS, index=0)
    district_name = st.sidebar.selectbox("Quận/Huyện", DISTRICT_OPTIONS, index=4)
    ward_name = st.sidebar.text_input("Phường/Xã", value="Dịch Vọng")
    street_name = st.sidebar.text_input("Tên đường", value="Cầu Giấy")
    project_name = st.sidebar.text_input("Tên dự án", value="Unknown")

    st.sidebar.divider()

    area = st.sidebar.number_input("Diện tích (m2)", min_value=10.0, max_value=1000.0, value=50.0, step=1.0)
    bedroom_count = st.sidebar.number_input("Số phòng ngủ", min_value=0, max_value=30, value=3, step=1)
    bathroom_count = st.sidebar.number_input("Số phòng tắm", min_value=0, max_value=30, value=3, step=1)
    floor_count = st.sidebar.number_input("Số tầng", min_value=0, max_value=50, value=4, step=1)

    frontage_width = st.sidebar.number_input("Mặt tiền (m)", min_value=0.0, max_value=80.0, value=4.0, step=0.1)
    house_depth = st.sidebar.number_input("Chiều sâu nhà (m)", min_value=0.0, max_value=100.0, value=12.0, step=0.1)
    road_width = st.sidebar.number_input("Độ rộng đường (m)", min_value=0.0, max_value=80.0, value=5.0, step=0.1)

    st.sidebar.divider()

    house_direction = st.sidebar.selectbox("Hướng nhà", DIRECTION_OPTIONS, index=0)
    balcony_direction = st.sidebar.selectbox("Hướng ban công", DIRECTION_OPTIONS, index=0)
    published_at = st.sidebar.date_input("Ngày đăng tin", value=pd.Timestamp("2025-06-15"))

    st.sidebar.divider()
    asking_price_billion = st.sidebar.number_input(
        "Giá rao hiện tại (tỷ VNĐ)",
        min_value=0.0,
        max_value=500.0,
        value=0.0,
        step=0.1,
        help="Nhập giá rao để app chấm Deal Score. Để 0 nếu chưa có giá rao.",
    )

    payload = {
        "property_type_name": property_type_name,
        "province_name": "Hà Nội",
        "district_name": district_name,
        "ward_name": ward_name,
        "street_name": street_name,
        "project_name": project_name or "Unknown",
        "area": float(area),
        "floor_count": int(floor_count),
        "frontage_width": float(frontage_width) if frontage_width > 0 else None,
        "house_depth": float(house_depth) if house_depth > 0 else None,
        "road_width": float(road_width) if road_width > 0 else None,
        "bedroom_count": int(bedroom_count),
        "bathroom_count": int(bathroom_count),
        "house_direction": house_direction,
        "balcony_direction": balcony_direction,
        "published_at": pd.Timestamp(published_at).isoformat(),
    }
    asking_price = asking_price_billion * 1_000_000_000 if asking_price_billion > 0 else None
    return payload, asking_price


def display_price_delta(label: str, gap_percent: float | None) -> None:
    if gap_percent is None:
        st.metric(label, "Chưa đủ dữ liệu")
        return

    st.metric(label, f"{gap_percent:+.1f}%")


def format_money_columns(df: pd.DataFrame) -> pd.DataFrame:
    formatted = df.copy()
    for col in formatted.columns:
        if "price" in col and pd.api.types.is_numeric_dtype(formatted[col]):
            formatted[col] = formatted[col].map(lambda value: format_vnd(float(value)) if pd.notna(value) else "")
    return formatted


payload, asking_price = build_sidebar_payload()
artifact = cached_artifact()
market_df = cached_market_data()

prediction = None
if artifact is not None:
    prediction = predict_from_payload(payload, artifact=artifact)

market_position = market_position_for_payload(market_df, payload)
deal_score = compute_deal_score(
    asking_price_vnd=asking_price,
    predicted_price_vnd=prediction.predicted_price_vnd if prediction else None,
    market_position=market_position,
    area_m2=payload.get("area"),
)

st.markdown('<div class="main-title">Hanoi Real Estate Intelligence</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="sub-title">Prototype phân tích giá rao bất động sản Hà Nội: định giá, so sánh thị trường, listing tương tự và deal score.</div>',
    unsafe_allow_html=True,
)

if prediction:
    cols = st.columns(4)
    cols[0].metric("Giá model ước lượng", prediction.formatted_price)
    cols[1].metric(
        "Giá model / m2",
        format_vnd(prediction.predicted_price_per_m2_vnd) if prediction.predicted_price_per_m2_vnd else "N/A",
    )
    cols[2].metric("Model", prediction.selected_model or "N/A")
    cols[3].metric("Market rows", f"{len(market_df):,}")
else:
    st.warning("Chưa có model hợp lệ để dự đoán. Các tab market vẫn có thể dùng từ CSV.")

tabs = st.tabs(["Định giá", "So sánh thị trường", "Listing tương tự", "Deal Score", "Dashboard"])

with tabs[0]:
    left, right = st.columns([1.05, 0.95])

    with left:
        st.subheader("Kết quả định giá")
        if prediction:
            st.metric("Giá dự đoán", prediction.formatted_price)
            if prediction.predicted_price_per_m2_vnd:
                st.metric("Giá dự đoán / m2", format_vnd(prediction.predicted_price_per_m2_vnd))

            if asking_price:
                gap = (asking_price - prediction.predicted_price_vnd) / prediction.predicted_price_vnd * 100
                st.metric("Giá rao so với model", f"{gap:+.1f}%")
                st.caption(f"Giá rao: {format_vnd(asking_price)}")

            if prediction.warnings:
                st.warning(" | ".join(prediction.warnings))
        else:
            st.info("Hãy kiểm tra file model trong thư mục models.")

    with right:
        st.subheader("Input gửi vào model")
        st.dataframe(pd.DataFrame([payload]), width="stretch", hide_index=True)
        st.markdown(
            '<div class="note">Kết quả chỉ là tham khảo từ dữ liệu listing, không phải giá giao dịch đã công chứng.</div>',
            unsafe_allow_html=True,
        )

with tabs[1]:
    st.subheader("So sánh với nhóm thị trường tương tự")
    if market_position:
        cols = st.columns(5)
        cols[0].metric("Nhóm so sánh", market_position.group)
        cols[1].metric("Số listing", f"{market_position.listing_count:,}")
        cols[2].metric("Median giá", format_vnd(market_position.median_price_vnd or 0))
        cols[3].metric("Median giá/m2", format_vnd(market_position.median_price_per_m2_vnd or 0))
        if prediction and prediction.predicted_price_per_m2_vnd and market_position.median_price_per_m2_vnd:
            market_gap = (
                prediction.predicted_price_per_m2_vnd - market_position.median_price_per_m2_vnd
            ) / market_position.median_price_per_m2_vnd * 100
            cols[4].metric("Model vs median/m2", f"{market_gap:+.1f}%")

        band = pd.DataFrame(
            [
                {
                    "Mốc": "Q25",
                    "Giá/m2": market_position.q25_price_per_m2_vnd,
                },
                {
                    "Mốc": "Median",
                    "Giá/m2": market_position.median_price_per_m2_vnd,
                },
                {
                    "Mốc": "Q75",
                    "Giá/m2": market_position.q75_price_per_m2_vnd,
                },
            ]
        )
        st.bar_chart(band.set_index("Mốc"))
    else:
        st.info("Nhóm quận/loại bất động sản này chưa đủ listing để thống kê tin cậy.")

with tabs[2]:
    st.subheader("Listing tương tự")
    comparables = find_comparable_listings(market_df, payload, top_n=15)
    if comparables.empty:
        st.info("Không tìm thấy listing tương tự với bộ lọc hiện tại.")
    else:
        st.dataframe(format_money_columns(comparables), width="stretch", hide_index=True)
        st.caption("Danh sách được lọc theo quận, loại bất động sản và sắp xếp theo độ gần diện tích.")

with tabs[3]:
    st.subheader("Deal Score")
    left, right = st.columns([0.8, 1.2])

    with left:
        st.markdown(
            f"""
            <div class="score-box">
                <div class="score-number">{deal_score.score}</div>
                <div class="score-label">{deal_score.label}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with right:
        display_price_delta("Giá rao vs model", deal_score.price_gap_percent)
        display_price_delta("Giá rao/m2 vs median thị trường", deal_score.market_gap_percent)
        for note in deal_score.notes:
            st.write(f"- {note}")

with tabs[4]:
    st.subheader("Market Dashboard")

    by_district = summarize_by(market_df, "district_name", min_count=50)
    by_type = summarize_by(market_df, "property_type_name", min_count=50)

    left, right = st.columns(2)
    with left:
        st.markdown("**Top quận/huyện theo median giá/m2**")
        st.dataframe(format_money_columns(by_district.head(12)), width="stretch", hide_index=True)

    with right:
        st.markdown("**Theo loại bất động sản**")
        st.dataframe(format_money_columns(by_type), width="stretch", hide_index=True)

    chart_df = by_district.head(15).set_index("district_name")["median_price_per_m2_vnd"]
    st.bar_chart(chart_df)

st.divider()
st.caption(
    "Prototype dùng dữ liệu listing Hà Nội tháng 06/2025. Bước tiếp theo: chuyển các hàm lõi này thành FastAPI endpoints rồi xây web frontend."
)
