# Kế hoạch chuẩn bị Web App phân tích bất động sản Hà Nội

## Định hướng sản phẩm

Project nên phát triển theo hướng **Hanoi Real Estate Intelligence Platform** thay vì chỉ là app dự đoán giá nhà. Mục tiêu là giúp người dùng trả lời các câu hỏi thực tế:

- Căn này đang rẻ, hợp lý hay đắt so với thị trường?
- Giá hợp lý nên nằm trong khoảng nào?
- Những listing tương tự đang rao bao nhiêu?
- Quận/phường/loại bất động sản nào đang có mặt bằng giá tốt?
- Yếu tố nào làm giá tăng hoặc giảm?

Dữ liệu hiện tại là snapshot listing Hà Nội trong tháng 06/2025, nên app nên gọi đúng bản chất là **giá rao/listing tham khảo**, chưa phải giá giao dịch thực tế.

## MVP hợp lý nhất

MVP nên có 5 màn hình chính:

1. **Valuation**
   - Form nhập thông tin bất động sản.
   - Trả về giá dự đoán, giá/m2, khoảng giá tham khảo.
   - Cảnh báo khi input thiếu nhiều trường quan trọng.

2. **Market Compare**
   - So sánh căn đang nhập với mặt bằng quận/huyện, loại bất động sản và khoảng diện tích tương tự.
   - Hiển thị median, Q25, Q75, P90 giá/m2.

3. **Comparable Listings**
   - Tìm 5-20 listing giống nhất.
   - Bảng so sánh: quận, phường, đường, diện tích, giá, giá/m2, số phòng.

4. **Dải giá tham chiếu**
   - Hiển thị Q25, median và Q75 theo nhóm thị trường tương tự.
   - Cho biết giá model nằm trong, thấp hơn hay cao hơn dải giá phổ biến.
   - Hiển thị độ phủ dữ liệu thay vì đưa ra điểm mua/bán dễ gây hiểu nhầm.

5. **Market Dashboard**
   - Giá/m2 theo quận.
   - Phân phối giá theo loại bất động sản.
   - Top khu vực đắt/rẻ.

## Kiến trúc nên chuẩn bị

```text
src/
  housing_intel/
    predictor.py      # load model, feature engineering, predict
    market.py         # clean listing data, market stats, comparables
api/
  main.py             # FastAPI sau này
app/
  streamlit_app.py    # prototype UI sau này
docs/
  web_app_preparation.md
models/
  hanoi_house_price_model.joblib
  metrics.json
  model_card.md
```

Luồng xử lý nên là:

```text
CSV/model artifacts -> src/housing_intel -> FastAPI -> Web frontend
                                  |
                                  -> Streamlit prototype
```

## API contract nên thiết kế trước

### POST /predict

Input là thông tin bất động sản. Output cần có:

- `predicted_price_vnd`
- `predicted_price_per_m2_vnd`
- `formatted_price`
- `selected_model`
- `warnings`

### POST /market/compare

Input giống `/predict`. Output:

- thống kê giá/m2 theo quận
- thống kê giá/m2 theo loại bất động sản
- vị trí của căn đang xét so với thị trường

### POST /comparables

Output:

- danh sách listing tương tự
- điểm tương đồng
- khoảng giá tham khảo từ các listing tương tự

### GET /market/districts

Output:

- bảng tổng hợp theo quận/huyện
- số listing
- median giá
- median giá/m2

## Nâng cấp model nên làm sau bước chuẩn bị

Model hiện tại tốt để demo, nhưng để làm web app thuyết phục hơn nên bổ sung:

- Train thêm model dự đoán `price_per_m2`.
- Train quantile model để trả khoảng giá P10/P50/P90.
- So sánh model theo từng phân khúc: Nhà, Căn hộ chung cư, Đất, Biệt thự/Nhà liền kề.
- Thử CatBoost hoặc LightGBM vì dữ liệu tabular có nhiều categorical và missing value.
- Báo cáo metric theo quận và loại bất động sản, không chỉ metric tổng.

## Thứ tự làm tiếp

1. Tách logic predict và market analytics ra khỏi Streamlit.
2. Làm Streamlit prototype nhiều tab dựa trên module đã tách.
3. Thêm FastAPI dùng cùng module lõi.
4. Khi API ổn, mới làm web frontend thật.
5. Train model nâng cấp và thay artifact.
