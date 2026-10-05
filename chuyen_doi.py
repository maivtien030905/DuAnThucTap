import json
import random

# Danh sách random dữ liệu giả lập
cay_trong_list = ["Lúa", "Rau", "Cây ăn quả", "Ngô", "Khoai"]

# 1. Đọc file tọa độ thô bạn vừa vẽ
with open("toa_do_tho.json", "r", encoding="utf-8") as f:
    raw_data = json.load(f)

danh_sach_features_moi = []
dem = 1

# 2. Quét qua từng hình bạn vẽ và tự động bơm thuộc tính (Độ ẩm, Cây trồng...)
for feature in raw_data.get("features", []):
    # Chỉ xử lý các đa giác hợp lệ (bỏ qua các điểm click nhầm)
    if feature["geometry"]["type"] == "Polygon" and len(feature["geometry"]["coordinates"][0]) >= 4:
        # Bơm dữ liệu
        feature["properties"] = {
            "id": f"T{dem}",
            "ten": f"Thửa {dem}",
            "cay_trong": random.choice(cay_trong_list),
            "dien_tich": random.randint(1000, 3000),
            "do_am": random.randint(20, 90),
            "nhiet_do": round(random.uniform(25.0, 35.0), 1)
        }
        danh_sach_features_moi.append(feature)
        dem += 1

# 3. Tự động cắm thêm 2 mốc (Nhà kho và Giếng tưới) vào giữa cánh đồng
# Lấy tọa độ thửa đầu tiên làm tâm để đặt Nhà kho và Giếng lân cận
if len(danh_sach_features_moi) > 0:
    tam_lng = danh_sach_features_moi[0]["geometry"]["coordinates"][0][0][0]
    tam_lat = danh_sach_features_moi[0]["geometry"]["coordinates"][0][0][1]
    
    danh_sach_features_moi.append({"type": "Feature", "properties": {"id": "M1", "ten": "Nhà kho trung tâm", "loai": "nha_kho"}, "geometry": {"type": "Point", "coordinates": [tam_lng + 0.0005, tam_lat]}})
    danh_sach_features_moi.append({"type": "Feature", "properties": {"id": "M2", "ten": "Giếng tưới số 1", "loai": "gieng"}, "geometry": {"type": "Point", "coordinates": [tam_lng - 0.0005, tam_lat + 0.0005]}})

# Đóng gói dữ liệu chuẩn
final_data = {"type": "FeatureCollection", "features": danh_sach_features_moi}

# 4. Xuất ra 2 file chuẩn cho Đồ án
with open("data.json", "w", encoding="utf-8") as f:
    json.dump(final_data, f, ensure_ascii=False, indent=2)

with open("data.js", "w", encoding="utf-8") as f:
    f.write(f"const du_lieu_nong_trai = {json.dumps(final_data, ensure_ascii=False, indent=2)};")

print(f"✅ Thành công! Đã tự động xử lý {dem-1} thửa đất và cắm mốc giếng/nhà kho.")
print("✅ Hãy tải lại trang web (F5) để xem thành quả!")