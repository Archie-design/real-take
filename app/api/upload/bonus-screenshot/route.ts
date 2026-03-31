'use server';

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { success: false, error: '缺少必要參數' },
        { status: 400 }
      );
    }

    // 文件大小限制 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '檔案大小不能超過 5MB' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 生成唯一的檔案名稱
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `b5b6/${userId}/${timestamp}.${fileExt}`;

    // 轉換 File 為 Buffer
    const buffer = await file.arrayBuffer();

    const { data, error } = await supabase.storage
      .from('w4-screenshots')
      .upload(fileName, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      return NextResponse.json(
        { success: false, error: '上傳失敗：' + error.message },
        { status: 500 }
      );
    }

    // 取得公開 URL
    const { data: publicUrl } = supabase.storage
      .from('w4-screenshots')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrl.publicUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: '伺服器錯誤：' + err.message },
      { status: 500 }
    );
  }
}
