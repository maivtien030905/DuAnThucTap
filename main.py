import google.generativeai as genai
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import logging
from shapely.geometry import shape

# 1. CẤU HÌNH TẠO FILE NHẬT KÝ (LOG) THEO YÊU CẦU GIẢNG VIÊN
logging.basicConfig(
    filename="nhat_ky_ai.txt", 
    level=logging.INFO, 
    format="%(asctime)s | CÂU HỎI: %(message)s", 
    encoding="utf-8"
)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Nạp dữ liệu
with open("data.json", "r", encoding="utf-8") as f:
    du_lieu = json.load(f)

# Biến tạm để lưu ID thửa đất sau khi AI gọi hàm
danh_sach_id_tim_duoc = []

# --- 2. ĐỊNH NGHĨA CÁC CÔNG CỤ (TOOLS) CHO AI SỬ DỤNG ---

def loc_thua(cay_trong: str = ""):
    """Tìm hoặc lọc các thửa đất dựa theo tên loại cây trồng (Lúa, Rau, Ngô, Khoai, Cây ăn quả)."""
    global danh_sach_id_tim_duoc
    ket_qua = [f["properties"] for f in du_lieu["features"] if f["geometry"]["type"] == "Polygon" and cay_trong.lower() in f["properties"]["cay_trong"].lower()]
    danh_sach_id_tim_duoc = [k["id"] for k in ket_qua]
    logging.info(f"AI đã gọi hàm [loc_thua] với tham số: cay_trong='{cay_trong}' -> Tìm thấy {len(ket_qua)} thửa.")
    return ket_qua

def thua_cuc_tri(thuoc_tinh: str, loai: str):
    """Tìm thửa đất có giá trị cao nhất (max) hoặc thấp nhất (min) của một thuộc tính (như: do_am, nhiet_do, dien_tich)."""
    global danh_sach_id_tim_duoc
    danh_sach = [f["properties"] for f in du_lieu["features"] if f["geometry"]["type"] == "Polygon"]
    ket_qua = max(danh_sach, key=lambda x: x[thuoc_tinh]) if loai == "max" else min(danh_sach, key=lambda x: x[thuoc_tinh])
    danh_sach_id_tim_duoc = [ket_qua["id"]]
    logging.info(f"AI đã gọi hàm [thua_cuc_tri] với tham số: thuoc_tinh='{thuoc_tinh}', loai='{loai}' -> Kết quả: {ket_qua['ten']}.")
    return [ket_qua]

def thua_gan_moc(loai_moc: str, ban_kinh_met: float):
    """Tìm các thửa đất nằm gần một mốc (gieng hoặc nha_kho) trong phạm vi bán kính (mét) cho trước."""
    global danh_sach_id_tim_duoc
    HE_SO_QUY_DOI = 111000
    ket_qua = []
    moc_geom = next((shape(f["geometry"]) for f in du_lieu["features"] if f["geometry"]["type"] == "Point" and f["properties"]["loai"] == loai_moc), None)
    
    if moc_geom:
        for f in du_lieu["features"]:
            if f["geometry"]["type"] == "Polygon":
                if (moc_geom.distance(shape(f["geometry"])) * HE_SO_QUY_DOI) <= ban_kinh_met:
                    ket_qua.append(f["properties"])
                    
    danh_sach_id_tim_duoc = [k["id"] for k in ket_qua]
    logging.info(f"AI đã gọi hàm [thua_gan_moc] với tham số: loai_moc='{loai_moc}', ban_kinh='{ban_kinh_met}m' -> Tìm thấy {len(ket_qua)} thửa.")
    return ket_qua

# --- 3. CẤU HÌNH GEMINI AI ---
genai.configure(api_key="AIzaSyBxxxxxxx_Ma_Key_Cua_Ban_xxxxxxx")
model = genai.GenerativeModel(
    model_name='gemini-1.5-flash',
    tools=[loc_thua, thua_cuc_tri, thua_gan_moc], # Cấp cho AI 3 công cụ này
    system_instruction="Bạn là Trợ lý AI Bản đồ Nông nghiệp. Hãy dùng các công cụ (tools) được cấp để tìm dữ liệu, sau đó trả lời người nông dân một cách ngắn gọn, thân thiện bằng tiếng Việt."
)

class ChatRequest(BaseModel):
    message: str

# --- 4. API LẮNG NGHE CHAT TỪ FRONTEND ---
@app.post("/api/chat")
def chat_voi_ai(req: ChatRequest):
    global danh_sach_id_tim_duoc
    danh_sach_id_tim_duoc = [] # Reset lại ID mỗi lần hỏi
    
    # Ghi nhận câu hỏi vào file log
    logging.info(f"Người dùng hỏi: '{req.message}'")
    
    # Khởi động chat và cho phép AI tự động gọi hàm
    chat = model.start_chat(enable_automatic_function_calling=True)
    response = chat.send_message(req.message)
    
    return {
        "reply": response.text, 
        "ids": danh_sach_id_tim_duoc
    }