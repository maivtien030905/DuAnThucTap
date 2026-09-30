// 1. Khởi tạo bản đồ Leaflet
const map = L.map('map').setView([19.9734, 105.9358], 17);

// Bản đồ vệ tinh Esri World Imagery
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: '© Esri &mdash; Dữ liệu vệ tinh'
}).addTo(map);

let geojsonLayer;
const SERVER_API = "http://127.0.0.1:8000";

// Style mặc định phân màu theo cây trồng
function styleMacDinh(feature) {
  if (feature.geometry.type === "Point") return {};
  
  let mauNen = '#ffffff'; 
  let cay = feature.properties.cay_trong;
  
  if (cay === 'Lúa') mauNen = '#ffeb3b';
  else if (cay === 'Rau') mauNen = '#4caf50';
  else if (cay === 'Cây ăn quả') mauNen = '#ff9800';
  else if (cay === 'Ngô') mauNen = '#8bc34a';
  else if (cay === 'Khoai') mauNen = '#795548';
  
  return {
    fillColor: mauNen,
    weight: 2, 
    opacity: 1,
    color: 'white', 
    dashArray: '4',
    fillOpacity: 0.55
  };
}

// Nạp dữ liệu lên bản đồ
geojsonLayer = L.geoJSON(du_lieu_nong_trai, {
  style: styleMacDinh,
  onEachFeature: function (feature, layer) {
    if (feature.properties) {
      let popupContent = `<b>${feature.properties.ten || "Điểm mốc"}</b><br>`;
      if (feature.properties.cay_trong) popupContent += `Cây trồng: ${feature.properties.cay_trong}<br>`;
      if (feature.properties.dien_tich) popupContent += `Diện tích: ${feature.properties.dien_tich} m²<br>`;
      if (feature.properties.do_am) popupContent += `Độ ẩm: ${feature.properties.do_am}%<br>`;
      layer.bindPopup(popupContent);
    }
  }
}).addTo(map);

// 2. Logic xử lý Chat
function themTinNhan(text, sender) {
  const chatBox = document.getElementById('chat-box');
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}-msg`;
  msgDiv.innerText = text;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function xuLyCauHoi() {
  const input = document.getElementById('user-input');
  const text = input.value.trim();
  if (!text) return;

  themTinNhan(text, 'user');
  input.value = '';
  const textLower = text.toLowerCase();

  try {
    let responseData = [];
    let botReply = "";

    if (textLower.includes("lúa") || textLower.includes("rau") || textLower.includes("cây ăn quả") || textLower.includes("ngô") || textLower.includes("khoai")) {
      let cay = "Lúa";
      if (textLower.includes("rau")) cay = "Rau";
      if (textLower.includes("cây ăn quả")) cay = "Cây ăn quả";
      if (textLower.includes("ngô")) cay = "Ngô";
      if (textLower.includes("khoai")) cay = "Khoai";

      const res = await fetch(`${SERVER_API}/api/loc_thua?cay_trong=${encodeURIComponent(cay)}`);
      const json = await res.json();
      responseData = json.data;
      botReply = `Tìm thấy ${responseData.length} thửa trồng ${cay}: ${responseData.map(t => t.ten).join(', ')}`;
    }
    else if (textLower.includes("khô") || textLower.includes("thấp nhất")) {
      const res = await fetch(`${SERVER_API}/api/thua_cuc_tri?thuoc_tinh=do_am&loai=min`);
      const json = await res.json();
      responseData = json.data;
      botReply = `Thửa có độ ẩm thấp nhất là ${responseData[0].ten} (${responseData[0].do_am}%).`;
    }
    else if (textLower.includes("rộng nhất") || textLower.includes("lớn nhất")) {
      const res = await fetch(`${SERVER_API}/api/thua_cuc_tri?thuoc_tinh=dien_tich&loai=max`);
      const json = await res.json();
      responseData = json.data;
      botReply = `Thửa rộng nhất là ${responseData[0].ten} (${responseData[0].dien_tich} m²).`;
    }
    else if (textLower.includes("giếng") || textLower.includes("gần giếng")) {
      const res = await fetch(`${SERVER_API}/api/thua_gan_moc?loai_moc=gieng&ban_kinh_met=150`);
      const json = await res.json();
      responseData = json.data;
      botReply = `Các thửa nằm trong bán kính 150m gần giếng tưới: ${responseData.map(t => t.ten).join(', ')}`;
    }
    else {
      botReply = "Xin lỗi, tôi chưa hiểu rõ ý bạn. Bạn hãy thử hỏi: 'Thửa nào trồng ngô?', 'Thửa nào rộng nhất?' hoặc 'Thửa nào gần giếng?'";
    }

    themTinNhan(botReply, 'bot');
    highlightThuaDat(responseData.map(item => item.id));

  } catch (err) {
    themTinNhan("Lỗi kết nối tới server Backend! Bạn đã chạy 'uvicorn main:app --reload' chưa?", 'bot');
  }
}

// 3. Xử lý câu hỏi người dùng (Gửi thẳng cho AI xử lý)
async function xuLyCauHoi() {
  const input = document.getElementById('user-input');
  const text = input.value.trim();
  if (!text) return;

  themTinNhan(text, 'user');
  input.value = '';

  try {
    // Gọi API Chat POST đến Backend Python
    const res = await fetch(`${SERVER_API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    
    const data = await res.json();
    
    // In câu trả lời tự nhiên của AI ra màn hình
    themTinNhan(data.reply, 'bot');
    
    // Tự động highlight và zoom tới các thửa đất AI tìm được
    highlightThuaDat(data.ids);

  } catch (err) {
    themTinNhan("Lỗi! Hãy kiểm tra xem Backend đã chạy và bạn đã nhập API Key Google chưa nhé.", 'bot');
  }
}

document.getElementById('user-input').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') xuLyCauHoi();
});