import React, { useState } from 'react';
import { ShoppingBag, Coins, Users, User, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { ARTIFACTS_CONFIG } from '@/lib/constants';
import { purchaseArtifact, transferCoinsToTeam } from '@/app/actions/store';
import { transferGoldenDiceToTeam } from '@/app/actions/dice';
import { CharacterStats, TeamSettings } from '@/types';

interface ShopTabProps {
    userData: CharacterStats;
    teamSettings: TeamSettings | null;
    teamMemberCount?: number;
    onPurchaseSuccess: () => void;
    onShowMessage: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function ShopTab({ userData, teamSettings, teamMemberCount = 1, onPurchaseSuccess, onShowMessage }: ShopTabProps) {
    const [isBuying, setIsBuying] = useState<string | null>(null);
    const [transferAmount, setTransferAmount] = useState<number | ''>('');
    const [goldenTransferAmount, setGoldenTransferAmount] = useState<number | ''>('');
    const [isTransferring, setIsTransferring] = useState(false);

    const handleTransfer = async () => {
        if (!userData.TeamName || !transferAmount || typeof transferAmount !== 'number' || transferAmount <= 0) return;
        setIsTransferring(true);
        try {
            const res = await transferCoinsToTeam(userData.UserID, userData.TeamName, transferAmount);
            if (res.success) {
                onShowMessage(`已成功將 ${transferAmount} 金幣注入團隊資金！`, "success");
                setTransferAmount('');
                onPurchaseSuccess();
            } else {
                onShowMessage(res.error || "轉帳失敗", "error");
            }
        } catch (error: any) {
            onShowMessage(`系統異常: ${error.message}`, "error");
        } finally {
            setIsTransferring(false);
        }
    };

    const handleGoldenTransfer = async () => {
        if (!userData.TeamName || !goldenTransferAmount || typeof goldenTransferAmount !== 'number' || goldenTransferAmount <= 0) return;
        setIsTransferring(true);
        try {
            const res = await transferGoldenDiceToTeam(userData.UserID, userData.TeamName, goldenTransferAmount);
            if (res.success) {
                onShowMessage(`已成功將 ${goldenTransferAmount} 枚黃金骰子注入團隊物資！`, "success");
                setGoldenTransferAmount('');
                onPurchaseSuccess();
            } else {
                onShowMessage(res.error || "轉帳失敗", "error");
            }
        } catch (error: any) {
            onShowMessage(`系統異常: ${error.message}`, "error");
        } finally {
            setIsTransferring(false);
        }
    };



    const handlePurchase = async (artifactId: string, isTeamBinding: boolean) => {
        setIsBuying(artifactId);
        try {
            const teamName = isTeamBinding ? userData.TeamName : null;
            if (isTeamBinding && !teamName) {
                onShowMessage("小隊專屬法寶需加入小隊後由隊長購買", "error");
                return;
            }
            if (isTeamBinding && !userData.IsCaptain) {
                onShowMessage("只有小隊長可以使用團隊修為購買專屬法寶", "error");
                return;
            }

            const res = await purchaseArtifact(userData.UserID, artifactId, teamName || null);
            if (res.success) {
                onShowMessage(`交易成功！法寶已收入囊中。`, "success");
                onPurchaseSuccess();
            } else {
                onShowMessage(res.error || "購買失敗", "error");
            }
        } catch (error: any) {
            onShowMessage(`系統異常: ${error.message}`, "error");
        } finally {
            setIsBuying(null);
        }
    };

    const myInventory = typeof userData.Inventory === 'string' ? JSON.parse(userData.Inventory) : (userData.Inventory || []);
    const teamInventory = teamSettings ? (typeof teamSettings.inventory === 'string' ? JSON.parse(teamSettings.inventory) : (teamSettings.inventory || [])) : [];

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-left">
            <div className="bg-gradient-to-br from-yellow-950/40 to-slate-900 border-2 border-yellow-500/40 rounded-4xl p-6 shadow-2xl text-center mx-auto">
                <div className="flex items-center justify-center gap-2 text-yellow-500 font-black text-xs uppercase mb-2 tracking-widest">
                    <ShoppingBag size={16} /> 天庭藏寶閣
                </div>
                <h2 className="text-2xl font-black text-white italic mx-auto">法寶兌換處</h2>
                <div className="flex items-center justify-center gap-4 mt-4 text-xs font-black">
                    <div className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-xl">
                        <User size={14} /> 個人金幣: {userData.Coins || 0}
                    </div>
                    <div className="flex items-center gap-1.5 text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-xl text-[10px]">
                        <Sparkles size={12} /> 黃金骰子: {userData.GoldenDice || 0}
                    </div>
                    {userData.TeamName && (
                        <div className="flex items-center gap-1.5 text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl">
                            <Users size={14} /> 團隊資金: {teamSettings?.team_coins || 0}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {userData.TeamName && (
                    <div className="bg-indigo-950/20 border-2 border-indigo-500/30 p-5 rounded-3xl flex flex-col justify-between hover:bg-indigo-950/30 transition-all">
                        <div>
                            <div className="flex items-center gap-2 text-indigo-400 font-black text-sm mb-2 italic tracking-wider">
                                <Users size={18} /> 共享黃金骰
                            </div>
                            <p className="text-xs text-indigo-200/60 font-medium mb-3">捐獻黃金骰子至部隊公庫</p>
                            <input
                                type="number"
                                min="1"
                                max={userData.GoldenDice || 0}
                                value={goldenTransferAmount}
                                onChange={e => setGoldenTransferAmount(e.target.value ? parseInt(e.target.value, 10) : '')}
                                placeholder="數量"
                                className="w-full bg-slate-950/50 border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white font-bold mb-3 outline-none focus:border-indigo-500/50"
                            />
                        </div>
                        
                        <button
                            onClick={handleGoldenTransfer}
                            disabled={isTransferring || !goldenTransferAmount || goldenTransferAmount <= 0 || goldenTransferAmount > (userData.GoldenDice || 0)}
                            className="w-full bg-indigo-600 py-2.5 rounded-xl font-black text-sm text-white hover:bg-indigo-500 active:scale-95 disabled:opacity-40 transition-all shadow-lg shadow-indigo-900/20"
                        >
                            {isTransferring ? '交付中' : '交付部隊'}
                        </button>
                    </div>
                )}
            </div>

            {userData.TeamName && (
                <div className="bg-indigo-950/40 border-2 border-indigo-500/30 p-4 rounded-3xl flex items-center justify-between gap-4 mt-2 mb-6">
                    <div className="flex-1">
                        <p className="text-xs text-indigo-300 font-bold mb-2">捐獻個人金幣至團隊</p>
                        <input
                            type="number"
                            min="1"
                            max={userData.Coins || 0}
                            value={transferAmount}
                            onChange={e => setTransferAmount(e.target.value ? parseInt(e.target.value, 10) : '')}
                            placeholder="輸入金幣數量"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-indigo-500"
                        />
                    </div>
                    <button
                        onClick={handleTransfer}
                        disabled={isTransferring || !transferAmount || typeof transferAmount !== 'number' || transferAmount <= 0 || transferAmount > (userData.Coins || 0)}
                        className="mt-6 shrink-0 bg-indigo-600 px-6 py-2.5 rounded-xl font-black text-sm text-white hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                    >
                        {isTransferring ? '傳輸中...' : '入帳'}
                    </button>
                </div>
            )}

            <div className="space-y-4">
                {ARTIFACTS_CONFIG.map(artifact => {
                    const isOwned = artifact.isTeamBinding
                        ? teamInventory.includes(artifact.id)
                        : myInventory.includes(artifact.id);

                    // 互斥判斷：a5 金剛杖 與 a1 如意金箍棒互斥（皆為個人法寶）
                    const isExclusiveBlocked = !!(artifact.exclusiveWith && myInventory.includes(artifact.exclusiveWith));

                    const isPerMember = artifact.isTeamBinding && artifact.price !== 0;
                    const finalPrice = isPerMember ? artifact.price * teamMemberCount : artifact.price;

                    let buttonText = isOwned ? '已擁有' : (finalPrice === 0 ? '免費領取（長輩）' : `投入 ${finalPrice} 金幣`);
                    if (isExclusiveBlocked) buttonText = '與已持有的法寶互斥';

                    return (
                        <div key={artifact.id} className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                            {isOwned && (
                                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-lg">
                                    <CheckCircle2 size={12} /> 已裝備
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-black text-white">{artifact.name}</h3>
                                        <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${artifact.isTeamBinding ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                            {artifact.isTeamBinding ? '小隊專屬' : '個人法寶'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed font-bold">{artifact.description}</p>
                                </div>
                            </div>

                            <div className="bg-slate-950 p-3 rounded-2xl border border-white/5 mb-4 my-3 text-xs text-orange-400 font-bold flex items-start gap-2">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <span>效果：{artifact.effect}</span>
                            </div>

                            <button
                                disabled={isOwned || isExclusiveBlocked || isBuying === artifact.id || (artifact.isTeamBinding && !userData.IsCaptain)}
                                onClick={() => handlePurchase(artifact.id, artifact.isTeamBinding)}
                                className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${isOwned || isExclusiveBlocked ? 'bg-slate-800 text-slate-500 cursor-not-allowed' :
                                    artifact.isTeamBinding
                                        ? (userData.IsCaptain ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 shadow-lg shadow-indigo-600/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed')
                                        : 'bg-yellow-600 text-white hover:bg-yellow-500 active:scale-95 shadow-lg shadow-yellow-600/20'
                                    }`}
                            >
                                {!isOwned && !isExclusiveBlocked && <Coins size={16} />}
                                {isBuying === artifact.id ? '煉化中...' : buttonText}
                                {isPerMember && !isOwned && !isExclusiveBlocked && <span className="opacity-70 text-[10px]"> (隊長統一扣款)</span>}
                            </button>
                            {artifact.isTeamBinding && !userData.IsCaptain && !isOwned && !isExclusiveBlocked && (
                                <p className="text-[10px] text-red-400 text-center mt-2 font-bold">需由小隊長操作購買</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
