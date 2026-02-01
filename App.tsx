
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Clock, 
  Settings, 
  LogOut, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Wrench,
  CheckCircle2,
  XCircle,
  MessageSquare,
  History,
  Info,
  Link as LinkIcon,
  Layers,
  ArrowRightLeft,
  Bell,
  MessageCircle,
  Send,
  Key,
  RefreshCw,
  Check,
  MousePointer2,
  CalendarCheck,
  UserPlus,
  Save,
  Mic2,
  Shield,
  Gem,
  Award,
  Crown,
  Star,
  ListTodo,
  RotateCcw,
  FileSpreadsheet,
  Download,
  BarChart3,
  Loader2,
  LogIn,
  Menu,
  X,
  Palette,
  Bot
} from 'lucide-react';
import { User, Shift, Availability, ScheduleItem, ViewMode, Rank, Role, ShiftRequest, RequestStatus, RequestType } from './types';
import { DAYS_OF_WEEK } from './constants';
import { Button } from './components/Button';
import { Modal } from './components/Modal';
import { LoginPage } from './components/LoginPage';
import { ZaloService, ZaloConfig } from './services/zalo';
import { api } from './services/api';
import { autoGenerateSchedule } from './services/scheduler';

// --- Helper Components ---
const RankBadge: React.FC<{ rank?: Rank, size?: 'sm' | 'md' }> = ({ rank, size = 'sm' }) => {
  if (!rank) return null;
  const config = {
    'S': { color: 'bg-yellow-50 text-yellow-700 border-yellow-200 ring-yellow-100', icon: <Crown size={size === 'sm' ? 10 : 14} className="fill-yellow-500"/>, label: 'Super' },
    'A': { color: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-100', icon: <Award size={size === 'sm' ? 10 : 14} className="fill-purple-500"/>, label: 'Pro' },
    'B': { color: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-100', icon: <Star size={size === 'sm' ? 10 : 14} className="fill-blue-500"/>, label: 'Active' },
    'C': { color: 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-100', icon: <Gem size={size === 'sm' ? 10 : 14} className="fill-slate-400"/>, label: 'Newbie' },
  };
  
  const current = config[rank];
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold border shadow-sm ring-1 ring-inset ${current.color} ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
      {current.icon}
      {size === 'md' && <span>{current.label}</span>}
      {rank}
    </span>
  );
};

const RoleBadge: React.FC<{ role: Role }> = ({ role }) => {
  const config = {
    'MANAGER': { color: 'bg-slate-800 text-white border-slate-700', icon: <Shield size={10}/>, label: 'Quản lý' },
    'OPERATIONS': { color: 'bg-orange-50 text-orange-700 border-orange-200', icon: <Wrench size={10}/>, label: 'Vận hành' },
    'STAFF': { color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: <Mic2 size={10}/>, label: 'Streamer' },
  };
  const current = config[role];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border shadow-sm tracking-wide ${current.color}`}>
      {current.icon}
      {current.label}
    </span>
  );
};

export default function App() {
  // --- STATE ---
  
  // System State
  const [isLoading, setIsLoading] = useState(true);
  
  // Persistent Login State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('ls_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  
  const [isLoginPageOpen, setIsLoginPageOpen] = useState(false);
  
  // View Mode: Initialize based on saved user role to restore correct screen on reload
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('ls_user');
      if (saved) {
        const u = JSON.parse(saved);
        // If staff, go to availability. If manager, go to dashboard.
        return u.role === 'MANAGER' ? 'DASHBOARD' : 'MY_AVAILABILITY';
      }
    } catch (e) {}
    return 'DASHBOARD';
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Date Management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(1);

  const getWeekId = (date: Date, week: number) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}-W${week}`;
  };

  const currentWeekId = useMemo(() => getWeekId(currentDate, currentWeek), [currentDate, currentWeek]);

  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [requests, setRequests] = useState<ShiftRequest[]>([]);

  // Calculate Dates for the current week
  const weekDates = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const dayOfWeek = startOfMonth.getDay(); 
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const firstMonday = new Date(startOfMonth);
    firstMonday.setDate(startOfMonth.getDate() + diff);
    const startOfCurrentWeek = new Date(firstMonday);
    startOfCurrentWeek.setDate(firstMonday.getDate() + (currentWeek - 1) * 7);
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfCurrentWeek);
        d.setDate(startOfCurrentWeek.getDate() + i);
        dates.push(d);
    }
    return dates;
  }, [currentDate, currentWeek]);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const formatDate = (date: Date) => `${date.getDate()}/${date.getMonth() + 1}`;

  // UI State (Modals, Forms)
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);
  const [isEditUser, setIsEditUser] = useState(false); // Track if we are editing or creating

  const [editingSlot, setEditingSlot] = useState<{day: number, shiftId: string} | null>(null);
  const [slotTab, setSlotTab] = useState<'STREAMER' | 'OPS'>('STREAMER');
  const [requestForm, setRequestForm] = useState<{type: RequestType, reason: string, targetUserId?: string, slot?: {day: number, shiftId: string}}>({
    type: 'SWAP',
    reason: ''
  });
  const [shiftFormData, setShiftFormData] = useState<Shift>({ id: '', name: '', startTime: '', endTime: '', color: '' });
  const [userFormData, setUserFormData] = useState<Partial<User>>({});
  const [bridgeData, setBridgeData] = useState<{
    userId: string;
    startTime: string;
    endTime: string;
    applyToNextShift: boolean;
  }>({ userId: '', startTime: '', endTime: '', applyToNextShift: true });

  // Zalo Settings
  const [zaloConfig, setZaloConfig] = useState<ZaloConfig>(() => {
    const saved = localStorage.getItem('ls_zalo_config');
    // Mặc định lấy Token và ChatID từ hình ảnh Postman bạn gửi
    const defaultToken = '3573748186453674284:QqhpitqfEgbvxrGkJqVRPMhBmXQupppywGMqeHXFqWHkigMkUiUGiCAcWrcNNzCE';
    const defaultGroupId = 'b2a2e14f1801f15fa810';
    
    return saved ? JSON.parse(saved) : { 
      webhookUrl: '', 
      botToken: defaultToken, 
      groupId: defaultGroupId 
    };
  });
  const [isZaloEnabled, setIsZaloEnabled] = useState(true);
  const [isTestingBot, setIsTestingBot] = useState(false);
  
  // Update service when config changes
  useEffect(() => {
    localStorage.setItem('ls_zalo_config', JSON.stringify(zaloConfig));
    ZaloService.setConfig(zaloConfig);
  }, [zaloConfig]);

  // --- INITIAL DATA FETCHING ---
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const uData = await api.getUsers();
      setUsers(uData);

      const [sData, schData, avData, reqData] = await Promise.all([
        api.getShifts(),
        api.getSchedule(currentWeekId),
        api.getAvailabilities(currentWeekId),
        api.getRequests(currentWeekId)
      ]);
      setShifts(sData);
      setSchedule(schData);
      setAvailabilities(avData);
      setRequests(reqData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentWeekId]); 

  // Sync currentUser with latest users data to ensure freshness
  useEffect(() => {
    if (currentUser && users.length > 0) {
        const freshUser = users.find(u => u.id === currentUser.id);
        if (freshUser) {
            // Check for differences to avoid unnecessary renders/writes
            const currentStr = JSON.stringify(currentUser);
            const freshStr = JSON.stringify(freshUser);
            if (currentStr !== freshStr) {
                setCurrentUser(freshUser);
                localStorage.setItem('ls_user', freshStr);
            }
        }
    }
  }, [users, currentUser]);

  // --- Derived Data ---
  const currentWeekSchedule = useMemo(() => schedule, [schedule]);
  const currentWeekAvailabilities = useMemo(() => availabilities, [availabilities]);
  const currentWeekRequests = useMemo(() => requests, [requests]);
  const pendingCount = useMemo(() => requests.filter(r => r.status === 'PENDING').length, [requests]);
  const staffUsers = useMemo(() => users.filter(u => u.role !== 'MANAGER'), [users]);
  const submittedCount = useMemo(() => staffUsers.filter(u => u.isAvailabilitySubmitted).length, [staffUsers]);

  const monthlyStats = useMemo(() => {
    return users.filter(u => u.role !== 'MANAGER').map(u => {
       const shiftCount = schedule.filter(s => 
           s.streamerAssignments.some(sa => sa.userId === u.id) || s.opsUserId === u.id
       ).length;
       const totalHours = shiftCount * 4; 
       return { ...u, shiftCount, totalHours };
    }).sort((a,b) => b.shiftCount - a.shiftCount);
  }, [schedule, users]);


  // --- ACTIONS ---

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('ls_user', JSON.stringify(user));
    setIsLoginPageOpen(false);
    setViewMode(user.role === 'MANAGER' ? 'DASHBOARD' : 'MY_AVAILABILITY');
  };

  const handleLogout = () => {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
        setCurrentUser(null);
        localStorage.removeItem('ls_user');
        setViewMode('DASHBOARD');
        setIsMobileMenuOpen(false);
    }
  };

  const checkAuth = (action: () => void) => {
      if (currentUser) {
          action();
      } else {
          if (confirm('Bạn cần đăng nhập để sử dụng tính năng này. Đăng nhập ngay?')) {
              setIsLoginPageOpen(true);
          }
      }
  };

  // --- Logic with API Calls ---

  const toggleAvailability = async (dayIndex: number, shiftId: string) => {
    if (!currentUser) return;
    try {
        await api.toggleAvailability({ userId: currentUser.id, dayIndex, shiftId, weekId: currentWeekId });
        const newAv = await api.getAvailabilities(currentWeekId);
        setAvailabilities(newAv);
    } catch (e) {
        alert("Lỗi cập nhật server");
    }
  };

  const handleSubmitAvailability = async () => {
    if (!currentUser) return;
    if(!confirm("Xác nhận gửi lịch đăng ký?")) return;

    try {
        const updatedUser = { ...currentUser, isAvailabilitySubmitted: true };
        // This UPDATE triggers the Webhook to send Zalo message automatically
        await api.updateUser({ id: currentUser.id, isAvailabilitySubmitted: true });
        
        setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
        setCurrentUser(updatedUser); 
        localStorage.setItem('ls_user', JSON.stringify(updatedUser));
        
        // Removed explicit ZaloService call here to avoid duplicate messages.
        // The Webhook on 'users' table update handles the notification.
        alert("Thành công! Admin sẽ nhận được thông báo.");
    } catch (e) {
        alert("Lỗi kết nối");
    }
  };

  const handleAutoSchedule = async () => {
    const newItems = autoGenerateSchedule(users, shifts, availabilities, schedule, currentWeekId);
    setIsLoading(true);
    try {
        await api.clearSchedule(currentWeekId); 
        for (const item of newItems) {
            await api.saveScheduleItem(item);
        }
        setSchedule(newItems);
    } catch(e) {
        console.error(e);
        alert("Lỗi lưu lịch tự động");
    } finally {
        setIsLoading(false);
    }
  };

  const createRequest = async () => {
    if (!currentUser || !requestForm.slot) return;
    const shift = shifts.find(s => s.id === requestForm.slot?.shiftId);
    const targetUser = users.find(u => u.id === requestForm.targetUserId);

    const newReq: ShiftRequest = {
      id: `req-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      type: requestForm.type,
      dayIndex: requestForm.slot.day,
      shiftId: requestForm.slot.shiftId,
      weekId: currentWeekId,
      reason: requestForm.reason,
      targetUserId: requestForm.targetUserId,
      targetUserName: targetUser?.name,
      status: 'PENDING',
      createdAt: Date.now()
    };
    
    try {
        // This INSERT triggers the Webhook to send Zalo message automatically
        await api.createRequest(newReq);
        setRequests([newReq, ...requests]);
        setIsRequestModalOpen(false);
        
        // Removed explicit ZaloService call here to avoid duplicate messages.
        // The Webhook on 'requests' table insert handles the notification.
    } catch (e) {
        alert("Lỗi gửi yêu cầu");
    }
  };

  const handleProcessRequest = async (reqId: string, status: RequestStatus) => {
    try {
        await api.updateRequestStatus(reqId, status);
        const req = requests.find(r => r.id === reqId);
        if (!req) return;

        if (status === 'APPROVED') {
            const existingItem = schedule.find(s => s.dayIndex === req.dayIndex && s.shiftId === req.shiftId && s.weekId === req.weekId);
            if (existingItem) {
                let newItem = { ...existingItem };
                if (req.type === 'LEAVE') {
                    newItem.streamerAssignments = newItem.streamerAssignments.filter(sa => sa.userId !== req.userId);
                    if (newItem.opsUserId === req.userId) newItem.opsUserId = null;
                } else if (req.type === 'SWAP') {
                    if (newItem.opsUserId === req.userId) newItem.opsUserId = req.targetUserId || null;
                    newItem.streamerAssignments = newItem.streamerAssignments.map(sa => 
                        sa.userId === req.userId ? { ...sa, userId: req.targetUserId! } : sa
                    );
                }
                await api.saveScheduleItem(newItem);
                const newSch = await api.getSchedule(currentWeekId);
                setSchedule(newSch);
            }
        }
        const newReqs = await api.getRequests(currentWeekId);
        setRequests(newReqs);

    } catch (e) {
        alert("Lỗi xử lý yêu cầu");
    }
  };

  const toggleStreamerInSlot = async (userId: string) => {
    if (!editingSlot) return;
    const existingItem = schedule.find(s => s.dayIndex === editingSlot.day && s.shiftId === editingSlot.shiftId && s.weekId === currentWeekId);
    
    let newItem: ScheduleItem;
    
    if (existingItem) {
        newItem = { ...existingItem };
        const idx = newItem.streamerAssignments.findIndex(s => s.userId === userId);
        if (idx > -1) {
            newItem.streamerAssignments.splice(idx, 1);
        } else {
            if (newItem.streamerAssignments.length >= 2) return alert('Tối đa 2 Streamer!');
            newItem.streamerAssignments.push({ userId });
        }
    } else {
        newItem = {
            id: `${currentWeekId}-${editingSlot.day}-${editingSlot.shiftId}`,
            dayIndex: editingSlot.day,
            shiftId: editingSlot.shiftId,
            weekId: currentWeekId,
            streamerAssignments: [{ userId }],
            opsUserId: null
        };
    }

    try {
        if (newItem.streamerAssignments.length === 0 && !newItem.opsUserId) {
            await api.deleteScheduleItem(newItem.id);
            setSchedule(schedule.filter(s => s.id !== newItem.id));
        } else {
            await api.saveScheduleItem(newItem);
            const saved = await api.getSchedule(currentWeekId);
            setSchedule(saved);
        }
    } catch(e) { console.error(e); }
  };

  const setOpsInSlot = async (userId: string | null) => {
    if (!editingSlot) return;
    const existingItem = schedule.find(s => s.dayIndex === editingSlot.day && s.shiftId === editingSlot.shiftId && s.weekId === currentWeekId);
    
    let newItem: ScheduleItem;
    if (existingItem) {
        newItem = { ...existingItem, opsUserId: userId };
    } else {
        if (!userId) return; 
        newItem = {
            id: `${currentWeekId}-${editingSlot.day}-${editingSlot.shiftId}`,
            dayIndex: editingSlot.day,
            shiftId: editingSlot.shiftId,
            weekId: currentWeekId,
            streamerAssignments: [],
            opsUserId: userId
        };
    }

    try {
        if (newItem.streamerAssignments.length === 0 && !newItem.opsUserId) {
            await api.deleteScheduleItem(newItem.id);
            setSchedule(schedule.filter(s => s.id !== newItem.id));
        } else {
            await api.saveScheduleItem(newItem);
            const saved = await api.getSchedule(currentWeekId);
            setSchedule(saved);
        }
    } catch(e) { console.error(e); }
  };

  const handleSaveBridge = async () => {
      alert("Tính năng Kẹp ca cần backend logic update phức tạp hơn, đang cập nhật...");
      handleCloseBridgeModal();
  };

  // --- User Management ---
  const handleSaveUser = async () => {
      if (!userFormData.name || !userFormData.id || !userFormData.password) {
        alert("Vui lòng nhập đầy đủ Tên, Mã nhân viên và Mật khẩu!");
        return;
      }
      try {
          const user = await api.updateUser(userFormData as User);
          setUsers(users.map(u => u.id === user.id ? user : u));
          if (!users.find(u => u.id === user.id)) setUsers([...users, user]);
          setIsUserModalOpen(false);
      } catch (e) { alert("Lỗi lưu user"); }
  };

  const handleDeleteUser = async (id: string) => {
      if (confirm("Xóa nhân sự?")) {
          try {
              await api.deleteUser(id);
              setUsers(users.filter(u => u.id !== id));
          } catch(e) { alert("Lỗi xóa"); }
      }
  };

  const handleOpenUserModal = (u?: User) => { 
      setIsEditUser(!!u);
      setUserFormData(u || { id: '', role: 'STAFF', rank: 'C', password: '123' }); 
      setIsUserModalOpen(true); 
  };

  // --- Shift Management ---
  const handleSaveShift = async () => {
    if (!shiftFormData.id || !shiftFormData.name || !shiftFormData.startTime || !shiftFormData.endTime) {
      alert("Vui lòng nhập đủ thông tin ca!");
      return;
    }
    try {
      const saved = await api.updateShift(shiftFormData);
      // Update local state
      const idx = shifts.findIndex(s => s.id === saved.id);
      if (idx > -1) {
        const newShifts = [...shifts];
        newShifts[idx] = saved;
        setShifts(newShifts.sort((a,b) => a.startTime.localeCompare(b.startTime)));
      } else {
        setShifts([...shifts, saved].sort((a,b) => a.startTime.localeCompare(b.startTime)));
      }
      setIsShiftModalOpen(false);
    } catch (e) { alert("Lỗi lưu ca làm việc"); }
  };

  const handleDeleteShift = async (id: string) => {
    if (confirm("Xóa ca làm việc này? Lịch làm việc liên quan sẽ bị ảnh hưởng.")) {
      try {
        await api.deleteShift(id);
        setShifts(shifts.filter(s => s.id !== id));
      } catch (e) { alert("Lỗi xóa ca"); }
    }
  };

  const handleOpenShiftModal = (s?: Shift) => {
    setShiftFormData(s || { id: '', name: '', startTime: '', endTime: '', color: 'bg-slate-100 text-slate-800 border-slate-200' });
    setIsShiftModalOpen(true);
  };


  // Handle Export (Mock)
  const handleExportExcel = () => { alert("Đang tải xuống báo cáo..."); };
  const handleCloseBridgeModal = () => { setIsBridgeModalOpen(false); setIsSlotModalOpen(true); };
  const handleOpenBridgeModal = (uid: string) => { setBridgeData({...bridgeData, userId: uid}); setIsSlotModalOpen(false); setIsBridgeModalOpen(true); };

  const handleTestBot = async () => {
    setIsTestingBot(true);
    try {
        const success = await ZaloService.testConnection(zaloConfig);
        if (success) alert("✅ Kết nối thành công! Đã gửi tin nhắn test.");
        else alert("❌ Kết nối thất bại. Xem Console (F12) để biết chi tiết.");
    } catch (e) {
        alert("Lỗi không xác định: " + e);
    } finally {
        setIsTestingBot(false);
    }
  };

  // --- RENDER ---
  if (isLoginPageOpen) {
    return <LoginPage onLogin={handleLogin} users={users} loading={isLoading} onBack={() => setIsLoginPageOpen(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] font-sans text-slate-900 pb-20 md:pb-0">
      
      {/* Mobile Top Bar with Menu */}
      <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100">
             <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-extrabold italic text-sm shadow-md shadow-indigo-200">LM</div>
             <span className="font-bold text-lg tracking-tight text-slate-800">LiveSync</span>
          </div>
        </div>
        <button onClick={() => !currentUser && setIsLoginPageOpen(true)} className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors">
            {currentUser ? (
                <>
                <img src={currentUser.avatar} className="w-6 h-6 rounded-full object-cover" alt=""/>
                {currentUser.role === 'MANAGER' && <RankBadge rank={currentUser.rank} />}
                </>
            ) : (
                <span className="text-xs font-bold text-slate-500">Khách</span>
            )}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
           <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
           <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl p-6 animate-fade-in">
              <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold italic text-lg">LM</div>
                    <span className="font-bold text-2xl tracking-tighter text-slate-900">Live<span className="text-indigo-600">Sync</span></span>
                 </div>
                 <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-lg"><X size={20}/></button>
              </div>

              <div className="space-y-2">
                 <SidebarItem icon={<Calendar size={20}/>} label="Lịch làm việc" active={viewMode === 'DASHBOARD'} onClick={() => { setViewMode('DASHBOARD'); setIsMobileMenuOpen(false); }} />
                 {currentUser && currentUser.role !== 'MANAGER' && (
                  <SidebarItem icon={<Clock size={20}/>} label="Đăng ký rảnh" active={viewMode === 'MY_AVAILABILITY'} onClick={() => { setViewMode('MY_AVAILABILITY'); setIsMobileMenuOpen(false); }} />
                 )}
                 {currentUser && (
                    <SidebarItem 
                    icon={<MessageSquare size={20}/>} 
                    label="Yêu cầu" 
                    active={viewMode === 'REQUESTS'} 
                    onClick={() => { setViewMode('REQUESTS'); setIsMobileMenuOpen(false); }} 
                    badge={currentUser.role === 'MANAGER' && pendingCount > 0 ? pendingCount : undefined}
                    />
                 )}
                 {currentUser?.role === 'MANAGER' && (
                  <SidebarItem icon={<BarChart3 size={20}/>} label="Báo cáo tháng" active={viewMode === 'REPORTS'} onClick={() => { setViewMode('REPORTS'); setIsMobileMenuOpen(false); }} />
                 )}
                 {currentUser?.role === 'MANAGER' && (
                  <>
                    <div className="pt-6 pb-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Hệ thống</div>
                    <SidebarItem icon={<Users size={20}/>} label="Nhân sự" active={viewMode === 'STAFF_MANAGEMENT'} onClick={() => { setViewMode('STAFF_MANAGEMENT'); setIsMobileMenuOpen(false); }} />
                    <SidebarItem icon={<Settings size={20}/>} label="Cấu hình & Zalo" active={viewMode === 'SETTINGS'} onClick={() => { setViewMode('SETTINGS'); setIsMobileMenuOpen(false); }} />
                  </>
                 )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                  {currentUser ? (
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:text-red-600 font-bold text-sm bg-red-50 rounded-xl"><LogOut size={20}/> Đăng xuất</button>
                  ) : (
                      <button onClick={() => { setIsLoginPageOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-indigo-600 font-bold text-sm bg-indigo-50 rounded-xl"><LogIn size={20}/> Đăng nhập</button>
                  )}
              </div>
           </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 h-screen sticky top-0 flex-col z-30 shadow-sm overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-lg shadow-indigo-200 italic text-lg">LM</div>
            <span className="font-bold text-2xl tracking-tighter text-slate-900">Live<span className="text-indigo-600">Sync</span></span>
          </div>

          <div className="mb-8 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            {currentUser ? (
                <div className="flex items-center gap-3 mb-3">
                    <img src={currentUser.avatar} className="w-12 h-12 rounded-full object-cover ring-4 ring-white shadow-sm" alt=""/>
                    <div className="overflow-hidden">
                        <p className="font-bold text-base truncate text-slate-900">{currentUser.name}</p>
                        <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">{currentUser.role === 'MANAGER' ? 'Quản lý' : 'Nhân sự'}</p>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                        <Users size={24}/>
                    </div>
                    <div className="overflow-hidden">
                        <p className="font-bold text-base truncate text-slate-900">Khách</p>
                        <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Chế độ xem</p>
                    </div>
                </div>
            )}
            {currentUser?.role === 'MANAGER' && <div className="flex justify-start"><RankBadge rank={currentUser.rank} size="md" /></div>}
          </div>

          <nav className="space-y-1.5">
            <SidebarItem icon={<Calendar size={20}/>} label="Lịch làm việc" active={viewMode === 'DASHBOARD'} onClick={() => setViewMode('DASHBOARD')} />
            {currentUser && currentUser.role !== 'MANAGER' && (
              <SidebarItem icon={<Clock size={20}/>} label="Đăng ký rảnh" active={viewMode === 'MY_AVAILABILITY'} onClick={() => setViewMode('MY_AVAILABILITY')} />
            )}
            {currentUser && (
                <SidebarItem 
                icon={<MessageSquare size={20}/>} 
                label="Yêu cầu" 
                active={viewMode === 'REQUESTS'} 
                onClick={() => setViewMode('REQUESTS')} 
                badge={currentUser.role === 'MANAGER' && pendingCount > 0 ? pendingCount : undefined}
                />
            )}
            {currentUser?.role === 'MANAGER' && (
              <SidebarItem icon={<BarChart3 size={20}/>} label="Báo cáo tháng" active={viewMode === 'REPORTS'} onClick={() => setViewMode('REPORTS')} />
            )}
            {currentUser?.role === 'MANAGER' && (
              <>
                <div className="pt-6 pb-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Hệ thống</div>
                <SidebarItem icon={<Users size={20}/>} label="Nhân sự" active={viewMode === 'STAFF_MANAGEMENT'} onClick={() => setViewMode('STAFF_MANAGEMENT')} />
                <SidebarItem icon={<Settings size={20}/>} label="Cấu hình & Zalo" active={viewMode === 'SETTINGS'} onClick={() => setViewMode('SETTINGS')} />
              </>
            )}
          </nav>
        </div>
        
        <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50/30">
          {currentUser ? (
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:text-red-600 font-bold text-sm transition-all hover:bg-white rounded-xl hover:shadow-sm"><LogOut size={20}/> Đăng xuất</button>
          ) : (
              <button onClick={() => setIsLoginPageOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 text-indigo-600 hover:text-indigo-700 font-bold text-sm transition-all hover:bg-white rounded-xl hover:shadow-sm"><LogIn size={20}/> Đăng nhập</button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto w-full relative">
        {isLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-2"/>
                    <span className="text-sm font-bold text-indigo-900">Đang đồng bộ dữ liệu...</span>
                </div>
            </div>
        )}

        {/* Top Controls: Date & Week Selection */}
        {(viewMode === 'DASHBOARD' || viewMode === 'MY_AVAILABILITY' || viewMode === 'REPORTS') && (
            <div className="bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200/60 p-4 mb-8 flex flex-col xl:flex-row items-center justify-between gap-4 shadow-sm sticky top-0 z-30 transition-all">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                    <div className="flex items-center gap-2 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm w-full sm:w-auto justify-between sm:justify-start">
                        <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all"><ChevronLeft size={18}/></button>
                        <span className="font-bold text-sm sm:w-40 text-center uppercase tracking-wide text-slate-800 tabular-nums">Tháng {currentDate.getMonth() + 1} / {currentDate.getFullYear()}</span>
                        <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all"><ChevronRight size={18}/></button>
                    </div>
                    
                    <div className="flex bg-slate-100/50 p-1.5 rounded-2xl overflow-x-auto w-full sm:w-auto no-scrollbar">
                        {[1,2,3,4,5].map(w => (
                            <button 
                                key={w} 
                                onClick={() => setCurrentWeek(w)}
                                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${currentWeek === w ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                            >
                                Tuần {w}
                            </button>
                        ))}
                    </div>
                </div>

                {viewMode === 'DASHBOARD' && currentUser?.role === 'MANAGER' && (
                   <div className="flex gap-3 w-full xl:w-auto">
                      <Button variant="secondary" size="md" className="flex-1 xl:flex-none" icon={<FileSpreadsheet size={18}/>} onClick={handleExportExcel}>Xuất Excel</Button>
                      <Button size="md" className="flex-1 xl:flex-none" onClick={handleAutoSchedule} icon={<Sparkles size={18}/>}>Xếp ca AI</Button>
                   </div>
                )}
                 {viewMode === 'DASHBOARD' && !currentUser && (
                    <Button size="md" className="flex-1 xl:flex-none bg-slate-800 hover:bg-slate-900 shadow-none" onClick={() => setIsLoginPageOpen(true)} icon={<LogIn size={18}/>}>Đăng nhập quản lý</Button>
                 )}
            </div>
        )}
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 capitalize tracking-tight mb-1">
              {viewMode === 'DASHBOARD' && 'Bảng điều hành Live'}
              {viewMode === 'MY_AVAILABILITY' && 'Đăng ký lịch rảnh'}
              {viewMode === 'REQUESTS' && 'Quản lý yêu cầu'}
              {viewMode === 'STAFF_MANAGEMENT' && 'Quản lý Nhân sự'}
              {viewMode === 'SETTINGS' && 'Cấu hình hệ thống'}
              {viewMode === 'REPORTS' && 'Báo cáo doanh thu'}
            </h1>
            <p className="text-slate-500 text-sm font-medium">
               {viewMode === 'DASHBOARD' || viewMode === 'MY_AVAILABILITY' ? (
                 <span className="flex items-center gap-2">
                   <Calendar size={14} className="text-indigo-500"/> 
                   Dữ liệu hiển thị: <span className="text-slate-700 font-bold">Tuần {currentWeek}</span> - Tháng {currentDate.getMonth() + 1}
                 </span>
               ) : 'Quản trị hệ thống livestream chuyên nghiệp'}
            </p>
          </div>
          {viewMode === 'STAFF_MANAGEMENT' && (
             <Button size="md" onClick={() => handleOpenUserModal()} icon={<UserPlus size={18}/>}>Thêm nhân sự</Button>
          )}
          {viewMode === 'SETTINGS' && (
             <Button size="md" onClick={() => handleOpenShiftModal()} icon={<Plus size={18}/>}>Thêm Ca Live</Button>
          )}
        </div>

        {/* Views Rendering */}
        {viewMode === 'DASHBOARD' && (
            <>
            {/* Manager Registration Progress Widget */}
            {currentUser?.role === 'MANAGER' && (
              <div className="mb-8 p-5 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col xl:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-transparent rounded-full -mr-16 -mt-16 opacity-50 pointer-events-none"></div>
                
                <div className="flex items-center gap-4 w-full xl:w-auto relative z-10">
                   <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
                      <ListTodo size={24}/>
                   </div>
                   <div className="flex-1">
                      <p className="font-bold text-slate-900 text-base">Tiến độ đăng ký (Tuần {currentWeek})</p>
                      <p className="text-sm text-slate-500 font-medium mt-0.5">{submittedCount} / {staffUsers.length} nhân sự đã nộp</p>
                   </div>
                </div>
                {/* User Avatars */}
                <div className="flex items-center gap-1.5 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 relative z-10 no-scrollbar">
                   {staffUsers.map(u => (
                     <div key={u.id} className="relative group flex-shrink-0">
                        <img 
                          src={u.avatar} 
                          className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${u.isAvailabilitySubmitted ? 'border-green-500 ring-2 ring-green-100 grayscale-0' : 'border-slate-200 grayscale opacity-50'}`} 
                          alt={u.name}
                          title={u.name}
                        />
                        {u.isAvailabilitySubmitted && (
                          <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border-2 border-white shadow-sm">
                            <Check size={8} strokeWidth={4}/>
                          </div>
                        )}
                     </div>
                   ))}
                </div>
              </div>
            )}

            {/* Monthly Mini-Report Widget (Visible above calendar) */}
            {currentUser?.role === 'MANAGER' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-indigo-600 rounded-3xl p-5 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-110 transition-transform"></div>
                        <p className="text-xs font-bold uppercase opacity-70 tracking-wider mb-1">Tổng ca tháng</p>
                        <p className="text-3xl font-extrabold tabular-nums">{monthlyStats.reduce((acc, curr) => acc + curr.shiftCount, 0)}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">Nhân sự Active</p>
                        <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{monthlyStats.length}</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm ring-1 ring-slate-100">
              <div className="overflow-x-auto relative custom-scrollbar">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 backdrop-blur-sm">
                      <th className="p-4 text-left text-xs font-extrabold text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-20 w-32 border-r border-slate-200">
                        Ca Live
                      </th>
                      {DAYS_OF_WEEK.map((day, idx) => {
                        const date = weekDates[idx];
                        const today = isToday(date);
                        return (
                          <th key={day} className={`p-4 text-center min-w-[160px] transition-colors duration-300 ${today ? 'bg-indigo-50/50' : ''}`}>
                              <div className="flex flex-col items-center">
                                  <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${today ? 'text-indigo-600' : 'text-slate-400'}`}>{day}</span>
                                  <span className={`text-xl font-extrabold tabular-nums ${today ? 'text-indigo-700' : 'text-slate-800'}`}>{formatDate(date)}</span>
                              </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shifts.map(shift => (
                      <tr key={shift.id}>
                        <td className="p-4 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[4px_0_12px_rgba(0,0,0,0.02)]">
                          <div className="font-bold text-slate-900 text-sm leading-tight">{shift.name}</div>
                          <div className={`text-[10px] font-black font-mono mt-1.5 tabular-nums px-2.5 py-1 rounded-lg w-fit border ${shift.color || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{shift.startTime} - {shift.endTime}</div>
                        </td>
                        {DAYS_OF_WEEK.map((_, dayIdx) => {
                          const slot = currentWeekSchedule.find(s => s.dayIndex === dayIdx && s.shiftId === shift.id);
                          const ops = users.find(u => u.id === slot?.opsUserId);
                          const isMyShift = slot?.streamerAssignments.some(sa => sa.userId === currentUser?.id) || slot?.opsUserId === currentUser?.id;
                          const today = isToday(weekDates[dayIdx]);

                          return (
                            <td key={dayIdx} className={`p-2 align-top h-48 transition-colors ${today ? 'bg-indigo-50/20' : ''}`}>
                              <div 
                                onClick={() => {
                                  checkAuth(() => {
                                    if (currentUser?.role === 'MANAGER') {
                                        setEditingSlot({ day: dayIdx, shiftId: shift.id });
                                        setIsSlotModalOpen(true);
                                    } else if (isMyShift) {
                                        setRequestForm({ type: 'SWAP', reason: '', slot: { day: dayIdx, shiftId: shift.id } });
                                        setIsRequestModalOpen(true);
                                    }
                                  });
                                }}
                                className={`h-full w-full rounded-2xl border transition-all duration-300 p-3 flex flex-col gap-2 cursor-pointer relative overflow-hidden group/card
                                  ${isMyShift ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
                                  ${slot 
                                    ? 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1' 
                                    : 'bg-slate-50/30 border-dashed border-slate-200 hover:bg-slate-50 hover:border-indigo-300'
                                  }
                                `}
                              >
                                {!slot ? (
                                  <div className="flex-1 flex flex-col items-center justify-center text-slate-300 group-hover/card:text-indigo-400 transition-colors duration-300">
                                    <Plus className="w-5 h-5 mb-1 group-hover/card:scale-110 transition-transform" strokeWidth={2.5} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Trống</span>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                                      {slot.streamerAssignments.map((sa, i) => {
                                        const u = users.find(user => user.id === sa.userId);
                                        return (
                                          <div key={i} className={`flex items-center gap-2 p-2 rounded-xl border relative shadow-sm transition-all duration-200 hover:scale-[1.02] ${sa.timeLabel ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-100'}`}>
                                            <img src={u?.avatar} className="w-8 h-8 rounded-full border border-white shadow-sm object-cover" alt=""/>
                                            <div className="min-w-0 flex-1">
                                              <p className="text-[11px] font-bold truncate leading-tight text-slate-900">{u?.name}</p>
                                              <p className={`text-[9px] font-bold uppercase mt-0.5 flex items-center gap-1 ${sa.timeLabel ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                  {sa.timeLabel && <LinkIcon size={8}/>}
                                                  {sa.timeLabel || 'Toàn ca'}
                                              </p>
                                            </div>
                                            {sa.timeLabel && <div className="absolute top-0 right-0 p-1 bg-indigo-500 rounded-bl-xl rounded-tr-xl text-white"><Layers size={8}/></div>}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <div className={`mt-auto pt-2 border-t flex items-center gap-2 border-slate-100 transition-colors ${ops ? 'text-slate-900' : 'text-slate-300 group-hover/card:text-slate-400'}`}>
                                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${ops ? 'bg-orange-100 text-orange-600' : 'bg-slate-100'}`}>
                                        <Wrench className="w-3.5 h-3.5" strokeWidth={2.5}/>
                                      </div>
                                      <span className="text-[10px] font-bold truncate">{ops?.name || 'Chưa có kỹ thuật'}</span>
                                    </div>
                                  </>
                                )}
                                {isMyShift && <div className="absolute top-2 right-2 text-indigo-500 bg-white shadow-sm border border-indigo-100 p-1 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity transform translate-x-2 group-hover/card:translate-x-0"><Edit2 size={12}/></div>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </>
        )}

        {viewMode === 'MY_AVAILABILITY' && currentUser && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 overflow-hidden">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2.5">
                  <CalendarCheck className="w-6 h-6 text-indigo-600"/> Đăng ký rảnh
                </h3>
                <p className="text-slate-500 text-sm mt-1">Chọn các ca bạn có thể làm việc trong tuần này.</p>
              </div>
              <div className="flex items-center gap-4">
                 {currentUser.isAvailabilitySubmitted ? (
                    <div className="px-4 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-extrabold uppercase flex items-center gap-2 border border-green-200 shadow-sm">
                      <Check size={16} strokeWidth={3}/> Đã gửi đăng ký
                    </div>
                 ) : (
                    <Button size="md" onClick={handleSubmitAvailability} icon={<Send size={16}/>}>Gửi đăng ký</Button>
                 )}
                 <div className="flex items-center gap-4 text-xs font-bold text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-600 rounded-md shadow-sm"></div> Rảnh</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-slate-300 rounded-md"></div> Bận</div>
                 </div>
              </div>
            </div>
            
            <div className="overflow-x-auto scrollbar-hide pb-4">
              <table className="w-full border-separate border-spacing-2 md:border-spacing-3">
                <thead>
                  <tr>
                    <th className="w-24 md:w-40"></th>
                    {DAYS_OF_WEEK.map((day, idx) => (
                      <th key={day} className="p-3 text-center bg-slate-50 rounded-2xl min-w-[80px]">
                          <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">{day}</span>
                              <span className="text-sm font-extrabold text-slate-800">{formatDate(weekDates[idx])}</span>
                          </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shifts.map(shift => (
                    <tr key={shift.id}>
                      <td className="p-3 bg-white rounded-2xl border border-slate-100 text-left shadow-sm">
                        <p className="font-bold text-slate-900 text-sm">{shift.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 font-mono mt-1">{shift.startTime}-{shift.endTime}</p>
                      </td>
                      {DAYS_OF_WEEK.map((_, dayIdx) => {
                        const isAvailable = currentWeekAvailabilities.some(
                          a => a.userId === currentUser?.id && a.dayIndex === dayIdx && a.shiftId === shift.id
                        );
                        return (
                          <td key={dayIdx}>
                            <button
                              onClick={() => toggleAvailability(dayIdx, shift.id)}
                              className={`w-full h-16 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center group
                                ${isAvailable 
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' 
                                  : 'bg-slate-50 border-slate-100 text-slate-300 hover:border-indigo-200 hover:bg-white'
                                }
                              `}
                            >
                              {isAvailable ? <Check className="w-6 h-6" strokeWidth={3}/> : <MousePointer2 size={18} className="opacity-0 group-hover:opacity-30 transition-opacity"/>}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Requests Management Section */}
        {viewMode === 'REQUESTS' && currentUser && (
          <div className="space-y-6">
             {/* Pending Requests Section (Priority) */}
             {requests.length === 0 ? (
                 <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 border-dashed text-center">
                     <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4"><MessageSquare size={32}/></div>
                     <h3 className="text-slate-900 font-bold text-lg">Chưa có yêu cầu nào</h3>
                     <p className="text-slate-500 text-sm mt-1">Các yêu cầu xin nghỉ hoặc đổi ca sẽ xuất hiện tại đây.</p>
                 </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {requests.map(req => {
                      const shift = shifts.find(s => s.id === req.shiftId);
                      const isPending = req.status === 'PENDING';
                      return (
                         <div key={req.id} className={`p-5 rounded-2xl border flex flex-col gap-4 relative overflow-hidden transition-all ${isPending ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-75 hover:opacity-100'}`}>
                            {isPending && <div className="absolute top-0 right-0 w-2 h-full bg-orange-500"></div>}
                            
                            <div className="flex justify-between items-start">
                               <div className="flex items-center gap-3">
                                  <img src={users.find(u => u.id === req.userId)?.avatar} className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" alt=""/>
                                  <div>
                                     <p className="font-bold text-sm text-slate-900">{req.userName}</p>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(req.createdAt).toLocaleDateString('vi-VN')}</p>
                                  </div>
                               </div>
                               <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                   req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                   req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                   'bg-orange-100 text-orange-700'
                               }`}>
                                   {req.status === 'APPROVED' ? 'Đã duyệt' : req.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                               </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                   <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase border ${req.type === 'LEAVE' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                      {req.type === 'LEAVE' ? 'Xin nghỉ' : 'Đổi ca'}
                                   </span>
                                   <span>•</span>
                                   <span>{DAYS_OF_WEEK[req.dayIndex]}</span>
                                   <span>•</span>
                                   <span className="font-bold text-slate-800">{shift?.name}</span>
                                </div>
                                {req.type === 'SWAP' && (
                                    <div className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-100 text-slate-600">
                                       🔄 Đổi với: <span className="font-bold text-slate-900">{req.targetUserName}</span>
                                    </div>
                                )}
                                <p className="text-sm text-slate-700 italic bg-slate-50 p-3 rounded-xl border border-slate-100">"{req.reason}"</p>
                            </div>

                            {currentUser.role === 'MANAGER' && isPending && (
                               <div className="flex gap-2 pt-2 mt-auto">
                                  <button onClick={() => handleProcessRequest(req.id, 'REJECTED')} className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors">Từ chối</button>
                                  <button onClick={() => handleProcessRequest(req.id, 'APPROVED')} className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all">Chấp thuận</button>
                               </div>
                            )}
                         </div>
                      );
                   })}
                </div>
             )}
          </div>
        )}

        {viewMode === 'STAFF_MANAGEMENT' && currentUser && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase font-extrabold text-slate-500 tracking-wider border-b border-slate-100">
                    <th className="p-5 text-left">Nhân sự</th>
                    <th className="p-5 text-left">Vai trò & Rank</th>
                    <th className="p-5 text-left hidden sm:table-cell">Doanh thu</th>
                    <th className="p-5 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 group transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <img src={u.avatar} className="w-12 h-12 rounded-full object-cover shadow-sm border-2 border-white ring-1 ring-slate-100" alt=""/>
                          <div className="min-w-0">
                            <p className="font-bold text-sm md:text-base text-slate-900 truncate">{u.name}</p>
                            <p className="text-[10px] md:text-xs text-slate-400 font-medium">{u.zaloPhone || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col gap-2 items-start">
                          <RoleBadge role={u.role} />
                          {u.role === 'STAFF' && <RankBadge rank={u.rank} size="sm" />}
                        </div>
                      </td>
                      <td className="p-5 hidden sm:table-cell align-middle">
                        {u.role === 'STAFF' ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-extrabold text-slate-900 tabular-nums">{(u.revenue || 0).toLocaleString()}đ</span>
                            <div className="w-32 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${u.rank === 'S' ? 'bg-yellow-400' : u.rank === 'A' ? 'bg-purple-400' : u.rank === 'B' ? 'bg-blue-400' : 'bg-slate-300'}`}
                                style={{ width: `${Math.min(100, (u.revenue || 0) / 1500000)}%` }}
                              />
                            </div>
                          </div>
                        ) : <span className="text-slate-300 italic text-xs">N/A</span>}
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenUserModal(u)}
                            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={18}/>
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Xóa"
                          >
                            <Trash2 size={18}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'SETTINGS' && currentUser?.role === 'MANAGER' && (
          <div className="space-y-8">
            {/* Shifts Management Section */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
               <div className="flex items-center justify-between mb-6">
                 <div>
                    <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><Clock className="text-indigo-600"/> Cấu hình Ca Live (Khung giờ)</h3>
                    <p className="text-sm text-slate-500 mt-1">Quản lý các khung giờ livestream trong ngày.</p>
                 </div>
               </div>
               
               <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-xs uppercase font-extrabold text-slate-500">
                        <tr>
                           <th className="p-4">Tên Ca</th>
                           <th className="p-4">Thời gian</th>
                           <th className="p-4">Màu sắc</th>
                           <th className="p-4 text-right">Hành động</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {shifts.map(shift => (
                           <tr key={shift.id} className="hover:bg-slate-50/50">
                              <td className="p-4 font-bold">{shift.name}</td>
                              <td className="p-4 font-mono">{shift.startTime} - {shift.endTime}</td>
                              <td className="p-4">
                                 <div className={`px-2 py-1 rounded text-xs font-bold w-fit ${shift.color}`}>Mẫu hiển thị</div>
                              </td>
                              <td className="p-4 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => handleOpenShiftModal(shift)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDeleteShift(shift.id)} className="p-2 text-slate-400 hover:text-red-600 bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* Zalo/Bot Configuration Section */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
              <div className="mb-6">
                 <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><Bot className="text-blue-600"/> Cấu hình Bot & Webhook</h3>
                 <p className="text-sm text-slate-500 mt-1">Kết nối Bot Telegram/Zalo Bridge để gửi thông báo vào Group.</p>
              </div>
              <div className="space-y-4 max-w-2xl">
                 <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">Webhook / API Endpoint</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold" value={zaloConfig.webhookUrl} onChange={e => setZaloConfig({...zaloConfig, webhookUrl: e.target.value})} placeholder="https://api.telegram.org/bot..." />
                    <p className="text-[10px] text-slate-400 font-medium mt-1 ml-1">Nếu dùng Telegram, nhập: https://api.telegram.org/bot[TOKEN]/sendMessage</p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">Bot Token</label>
                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold" value={zaloConfig.botToken} onChange={e => setZaloConfig({...zaloConfig, botToken: e.target.value})} placeholder="Nhập Token Bot..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">Group ID (Chat ID)</label>
                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold" value={zaloConfig.groupId} onChange={e => setZaloConfig({...zaloConfig, groupId: e.target.value})} placeholder="Nhập ID nhóm (-100...)" />
                    </div>
                 </div>

                 <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <Button onClick={() => { localStorage.setItem('ls_zalo_config', JSON.stringify(zaloConfig)); alert("Đã lưu cấu hình!"); }} icon={<Save size={16}/>}>Lưu cấu hình</Button>
                    <Button variant="secondary" onClick={handleTestBot} icon={isTestingBot ? <Loader2 size={16} className="animate-spin" /> : <Send size={16}/>} disabled={isTestingBot}>
                        {isTestingBot ? 'Đang gửi...' : 'Test Gửi tin'}
                    </Button>
                 </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* --- MODALS (Login, Slot, Request, Shift, User, Bridge) --- */}
      
      {/* Assignment Modal (Manager) */}
      <Modal isOpen={isSlotModalOpen} onClose={() => setIsSlotModalOpen(false)} title="Điều phối nhân sự">
        <div className="space-y-4">
           <div className="flex bg-slate-100 p-1 rounded-lg">
             <button className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${slotTab === 'STREAMER' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`} onClick={() => setSlotTab('STREAMER')}>Streamer</button>
             <button className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${slotTab === 'OPS' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400'}`} onClick={() => setSlotTab('OPS')}>Vận hành</button>
          </div>

          <div className="max-h-[300px] md:max-h-[350px] overflow-y-auto space-y-2 pr-1 scrollbar-hide">
             {slotTab === 'STREAMER' ? (
                <div className="space-y-2">
                    {users.filter(u => u.role === 'STAFF').map(u => {
                    const current = currentWeekSchedule.find(s => s.dayIndex === editingSlot?.day && s.shiftId === editingSlot?.shiftId);
                    const assignment = current?.streamerAssignments.find(sa => sa.userId === u.id);
                    return (
                        <div key={u.id} className="flex gap-1.5">
                            <button onClick={() => toggleStreamerInSlot(u.id)} className={`flex-1 flex items-center justify-between p-2 md:p-3 rounded-xl border transition-all ${assignment ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-slate-50 border-slate-100 hover:border-indigo-200'}`}>
                                <div className="flex items-center gap-2 md:gap-3">
                                    <img src={u.avatar} className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white shadow-sm" alt=""/>
                                    <div className="text-left min-w-0">
                                        <p className="font-bold text-xs md:text-sm leading-none truncate">{u.name}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          <RankBadge rank={u.rank} size="sm" />
                                          {assignment?.timeLabel && <p className="text-[8px] md:text-[9px] font-black uppercase opacity-80">{assignment.timeLabel}</p>}
                                        </div>
                                    </div>
                                </div>
                                {assignment && <CheckCircle2 size={16} strokeWidth={3}/>}
                            </button>
                            <button onClick={() => handleOpenBridgeModal(u.id)} className={`w-10 md:w-12 flex flex-col items-center justify-center rounded-xl border-2 transition-all ${assignment?.timeLabel ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-slate-100 text-slate-300 hover:text-indigo-600 hover:border-indigo-200'}`}>
                                <Layers size={14}/>
                            </button>
                        </div>
                    );
                    })}
                </div>
             ) : (
                <div className="space-y-2">
                  <button onClick={() => setOpsInSlot(null)} className="w-full p-2.5 rounded-xl border-2 border-dashed border-red-100 text-red-500 font-black text-[10px] uppercase hover:bg-red-50 transition-colors">Hủy vận hành</button>
                  {users.filter(u => u.role === 'OPERATIONS').map(u => {
                    const current = currentWeekSchedule.find(s => s.dayIndex === editingSlot?.day && s.shiftId === editingSlot?.shiftId);
                    const isSelected = current?.opsUserId === u.id;
                    return (
                      <button key={u.id} onClick={() => setOpsInSlot(u.id)} className={`w-full flex items-center justify-between p-2.5 rounded-xl border-2 transition-all ${isSelected ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-100' : 'bg-slate-50 border-slate-100 hover:border-orange-300'}`}>
                        <div className="flex items-center gap-2.5">
                          <img src={u.avatar} className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white shadow-sm" alt=""/>
                          <p className="font-bold text-xs md:text-sm leading-none">{u.name}</p>
                        </div>
                        {isSelected && <CheckCircle2 size={16} strokeWidth={3}/>}
                      </button>
                    );
                  })}
                </div>
             )}
          </div>
        </div>
      </Modal>

      {/* Bridge/Kẹp Ca Modal */}
      <Modal isOpen={isBridgeModalOpen} onClose={handleCloseBridgeModal} title="Cấu hình Kẹp Ca">
          {editingSlot && (
              <div className="space-y-6">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <img src={users.find(u => u.id === bridgeData.userId)?.avatar} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt=""/>
                         <div>
                             <p className="font-bold text-sm text-slate-900">{users.find(u => u.id === bridgeData.userId)?.name}</p>
                             <p className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit">Đang cấu hình</p>
                         </div>
                    </div>
                </div>
                {/* Simplified content for demo - you can expand this with time pickers as in previous version */}
                <div className="p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-center">
                    <p className="text-sm text-slate-500">Tính năng chọn giờ kẹp ca (Backend logic)</p>
                </div>
                <div className="flex gap-2 pt-2">
                    <Button variant="secondary" className="flex-1 font-bold" onClick={handleCloseBridgeModal}>Hủy</Button>
                    <Button className="flex-1 font-black shadow-lg shadow-indigo-100" onClick={handleSaveBridge} icon={<Save size={16}/>}>Lưu cấu hình</Button>
                </div>
              </div>
          )}
      </Modal>

      {/* User (Staff) Modal */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={isEditUser ? "Chỉnh sửa nhân sự" : "Thêm nhân sự mới"}>
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Thông tin cơ bản</label>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* ID Field */}
                  <input 
                    type="text" 
                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold ${isEditUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                    value={userFormData.id || ''} 
                    onChange={e => setUserFormData({...userFormData, id: e.target.value})} 
                    placeholder="Mã nhân sự (ID/Username)..." 
                    disabled={isEditUser}
                  />
                  {/* Password Field */}
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                    value={userFormData.password || ''} 
                    onChange={e => setUserFormData({...userFormData, password: e.target.value})} 
                    placeholder="Mật khẩu..." 
                  />
                </div>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold" value={userFormData.name || ''} onChange={e => setUserFormData({...userFormData, name: e.target.value})} placeholder="Họ và tên..." />
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold" value={userFormData.zaloPhone || ''} onChange={e => setUserFormData({...userFormData, zaloPhone: e.target.value})} placeholder="Số Zalo..." />
              </div>
            </div>
            {/* Roles Selection */}
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Vai trò</label>
              <div className="grid grid-cols-3 gap-2">
                {['STAFF', 'OPERATIONS', 'MANAGER'].map((r) => (
                  <button key={r} onClick={() => setUserFormData({...userFormData, role: r as Role})} className={`p-2 rounded-lg border text-[10px] font-bold ${userFormData.role === r ? 'bg-indigo-600 text-white' : 'bg-white'}`}>{r}</button>
                ))}
              </div>
            </div>
            {/* Rank Selection if Staff */}
            {userFormData.role === 'STAFF' && (
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Rank</label>
                    <div className="grid grid-cols-4 gap-2">
                        {['S', 'A', 'B', 'C'].map((r) => (
                        <button key={r} onClick={() => setUserFormData({...userFormData, rank: r as Rank})} className={`p-2 rounded-lg border text-[10px] font-bold ${userFormData.rank === r ? 'bg-indigo-600 text-white' : 'bg-white'}`}>{r}</button>
                        ))}
                    </div>
                </div>
            )}
            {/* Revenue */}
            {userFormData.role === 'STAFF' && (
                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold" value={userFormData.revenue || 0} onChange={e => setUserFormData({...userFormData, revenue: Number(e.target.value)})} placeholder="Doanh thu..." />
            )}
          </div>

          <div className="pt-4 flex gap-2">
            <Button variant="secondary" className="flex-1 font-bold" onClick={() => setIsUserModalOpen(false)}>Hủy</Button>
            <Button className="flex-1 font-black shadow-lg shadow-indigo-100" onClick={handleSaveUser} icon={<Save size={16}/>}>Lưu nhân sự</Button>
          </div>
        </div>
      </Modal>

      {/* Shift Edit Modal */}
      <Modal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} title={shiftFormData.id ? "Sửa Ca Live" : "Thêm Ca Live Mới"}>
         <div className="space-y-4">
             <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Thông tin Ca</label>
                <div className="space-y-3">
                   <div className="grid grid-cols-3 gap-3">
                      <input type="text" disabled={!!shiftFormData.id && shiftFormData.id !== '' && shifts.some(s => s.id === shiftFormData.id)} className="col-span-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold uppercase" value={shiftFormData.id} onChange={e => setShiftFormData({...shiftFormData, id: e.target.value})} placeholder="Mã (VD: ca1)..." />
                      <input type="text" className="col-span-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold" value={shiftFormData.name} onChange={e => setShiftFormData({...shiftFormData, name: e.target.value})} placeholder="Tên ca (VD: Ca Sáng)..." />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold" value={shiftFormData.startTime} onChange={e => setShiftFormData({...shiftFormData, startTime: e.target.value})} />
                      <input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold" value={shiftFormData.endTime} onChange={e => setShiftFormData({...shiftFormData, endTime: e.target.value})} />
                   </div>
                </div>
             </div>
             <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Màu sắc hiển thị</label>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                   <button onClick={() => setShiftFormData({...shiftFormData, color: 'bg-orange-100 text-orange-800 border-orange-200'})} className={`p-3 rounded-xl border-2 bg-orange-100 text-orange-800 border-orange-200 ${shiftFormData.color.includes('orange') ? 'ring-2 ring-orange-400' : ''}`}>Cam (Sáng)</button>
                   <button onClick={() => setShiftFormData({...shiftFormData, color: 'bg-blue-100 text-blue-800 border-blue-200'})} className={`p-3 rounded-xl border-2 bg-blue-100 text-blue-800 border-blue-200 ${shiftFormData.color.includes('blue') ? 'ring-2 ring-blue-400' : ''}`}>Xanh Dương (Chiều)</button>
                   <button onClick={() => setShiftFormData({...shiftFormData, color: 'bg-purple-100 text-purple-800 border-purple-200'})} className={`p-3 rounded-xl border-2 bg-purple-100 text-purple-800 border-purple-200 ${shiftFormData.color.includes('purple') ? 'ring-2 ring-purple-400' : ''}`}>Tím (Tối)</button>
                   <button onClick={() => setShiftFormData({...shiftFormData, color: 'bg-indigo-100 text-indigo-800 border-indigo-200'})} className={`p-3 rounded-xl border-2 bg-indigo-100 text-indigo-800 border-indigo-200 ${shiftFormData.color.includes('indigo') ? 'ring-2 ring-indigo-400' : ''}`}>Indigo (Đêm)</button>
                </div>
             </div>
             <div className="pt-2 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setIsShiftModalOpen(false)}>Hủy</Button>
                <Button className="flex-1" onClick={handleSaveShift} icon={<Save size={16}/>}>Lưu</Button>
             </div>
         </div>
      </Modal>

      {/* Staff Request Modal */}
      <Modal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="Gửi yêu cầu điều chỉnh">
        <div className="space-y-4">
          <div className="space-y-3">
             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Hình thức</label>
                <div className="grid grid-cols-2 gap-2">
                   <button onClick={() => setRequestForm({...requestForm, type: 'SWAP'})} className={`p-3 rounded-xl border-2 font-black text-[10px] uppercase ${requestForm.type === 'SWAP' ? 'bg-indigo-600 text-white' : 'bg-white'}`}>Thay đổi nhân sự</button>
                   <button onClick={() => setRequestForm({...requestForm, type: 'LEAVE'})} className={`p-3 rounded-xl border-2 font-black text-[10px] uppercase ${requestForm.type === 'LEAVE' ? 'bg-red-600 text-white' : 'bg-white'}`}>Xin nghỉ ca</button>
                </div>
             </div>
             {requestForm.type === 'SWAP' && (
               <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" value={requestForm.targetUserId || ''} onChange={e => setRequestForm({...requestForm, targetUserId: e.target.value})}>
                    <option value="">-- Chọn đồng nghiệp --</option>
                    {users.filter(u => u.id !== currentUser?.id && u.role === 'STAFF').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
               </select>
             )}
             <textarea rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold resize-none" value={requestForm.reason} onChange={e => setRequestForm({...requestForm, reason: e.target.value})} placeholder="Lý do..."></textarea>
          </div>
          <div className="pt-2 flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1 font-bold" onClick={() => setIsRequestModalOpen(false)}>Hủy</Button>
            <Button size="sm" className="flex-1 font-black" onClick={createRequest} icon={<Send size={14}/>}>Gửi yêu cầu</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

const SidebarItem = ({ icon, label, active, onClick, badge }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, badge?: number }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all relative group ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-x-1' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
    <div className="flex items-center gap-3.5"><span className={active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600 transition-colors'}>{icon}</span>{label}</div>
    {badge !== undefined && <span className="w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-sm">{badge}</span>}
  </button>
);
