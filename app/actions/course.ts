'use server';

import { createClient } from '@supabase/supabase-js';
import { type Screening } from '@/types';

const getSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Register a user for a course by matching name + last 3 digits of phone.
 * Returns the registration UUID to be encoded in QR code.
 * If already registered, returns the existing registration ID.
 */
export async function registerForCourse(
    name: string,
    phone3: string,
    courseKey: string
): Promise<{ success: true; registrationId: string; userName: string } | { success: false; error: string }> {
    const trimmedName = name.trim();
    const trimmedPhone = phone3.trim();

    if (!trimmedName || trimmedPhone.length !== 3 || !/^\d{3}$/.test(trimmedPhone)) {
        return { success: false, error: '請填寫正確的姓名與手機末三碼（3位數字）' };
    }

    // Match against CharacterStats (UserID ends with phone3)
    const { data: users, error: fetchErr } = await getSupabase()
        .from('CharacterStats')
        .select('UserID, Name')
        .eq('Name', trimmedName)
        .ilike('UserID', `%${trimmedPhone}`);

    if (fetchErr) return { success: false, error: '查詢失敗，請稍後再試' };
    if (!users || users.length === 0) {
        return { success: false, error: '找不到符合的學員資料，請確認姓名與手機末三碼是否正確' };
    }

    const user = users[0];

    // Check for existing registration
    const { data: existing } = await getSupabase()
        .from('CourseRegistrations')
        .select('id')
        .eq('user_id', user.UserID)
        .eq('course_key', courseKey)
        .single();

    if (existing) {
        return { success: true, registrationId: existing.id, userName: user.Name };
    }

    // Create new registration
    const { data: newReg, error: insertErr } = await getSupabase()
        .from('CourseRegistrations')
        .insert({ user_id: user.UserID, course_key: courseKey })
        .select('id')
        .single();

    if (insertErr || !newReg) {
        return { success: false, error: '報名失敗，請稍後再試' };
    }

    return { success: true, registrationId: newReg.id, userName: user.Name };
}

/**
 * Mark attendance by scanning registration QR code (UUID).
 * Uses upsert — safe to call multiple times (alreadyCheckedIn flag indicates repeat scan).
 */
export async function markAttendance(
    registrationId: string,
    note: string = 'admin'
): Promise<
    | { success: true; userName: string; courseKey: string; alreadyCheckedIn: boolean }
    | { success: false; error: string }
> {
    // Look up the registration
    const { data: reg, error: regErr } = await getSupabase()
        .from('CourseRegistrations')
        .select('user_id, course_key')
        .eq('id', registrationId)
        .single();

    if (regErr || !reg) {
        return { success: false, error: '無效的 QR 碼，找不到對應報名記錄' };
    }

    // Get user name
    const { data: user } = await getSupabase()
        .from('CharacterStats')
        .select('Name')
        .eq('UserID', reg.user_id)
        .single();

    const userName = user?.Name ?? reg.user_id;
    const courseKey = reg.course_key as string;

    // Check if already checked in
    const { data: existing } = await getSupabase()
        .from('CourseAttendance')
        .select('id')
        .eq('user_id', reg.user_id)
        .eq('course_key', courseKey)
        .single();

    if (existing) {
        return { success: true, userName, courseKey, alreadyCheckedIn: true };
    }

    // Insert attendance record
    const { error: attendErr } = await getSupabase()
        .from('CourseAttendance')
        .insert({ user_id: reg.user_id, course_key: courseKey, checked_in_by: note });

    if (attendErr) {
        return { success: false, error: '報到寫入失敗，請重試' };
    }

    return { success: true, userName, courseKey, alreadyCheckedIn: false };
}

/**
 * Get full attendance list for a course (volunteer/admin use).
 */
export async function getCourseAttendanceList(
    courseKey: string
): Promise<{ userId: string; userName: string; attendedAt: string }[]> {
    const { data, error } = await getSupabase()
        .from('CourseAttendance')
        .select('user_id, attended_at')
        .eq('course_key', courseKey)
        .order('attended_at', { ascending: false });

    if (error || !data) return [];

    const userIds = data.map(r => r.user_id);
    if (userIds.length === 0) return [];

    const { data: users } = await getSupabase()
        .from('CharacterStats')
        .select('UserID, Name')
        .in('UserID', userIds);

    const nameMap = new Map((users ?? []).map(u => [u.UserID, u.Name]));

    return data.map(r => ({
        userId: r.user_id,
        userName: nameMap.get(r.user_id) ?? r.user_id,
        attendedAt: r.attended_at,
    }));
}

// ── 場次管理（Screenings）────────────────────────────────────────────────

/** 列出所有 active 場次，依日期升序（用於 CourseTab 前台） */
export async function getScreenings(): Promise<Screening[]> {
    const { data, error } = await getSupabase()
        .from('Screenings')
        .select('*')
        .eq('active', true)
        .order('date', { ascending: true });

    if (error || !data) return [];
    return data as Screening[];
}

/** 列出所有場次（含 inactive），用於後台管理 */
export async function getAllScreenings(): Promise<Screening[]> {
    const { data, error } = await getSupabase()
        .from('Screenings')
        .select('*')
        .order('date', { ascending: true });

    if (error || !data) return [];
    return data as Screening[];
}

/** 新增場次（GM 後台） */
export async function createScreening(data: {
    id: string;
    name: string;
    date: string;
    time: string;
    location: string;
}): Promise<{ success: boolean; error?: string }> {
    const { error } = await getSupabase()
        .from('Screenings')
        .insert({ ...data, active: true });

    if (error) return { success: false, error: error.message };
    return { success: true };
}

/** 更新場次（GM 後台） */
export async function updateScreening(
    id: string,
    data: { name: string; date: string; time: string; location: string; active: boolean }
): Promise<{ success: boolean; error?: string }> {
    const { error } = await getSupabase()
        .from('Screenings')
        .update(data)
        .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

/** 刪除場次（GM 後台） */
export async function deleteScreening(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await getSupabase()
        .from('Screenings')
        .delete()
        .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
}
