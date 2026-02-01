
// api/webhook.js
// Xử lý Webhook từ Supabase -> Gửi Zalo

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, table, record, old_record } = req.body;
  const BOT_TOKEN = process.env.ZALO_BOT_TOKEN;
  const GROUP_ID = process.env.ZALO_GROUP_ID;

  if (!BOT_TOKEN || !GROUP_ID) {
    console.error("Missing Zalo Config (Env vars)");
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  console.log(`Received Webhook: ${type} on ${table}`);

  let message = '';

  // 1. Xử lý khi có Yêu cầu mới (Requests)
  if (table === 'requests' && type === 'INSERT') {
    const typeStr = record.type === 'LEAVE' ? 'XIN NGHỈ' : 'XIN ĐỔI CA';
    const swapInfo = record.type === 'SWAP' ? `\n🔄 Đề xuất đổi với: ${record.target_user_name || 'N/A'}` : '';
    
    // Lưu ý: day_index là số 0-6. Cần mapping nếu muốn đẹp, ở đây hiển thị số hoặc map đơn giản
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
    const dayStr = days[record.day_index] || 'Ngày khác';

    message = `🔔 [YÊU CẦU MỚI]\n👤 Nhân sự: ${record.user_name}\n📝 Loại: ${typeStr}\n📅 Thứ: ${dayStr}\n💬 Lý do: ${record.reason}${swapInfo}\n👉 Quản lý kiểm tra app ngay!`;
  }

  // 2. Xử lý khi Nhân viên nộp lịch (Users update is_availability_submitted)
  else if (table === 'users' && type === 'UPDATE') {
    const wasSubmitted = old_record?.is_availability_submitted;
    const isSubmitted = record.is_availability_submitted;

    if (!wasSubmitted && isSubmitted) {
      message = `✅ [ĐĂNG KÝ LỊCH]\n👤 ${record.name} đã hoàn tất đăng ký lịch rảnh.\n(Zalo: ${record.zalo_phone || 'Không có'})`;
    }
  }

  // 3. Xử lý khi Duyệt yêu cầu (Requests update status)
  else if (table === 'requests' && type === 'UPDATE') {
    if (old_record.status === 'PENDING' && record.status !== 'PENDING') {
      const statusIcon = record.status === 'APPROVED' ? '✅' : '❌';
      const statusText = record.status === 'APPROVED' ? 'ĐÃ DUYỆT' : 'ĐÃ TỪ CHỐI';
      message = `${statusIcon} [CẬP NHẬT YÊU CẦU]\nYêu cầu của ${record.user_name} đã được xử lý: ${statusText}`;
    }
  }

  // Gửi tin nhắn nếu có nội dung
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
      
      return res.status(200).json({ success: true, zalo: zData });

    } catch (e) {
      console.error("Zalo Send Error:", e);
      return res.status(500).json({ error: 'Failed to send Zalo message' });
    }
  }

  return res.status(200).json({ message: 'No action needed' });
}
