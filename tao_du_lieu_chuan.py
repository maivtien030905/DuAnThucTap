import json
import random

features = []
cay_trong_list = ["Lúa", "Rau", "Cây ăn quả", "Ngô", "Khoai"]

# Tọa độ khu vực cánh đồng hiện tại của bạn
start_lng = 105.9520
start_lat = 19.9740
step = 0.0008

dem = 1
# Tạo tự động 10 thửa (2 hàng x 5 cột)
for hang in range(2):
    for cot in range(5):
        lng = start_lng + cot * step
        lat = start_lat + hang * step

        poly = [
            [lng, lat], [lng + step*0.9, lat], 
            [lng + step*0.9, lat + step*0.9], [lng, lat + step*0.9], [lng, lat]
        ]

        features.append({
            "type": "Feature",
            "properties": {
                "id": f"T{dem}",
                "ten": f"Thửa {dem}",
                "cay_trong": cay_trong_list[dem % 5], # Chia đều đủ 5 loại cây
                "dien_tich": random.randint(1500, 3500),
                "do_am": random.randint(20, 90),
                "nhiet_do": round(random.uniform(25.0, 35.0), 1)
            },
            "geometry": {"type": "Polygon", "coordinates": [poly]}
        })
        dem += 1

# Thêm 2 mốc 
features.append({"type": "Feature", "properties": {"id": "M1", "ten": "Nhà kho trung tâm", "loai": "nha_kho"}, "geometry": {"type": "Point", "coordinates": [105.9540, 19.9748]}})
features.append({"type": "Feature", "properties": {"id": "M2", "ten": "Giếng tưới số 1", "loai": "gieng"}, "geometry": {"type": "Point", "coordinates": [105.9560, 19.9752]}})

data = {"type": "FeatureCollection", "features": features}

# Ghi đè vào file data
with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open("data.js", "w", encoding="utf-8") as f:
    f.write(f"const du_lieu_nong_trai = {json.dumps(data, ensure_ascii=False, indent=2)};")

print("✅ Đã tạo bộ dữ liệu 10 thửa chuẩn và 5 loại cây!")