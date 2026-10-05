// Khai báo 2 loại bản đồ (Vệ tinh và Đường phố)
const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: '© Esri Vệ tinh'
});
const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
});

// Khởi tạo bản đồ, bật sẵn Vệ tinh và nút Fullscreen
const map = L.map('map', {
  center: [19.9754, 105.9546],
  zoom: 16,
  layers: [satLayer], // Bản đồ mặc định
  fullscreenControl: true // Bật nút phóng to toàn màn hình
});

// Thêm nút chuyển đổi 2 lớp bản đồ ở góc trên bên phải
const baseMaps = {
  "Bản đồ Vệ tinh": satLayer,
  "Bản đồ Địa hình": streetLayer
};
L.control.layers(baseMaps).addTo(map);

// (Giữ nguyên các đoạn code từ biến geojsonLayer trở đi...)
let geojsonLayer;
const SERVER_API = "http://127.0.0.1:8000";

// BẢNG CHÚ GIẢI (LEGEND) CHỐNG LỖI GOOGLE DỊCH
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'info legend glass-panel');
  div.innerHTML = `
    <h4 style="margin: 0 0 10px 0; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Loại cây</h4>
    <div class="legend-item"><div class="legend-color" style="background:#ffeb3b"></div> <span>Lúa</span></div>
    <div class="legend-item"><div class="legend-color" style="background:#4caf50"></div> <span>Rau</span></div>
    <div class="legend-item"><div class="legend-color" style="background:#ff9800"></div> <span>Cây ăn quả</span></div>
    <div class="legend-item"><div class="legend-color" style="background:#8bc34a"></div> <span>Ngô</span></div>
    <div class="legend-item"><div class="legend-color" style="background:#795548"></div> <span>Khoai</span></div>
  `;
  return div;
};
legend.addTo(map);

function styleMacDinh(feature) {
  if (feature.geometry.type === "Point") return {};
  let mauNen = '#ffffff', cay = feature.properties.cay_trong;
  if (cay === 'Lúa') mauNen = '#ffeb3b';
  else if (cay === 'Rau') mauNen = '#4caf50';
  else if (cay === 'Cây ăn quả') mauNen = '#ff9800';
  else if (cay === 'Ngô') mauNen = '#8bc34a';
  else if (cay === 'Khoai') mauNen = '#795548';
  
  return { fillColor: mauNen, weight: 2, color: 'white', dashArray: '4', fillOpacity: 0.6 };
}

geojsonLayer = L.geoJSON(du_lieu_nong_trai, {
  style: styleMacDinh,
  onEachFeature: function (feature, layer) {
    if (feature.properties && feature.geometry.type !== "Point") {
      layer.bindPopup(`<b>${feature.properties.ten}</b><br>Cây: ${feature.properties.cay_trong}<br>DT: ${feature.properties.dien_tich}m²<br>Độ ẩm: ${feature.properties.do_am}%`);
    }
  }
}).addTo(map);

// --- PHẦN MỚI 1: TÍNH TOÁN DASHBOARD VÀ VẼ BIỂU ĐỒ ---
function khoiTaoThongKe() {
  let tongThua = 0, tongDienTich = 0, tongDoAm = 0;
  let thongKeCay = { "Lúa": 0, "Rau": 0, "Cây ăn quả": 0, "Ngô": 0, "Khoai": 0 };

  du_lieu_nong_trai.features.forEach(f => {
    if (f.geometry.type === "Polygon") {
      tongThua++;
      tongDienTich += f.properties.dien_tich;
      tongDoAm += f.properties.do_am;
      if(thongKeCay[f.properties.cay_trong] !== undefined) thongKeCay[f.properties.cay_trong]++;
    }
  });

  document.getElementById('tong-thua').innerText = tongThua;
  document.getElementById('tong-dt').innerText = tongDienTich.toLocaleString();
  document.getElementById('tb-doam').innerText = tongThua > 0 ? Math.round(tongDoAm / tongThua) : 0;

  // Vẽ biểu đồ tròn Chart.js
  const ctx = document.getElementById('cropChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(thongKeCay),
      datasets: [{
        data: Object.values(thongKeCay),
        backgroundColor: ['#ffeb3b', '#4caf50', '#ff9800', '#8bc34a', '#795548']
      }]
    },
    options: { plugins: { legend: { display: false } }, maintainAspectRatio: false }
  });
}
khoiTaoThongKe();

// --- PHẦN MỚI 2: NHẬN DIỆN GIỌNG NÓI (VOICE SEARCH) ---
const micBtn = document.getElementById('mic-btn');
const inputField = document.getElementById('user-input');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'vi-VN';
  recognition.continuous = false;
  
  recognition.onstart = function() {
    micBtn.classList.add('recording');
    inputField.placeholder = "Đang nghe bạn nói...";
  };
  
  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    inputField.value = transcript;
    xuLyCauHoi(); // Gửi câu hỏi ngay sau khi nói xong
  };
  
  recognition.onend = function() {
    micBtn.classList.remove('recording');
    inputField.placeholder = "Nhắn tin hoặc bấm Mic để nói...";
  };
}

function batDauGhiAm() {
  if (recognition) recognition.start();
  else alert("Trình duyệt của bạn không hỗ trợ tính năng giọng nói (Hãy dùng Google Chrome).");
}

// --- LOGIC CHAT VÀ ZOOM BẢN ĐỒ CŨ ---
function themTinNhan(text, sender, msgId = null) {
  const chatBox = document.getElementById('chat-box');
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}-msg`;
  if (msgId) msgDiv.id = msgId;
  
  if (sender === 'bot') {
    msgDiv.innerHTML = `<i class="fas fa-seedling bot-icon"></i> <span>${text}</span>`;
  } else {
    msgDiv.innerText = text;
  }
  
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function xuLyCauHoi() {
  const text = inputField.value.trim();
  if (!text) return;
  themTinNhan(text, 'user');
  inputField.value = '';

  const loadingId = "loading-" + Date.now();
  themTinNhan("⏳ Đang phân tích dữ liệu...", 'bot', loadingId);

  try {
    const res = await fetch(`${SERVER_API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    document.getElementById(loadingId).remove();
    themTinNhan(data.reply, 'bot');
    if (data.ids && data.ids.length > 0) highlightThuaDat(data.ids);
  } catch (err) {
    document.getElementById(loadingId).remove();
    themTinNhan("❌ Lỗi kết nối tới Server AI.", 'bot');
  }
}

function highlightThuaDat(danhSachId) {
  let bounds = L.latLngBounds();
  let coKetQua = false;
  geojsonLayer.eachLayer(layer => {
    if (layer.feature.geometry.type !== "Point") {
      if (danhSachId.includes(layer.feature.properties.id)) {
        layer.setStyle({ fillColor: '#ff1744', color: '#ffffff', weight: 4, fillOpacity: 0.8 });
        layer.openPopup();
        bounds.extend(layer.getBounds());
        coKetQua = true;
      } else {
        geojsonLayer.resetStyle(layer);
      }
    }
  });
  if (coKetQua) map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
}

inputField.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') xuLyCauHoi();
});
// --- PHẦN MỚI 3: LOGIC THANH LỌC NHANH ---
function bamNutLocNhanh(cauHoi) {
  const inputField = document.getElementById('user-input');
  
  // Điền câu hỏi vào khung chat
  inputField.value = cauHoi;
  
  // Gọi hàm xử lý chat của AI ngay lập tức
  xuLyCauHoi(); 
}