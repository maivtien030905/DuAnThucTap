from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
from shapely.geometry import shape, Point

app = FastAPI()

# Cho phép Frontend (file HTML) giao tiếp được với Backend mà không bị chặn
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Nạp dữ liệu từ file JSON vào bộ nhớ
with open("data.json", "r", encoding="utf-8") as f:
    du_lieu = json.load(f)

# --- HÀM 1: LỌC THỬA THEO ĐIỀU KIỆN ---
@app.get("/api/loc_thua")
def loc_thua(cay_trong: str = None, do_am_duoi: float = None):
    ket_qua = []
    for f in du_lieu["features"]:
        if f["geometry"]["type"] == "Polygon":
            props = f["properties"]
            thoa_man = True
            
            # Lọc theo cây trồng (chuyển về chữ thường để so sánh)
            if cay_trong and props["cay_trong"].lower() != cay_trong.lower():
                thoa_man = False
            # Lọc theo độ ẩm
            if do_am_duoi and props["do_am"] >= do_am_duoi:
                thoa_man = False
                
            if thoa_man:
                ket_qua.append(props)
    return {"data": ket_qua}

# --- HÀM 2: TÌM CỰC TRỊ (Cao nhất / Thấp nhất) ---
@app.get("/api/thua_cuc_tri")
def thua_cuc_tri(thuoc_tinh: str, loai: str):
    # thuoc_tinh có thể là "do_am", "nhiet_do", "dien_tich"
    # loai là "min" hoặc "max"
    danh_sach_thua = [f for f in du_lieu["features"] if f["geometry"]["type"] == "Polygon"]
    
    if not danh_sach_thua:
        return {"data": []}

    if loai == "max":
        thua_tim_duoc = max(danh_sach_thua, key=lambda x: x["properties"][thuoc_tinh])
    else:
        thua_tim_duoc = min(danh_sach_thua, key=lambda x: x["properties"][thuoc_tinh])
        
    return {"data": [thua_tim_duoc["properties"]]}

# --- HÀM 3: TÌM THỬA ĐẤT GẦN ĐIỂM MỐC ---
@app.get("/api/thua_gan_moc")
def thua_gan_moc(loai_moc: str, ban_kinh_met: float):
    # 1 độ GPS xấp xỉ 111,000 mét. Ta dùng hệ số này để quy đổi đơn giản.
    HE_SO_QUY_DOI = 111000 
    ket_qua = []
    
    # 1. Tìm tọa độ của điểm mốc (gieng hoặc nha_kho)
    moc_geom = None
    for f in du_lieu["features"]:
        if f["geometry"]["type"] == "Point" and f["properties"]["loai"] == loai_moc:
            moc_geom = shape(f["geometry"])
            break
            
    if not moc_geom:
        return {"error": "Không tìm thấy điểm mốc này"}

    # 2. Đo khoảng cách từ điểm mốc đến các thửa đất bằng thư viện Shapely
    for f in du_lieu["features"]:
        if f["geometry"]["type"] == "Polygon":
            thua_geom = shape(f["geometry"])
            khoang_cach_do = moc_geom.distance(thua_geom)
            khoang_cach_met = khoang_cach_do * HE_SO_QUY_DOI
            
            if khoang_cach_met <= ban_kinh_met:
                props = f["properties"].copy()
                props["khoang_cach_thuc_te"] = round(khoang_cach_met, 2)
                ket_qua.append(props)
                
    return {"data": ket_qua}