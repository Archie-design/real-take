'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { registerForCourse } from '@/app/actions/course';
import { COURSE_INFO } from '@/lib/courseConfig';

const COURSE_KEY = 'class_c' as const;
const INFO = COURSE_INFO[COURSE_KEY];

export default function ClassCRegisterPage() {
    const [name, setName] = useState('');
    const [phone3, setPhone3] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ registrationId: string; userName: string } | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);
        const res = await registerForCourse(name, phone3, COURSE_KEY);
        setLoading(false);
        if (res.success) {
            setResult({ registrationId: res.registrationId, userName: res.userName });
        } else {
            setError(res.error);
        }
    }

    return (
        <main className="min-h-screen bg-slate-950 flex items-start justify-center px-4 py-10">
            <div className="w-full max-w-sm space-y-5">
                {/* Header */}
                <div className="text-center space-y-1">
                    <p className="text-xs font-black text-purple-400 uppercase tracking-widest">2026 大無限開運親證班</p>
                    <h1 className="text-2xl font-black text-white">第三堂・{INFO.name}</h1>
                    <p className="text-sm text-slate-400">線上報名 / 取得報到 QR 碼</p>
                </div>

                {/* Course Info Card */}
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-2 text-sm">
                    <div className="flex gap-3 items-start">
                        <span className="text-base w-5 shrink-0">📅</span>
                        <span className="text-slate-200">{INFO.dateDisplay}</span>
                    </div>
                    <div className="flex gap-3 items-start">
                        <span className="text-base w-5 shrink-0">⏰</span>
                        <span className="text-slate-200">{INFO.time}</span>
                    </div>
                    <div className="flex gap-3 items-start">
                        <span className="text-base w-5 shrink-0">📍</span>
                        <span className="text-slate-200">{INFO.location}</span>
                    </div>
                    <div className="flex gap-3 items-start">
                        <span className="text-base w-5 shrink-0">🎫</span>
                        <span className="text-slate-400 text-xs leading-relaxed">限大無限體系：無限・合一・幸福・奇蹟・永恆・星光・太陽</span>
                    </div>
                </div>

                {!result ? (
                    /* Registration Form */
                    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4">
                        <p className="text-xs text-slate-400 text-center">請填寫以下資料，系統將比對您的學員記錄</p>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-300 block">姓名</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="請輸入姓名"
                                required
                                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 min-h-[44px]"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-300 block">手機末三碼</label>
                            <input
                                type="tel"
                                value={phone3}
                                onChange={e => setPhone3(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                placeholder="例：456"
                                maxLength={3}
                                required
                                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 min-h-[44px]"
                            />
                        </div>
                        {error && (
                            <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-xl px-3 py-2">{error}</p>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-black rounded-xl py-3 text-sm transition-colors min-h-[44px]"
                        >
                            {loading ? '查詢中…' : '確認報名 / 取得 QR 碼'}
                        </button>
                    </form>
                ) : (
                    /* QR Code Display */
                    <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-5 space-y-4 text-center">
                        <div className="space-y-1">
                            <p className="text-xs font-black text-purple-400 uppercase tracking-widest">報名成功</p>
                            <p className="text-lg font-black text-white">{result.userName}</p>
                            <p className="text-xs text-slate-400">{INFO.dateDisplay}・{INFO.location}</p>
                        </div>
                        <div className="flex justify-center">
                            <div className="bg-white p-3 rounded-2xl">
                                <QRCode value={result.registrationId} size={200} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-purple-400">截圖保存此頁面</p>
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                報到當天出示 QR 碼供工作人員掃描<br />請確保手機螢幕亮度足夠
                            </p>
                        </div>
                        <button
                            onClick={() => setResult(null)}
                            className="text-xs text-slate-500 underline"
                        >
                            重新查詢
                        </button>
                    </div>
                )}

                <p className="text-center text-[10px] text-slate-600">星光西遊・修行打卡系統</p>
            </div>
        </main>
    );
}
