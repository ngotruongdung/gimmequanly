
// api/webhook.js
// Xử lý Webhook:
// 1. Từ Supabase (Sự kiện DB) -> Gửi thông báo
// 2. Từ App Client (Test Connection) -> Gửi tin test

export default async function handler(req, res) {
  // 1. Cấu hình CORS để cho phép App (Client) gọi vào kiểm tra
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, table, record, old_record, text } = req.body;
  const BOT_TOKEN = process.env.ZALO_BOT_TOKEN;
  const GROUP_ID = process.env.ZALO_GROUP_ID;

  if (!BOT_TOKEN || !GROUP_ID) {
    console.error("Missing Zalo Config (Env vars)");
    return res.status(500).json({ error: 'Server misconfiguration: Missing BOT_TOKEN or GROUP_ID' });
  }

  console.log(`Webhook received. Table: ${table || 'N/A'}, Type: ${type || 'MANUAL_TEST'}`);

  let message = '';

  // --- TRƯỜNG HỢP 0: TEST THỦ CÔNG TỪ GIAO DIỆN APP ---
  // Khi bạn bấm "Test Gửi tin" và điền URL Webhook này vào cấu hình
  if (text && !table) {
      message = text; // Sử dụng nội dung test gửi từ client
      console.log("Processing manual test message");
  }

  // --- TRƯỜNG HỢP 1: YÊU CẦU MỚI (Requests INSERT) ---
  else if (table === 'requests' && type === 'INSERT') {
    const typeStr = record.type === 'LEAVE' ? 'XIN NGHỈ' : 'XIN ĐỔI CA';
    const swapInfo = record.type === 'SWAP' ? `\n🔄 Đề xuất đổi với: ${record.target_user_name || 'N/A'}` : '';
    
    // Mapping thứ trong tuần
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
    const dayStr = days[record.day_index] || 'Ngày khác';

    message = `🔔 [YÊU CẦU MỚI]\n👤 Nhân sự: ${record.user_name}\n📝 Loại: ${typeStr}\n📅 Thứ: ${dayStr}\n💬 Lý do: ${record.reason}${swapInfo}\n👉 Quản lý kiểm tra app ngay!`;
  }

  // --- TRƯỜNG HỢP 2: NHÂN VIÊN NỘP LỊCH (Users UPDATE) ---
  else if (table === 'users' && type === 'UPDATE') {
    const wasSubmitted = old_record?.is_availability_submitted;
    const isSubmitted = record.is_availability_submitted;

    if (!wasSubmitted && isSubmitted) {
      message = `✅ [ĐĂNG KÝ LỊCH]\n👤 ${record.name} đã hoàn tất đăng ký lịch rảnh.\n(Zalo: ${record.zalo_phone || 'Không có'})`;
    }
  }

  // --- TRƯỜNG HỢP 3: DUYỆT YÊU CẦU (Requests UPDATE) ---
  else if (table === 'requests' && type === 'UPDATE') {
    if (old_record.status === 'PENDING' && record.status !== 'PENDING') {
      const statusIcon = record.status === 'APPROVED' ? '✅' : '❌';
      const statusText = record.status === 'APPROVED' ? 'ĐÃ DUYỆT' : 'ĐÃ TỪ CHỐI';
      message = `${statusIcon} [CẬP NHẬT YÊU CẦU]\nYêu cầu của ${record.user_name} đã được xử lý: ${statusText}`;
    }
  }

  // Gửi tin nhắn đến Zalo nếu có nội dung
  if (message) {
    try {
      const zaloUrl = `https://openapi.zalo.me/v2.0/oa/message?access_token=${BOT_TOKEN}`;
      const payload = {
        recipient: { user_id: GROUP_ID },
        message: { text: message }
      };

      const zRes = await fetch(zaloUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const zData = await zRes.json();
      console.log("Zalo Response:", zData);
      
      if (zData.error !== 0) {
          return res.status(400).json({ error: 'Zalo API Error', details: zData });
      }

      return res.status(200).json({ success: true, zalo: zData });

    } catch (e) {
      console.error("Zalo Send Error:", e);
      return res.status(500).json({ error: 'Failed to send Zalo message' });
    }
  }

  return res.status(200).json({ message: 'No notification needed' });
}
