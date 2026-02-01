
import { supabase } from './supabase';
import { User, Shift, Availability, ScheduleItem, ShiftRequest } from '../types';
import { INITIAL_USERS, INITIAL_SHIFTS } from '../constants';

// Helper to map User from DB (snake_case) to App (camelCase)
const mapUser = (u: any): User => ({
  id: u.id,
  name: u.name,
  role: u.role,
  rank: u.rank,
  password: u.password,
  avatar: u.avatar,
  revenue: u.revenue,
  zaloPhone: u.zalo_phone || u.zaloPhone, // Support both
  isAvailabilitySubmitted: u.is_availability_submitted || u.isAvailabilitySubmitted
});

// Helper to map Shift
const mapShift = (s: any): Shift => ({
  id: s.id,
  name: s.name,
  startTime: s.start_time || s.startTime,
  endTime: s.end_time || s.endTime,
  color: s.color
});

export const api = {
  // --- USERS ---
  async getUsers() {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) {
        console.warn("Supabase getUsers error (falling back to mocks):", error.message);
        return INITIAL_USERS;
      }
      if (!data || data.length === 0) {
        return INITIAL_USERS; 
      }
      return data.map(mapUser);
    } catch (e) {
      console.warn("API Exception (users), using mocks.");
      return INITIAL_USERS;
    }
  },

  async updateUser(user: Partial<User>) {
    // Map back to snake_case for DB
    const dbUser: any = { ...user };
    if (user.zaloPhone) dbUser.zalo_phone = user.zaloPhone;
    if (user.isAvailabilitySubmitted !== undefined) dbUser.is_availability_submitted = user.isAvailabilitySubmitted;
    
    // Clean up camelCase keys if strict
    delete dbUser.zaloPhone;
    delete dbUser.isAvailabilitySubmitted;

    const { data, error } = await supabase.from('users').upsert(dbUser).select().single();
    if (error) throw error;
    return mapUser(data);
  },

  async deleteUser(userId: string) {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
  },

  // --- SHIFTS ---
  async getShifts() {
    try {
      const { data, error } = await supabase.from('shifts').select('*').order('startTime', { ascending: true });
      if (error) {
        console.warn("Supabase getShifts error (falling back to mocks):", error.message);
        return INITIAL_SHIFTS;
      }
      if (!data || data.length === 0) {
        return INITIAL_SHIFTS;
      }
      return data.map(mapShift).sort((a,b) => a.startTime.localeCompare(b.startTime));
    } catch (e) {
      console.warn("API Exception (shifts), using mocks.");
      return INITIAL_SHIFTS;
    }
  },

  async updateShift(shift: Shift) {
    const dbShift = {
      id: shift.id,
      name: shift.name,
      start_time: shift.startTime,
      end_time: shift.endTime,
      color: shift.color
    };
    const { data, error } = await supabase.from('shifts').upsert(dbShift).select().single();
    if (error) throw error;
    return mapShift(data);
  },

  async deleteShift(shiftId: string) {
    const { error } = await supabase.from('shifts').delete().eq('id', shiftId);
    if (error) throw error;
  },

  // --- SCHEDULE ---
  async getSchedule(weekId: string) {
    try {
        const { data, error } = await supabase
        .from('schedule')
        .select('*')
        .eq('week_id', weekId);
        
        if (error) throw error;
        
        return data.map((item: any) => ({
        id: item.id,
        weekId: item.week_id,
        dayIndex: item.day_index,
        shiftId: item.shift_id,
        opsUserId: item.ops_user_id,
        note: item.note,
        isFinalized: item.is_finalized,
        streamerAssignments: item.streamer_assignments || []
        })) as ScheduleItem[];
    } catch (e) {
        console.log("Using empty schedule (Offline/Error)");
        return [];
    }
  },

  async saveScheduleItem(item: ScheduleItem) {
    const payload = {
      id: item.id,
      week_id: item.weekId,
      day_index: item.dayIndex,
      shift_id: item.shiftId,
      ops_user_id: item.opsUserId,
      note: item.note,
      is_finalized: item.isFinalized,
      streamer_assignments: item.streamerAssignments
    };
    
    const { data, error } = await supabase.from('schedule').upsert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async deleteScheduleItem(id: string) {
    const { error } = await supabase.from('schedule').delete().eq('id', id);
    if (error) throw error;
  },

  async clearSchedule(weekId: string) {
     const { error } = await supabase.from('schedule').delete().eq('week_id', weekId);
     if (error) throw error;
  },

  // --- AVAILABILITY ---
  async getAvailabilities(weekId: string) {
    try {
        const { data, error } = await supabase.from('availabilities').select('*').eq('week_id', weekId);
        if (error) throw error;
        return data.map((item: any) => ({
        userId: item.user_id,
        weekId: item.week_id,
        dayIndex: item.day_index,
        shiftId: item.shift_id
        })) as Availability[];
    } catch (e) {
        return [];
    }
  },

  async toggleAvailability(av: Availability) {
    // Check if exists
    const { data: existing } = await supabase
      .from('availabilities')
      .select('id')
      .match({ 
        user_id: av.userId, 
        week_id: av.weekId, 
        day_index: av.dayIndex, 
        shift_id: av.shiftId 
      })
      .maybeSingle();

    if (existing) {
      await supabase.from('availabilities').delete().eq('id', existing.id);
      return 'removed';
    } else {
      await supabase.from('availabilities').insert({
        user_id: av.userId,
        week_id: av.weekId,
        day_index: av.dayIndex,
        shift_id: av.shiftId
      });
      return 'added';
    }
  },

  async clearAvailabilities(weekId: string) {
      const { error } = await supabase.from('availabilities').delete().eq('week_id', weekId);
      if (error) throw error;
  },

  // --- REQUESTS ---
  async getRequests(weekId: string) {
    try {
        const { data, error } = await supabase.from('requests').select('*').eq('week_id', weekId).order('created_at', { ascending: false });
        if (error) throw error;
        return data.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        userName: item.user_name,
        type: item.type,
        weekId: item.week_id,
        dayIndex: item.day_index,
        shiftId: item.shift_id,
        reason: item.reason,
        targetUserId: item.target_user_id,
        targetUserName: item.target_user_name,
        status: item.status,
        createdAt: item.created_at
        })) as ShiftRequest[];
    } catch (e) {
        return [];
    }
  },

  async createRequest(req: ShiftRequest) {
    const payload = {
      id: req.id,
      user_id: req.userId,
      user_name: req.userName,
      type: req.type,
      week_id: req.weekId,
      day_index: req.dayIndex,
      shift_id: req.shiftId,
      reason: req.reason,
      target_user_id: req.targetUserId,
      target_user_name: req.targetUserName,
      status: req.status,
      created_at: req.createdAt
    };
    const { error } = await supabase.from('requests').insert(payload);
    if (error) throw error;
  },

  async updateRequestStatus(id: string, status: string) {
    const { error } = await supabase.from('requests').update({ status }).eq('id', id);
    if (error) throw error;
  }
};
