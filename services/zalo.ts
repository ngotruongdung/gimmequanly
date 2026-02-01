
import { User, ShiftRequest, Shift } from '../types';
import { DAYS_OF_WEEK } from '../constants';

export interface ZaloConfig {
  webhookUrl: string; 
  botToken: string;   
  groupId: string;    
}

export const ZaloService = {
  config: null as ZaloConfig | null,

  setConfig: (config: ZaloConfig) => {
    ZaloService.config = config;
  },

  /**
   * Helper function để gửi request
   */
  sendRequest: async (text: string) => {
    if (!ZaloService.config) return false;
    const { botToken, groupId, webhookUrl } = ZaloService.config;

    // ==========================================
    // STRATEGY 1: WEBHOOK (Ưu tiên nhất nếu có)
    // ==========================================
    if (webhookUrl && webhookUrl.trim() !== "") {
       // Nếu user nhập nhầm Zalo API vào ô Webhook -> Bỏ qua để xuống Strategy 2
       if (webhookUrl.includes('zalo.me')) {
           // Fallthrough
       } else {
           console.log("🚀 Sending generic webhook...");
           try {
               // 1.1 Direct Webhook (No-Cors mode for max compatibility)
               await fetch(webhookUrl, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ text, message: text, chat_id: groupId }),
                   mode: 'no-cors' 
               });
               console.log("✅ Webhook sent (no-cors mode)");
               return true;
           } catch (e) {
               // 1.2 Webhook via Proxy (Fallback)
               try {
                   const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(webhookUrl)}`;
                   await fetch(proxyUrl, {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ text, message: text, chat_id: groupId })
                   });
                   return true;
               } catch(err) {
                   console.error("Webhook failed", err);
               }
           }
       }
    }

    // ==========================================
    // STRATEGY 2: NATIVE ZALO OA (Chính Hãng)
    // ==========================================
    if (botToken && groupId) {
        const payload = {
            recipient: { user_id: groupId },
            message: { text: text }
        };
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'access_token': botToken
        };
        const targetUrl = 'https://openapi.zalo.me/v2.0/oa/message';

        // 2.1: Thử dùng Serverless Proxy (Vercel)
        let serverlessSuccess = false;
        try {
            // Check nếu endpoint này tồn tại (chỉ có trên Production Vercel)
            // Ta dùng timeout ngắn 2s để fail nhanh nếu không có
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            const proxyRes = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: targetUrl,
                    method: 'POST',
                    headers: headers,
                    body: payload
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const contentType = proxyRes.headers.get("content-type");
            if (proxyRes.ok && contentType && contentType.includes("application/json")) {
                const data = await proxyRes.json();
                if (data.error === 0) {
                    console.log("✅ Zalo sent via Serverless Proxy");
                    serverlessSuccess = true;
                    return true;
                } else if (data.error === -124) {
                    console.error("❌ Token Zalo hết hạn.");
                    return false;
                }
            }
        } catch (e) {
            // Ignore error, fallback to next method
        }

        if (serverlessSuccess) return true;

        // 2.2: Thử Public Proxies (AllOrigins / CorsProxy)
        // QUAN TRỌNG: AllOrigins và các proxy free thường xóa custom Headers.
        // Giải pháp: Gửi token qua URL Query Parameter (?access_token=...) thay vì Header.
        const targetUrlWithToken = `https://openapi.zalo.me/v2.0/oa/message?access_token=${botToken}`;
        
        const publicProxies = [
            (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        ];

        for (const makeProxyUrl of publicProxies) {
            try {
                // Với AllOrigins, ta gọi URL đã gắn token, và bỏ header access_token đi để tránh conflict/lọc
                const finalUrl = makeProxyUrl(targetUrlWithToken);
                console.log("Trying Proxy:", finalUrl);

                const res = await fetch(finalUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }, // Chỉ giữ Content-Type
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.error === 0) {
                        console.log("✅ Zalo sent via Public Proxy (Query Param Token)");
                        return true;
                    } else if (data && data.error !== 0) {
                         console.warn("⚠️ Proxy response error:", data);
                         // Nếu Zalo trả về lỗi rõ ràng (ví dụ sai token), thì return false luôn, ko cần thử proxy khác
                         if (data.error === -124) return false;
                    }
                }
            } catch (e) {
                console.warn("Proxy attempt failed", e);
            }
        }
        
        console.error("❌ All Zalo sending methods failed.");
    }

    return false;
  },

  testConnection: async (config: ZaloConfig) => {
    const oldConfig = ZaloService.config;
    ZaloService.setConfig(config);
    
    // Gửi tin nhắn
    const success = await ZaloService.sendRequest("🔔 [LiveSync] Kết nối thành công! Hệ thống đã sẵn sàng.");
    
    if (!oldConfig) ZaloService.setConfig(config);
    return success;
  },

  sendMessage: async (message: string) => {
    return ZaloService.sendRequest(message);
  },

  notifyNewRequest: async (request: ShiftRequest, manager: User, shift: Shift) => {
    const typeStr = request.type === 'LEAVE' ? 'XIN NGHỈ' : 'XIN ĐỔI CA';
    const dayStr = DAYS_OF_WEEK[request.dayIndex];
    const swapInfo = request.type === 'SWAP' ? `\n🔄 Đề xuất: ${request.targetUserName}` : '';
    
    const message = `🔔 [YÊU CẦU MỚI]\n👤 Nhân sự: ${request.userName}\n📝 Loại: ${typeStr}\n📅 Ca: ${dayStr} (${shift.name})${swapInfo}\n💬 Lý do: ${request.reason}\n👉 Quản lý kiểm tra app!`;
    
    return ZaloService.sendMessage(message);
  },

  notifyAvailabilitySubmitted: async (user: User, manager: User) => {
    const message = `✅ [ĐĂNG KÝ LỊCH]\n👤 ${user.name} đã gửi lịch rảnh tuần tới.`;
    return ZaloService.sendMessage(message);
  },

  notifyScheduleFinalized: async (staffList: User[]) => {
    const message = `📅 [LỊCH TUẦN MỚI]\nAdmin đã chốt lịch Live tuần tới.\n👉 Mọi người vào app kiểm tra ca trực nhé!`;
    return ZaloService.sendMessage(message);
  },

  notifyShiftReminder: async (user: User, shift: Shift, dayName: string) => {
    const message = `⏰ [NHẮC CA LIVE]\n👋 ${user.name} ơi,\nBạn có ca ${shift.name} hôm nay (${dayName}).\nKhung giờ: ${shift.startTime} - ${shift.endTime}.\nLên sóng đúng giờ nhé! 🚀`;
    return ZaloService.sendMessage(message);
  }
};
