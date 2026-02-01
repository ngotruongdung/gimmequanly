
export type Role = 'MANAGER' | 'STAFF' | 'OPERATIONS';

export type Rank = 'S' | 'A' | 'B' | 'C';

export interface User {
  id: string;
  name: string;
  role: Role;
  rank?: Rank; 
  password: string; 
  avatar?: string;
  revenue?: number; 
  zaloPhone?: string; // Số điện thoại Zalo để nhận thông báo
  isAvailabilitySubmitted?: boolean; // Đánh dấu đã chốt đăng ký rảnh (reset theo tuần)
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

export interface Availability {
  userId: string;
  dayIndex: number; 
  shiftId: string;
  weekId: string; // Format: "YYYY-MM-W1"
}

export interface StreamerAssignment {
  userId: string;
  timeLabel?: string; // Ví dụ: "10:00 - 11:00" dành cho ca kẹp mẫu
}

export interface ScheduleItem {
  id: string;
  dayIndex: number;
  shiftId: string;
  weekId: string; // Format: "YYYY-MM-W1"
  streamerAssignments: StreamerAssignment[]; 
  opsUserId: string | null; 
  note?: string;
  isFinalized?: boolean; // Đánh dấu lịch đã chốt
}

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type RequestType = 'LEAVE' | 'SWAP';

export interface ShiftRequest {
  id: string;
  userId: string;
  userName: string;
  type: RequestType;
  dayIndex: number;
  shiftId: string;
  weekId: string; // Format: "YYYY-MM-W1"
  reason: string;
  proposedTime?: string; 
  targetUserId?: string; // ID của người được đề nghị thay thế
  targetUserName?: string; // Tên của người được đề nghị thay thế
  status: RequestStatus;
  createdAt: number;
}

export type ViewMode = 'DASHBOARD' | 'MY_AVAILABILITY' | 'STAFF_MANAGEMENT' | 'SETTINGS' | 'REQUESTS' | 'REPORTS';
