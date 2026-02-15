"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, Edit3, Save, 
  Layers, Compass, Cloud, 
  Maximize2, Heart, Ghost, Snowflake, Droplets,
  Navigation, PaintBucket, Dices, Flame, LayoutGrid,
  AlertTriangle, EyeOff, User, Wind 
} from 'lucide-react';

// 使用 ESM CDN 匯入以解決預覽環境中的模組解析錯誤
import { createClient } from '@supabase/supabase-js';

// --- 介面定義 (Interfaces) ---
interface TerrainInfo {
  id: string;
  name: string;
  url: string;
  scale: number;
  vOffset: number;
  color: string;
  effect: string;
}

interface ZoneInfo {
  id: string;
  name: string;
  char?: string;
  color: string;
  textColor: string;
  icon: React.ReactNode;
}

interface HexPos {
  q: number;
  r: number;
  x: number;
  y: number;
}

interface HexData extends HexPos {
  type: 'center' | 'corridor' | 'subzone';
  terrainId?: string;
  color: string;
  key: string;
  zoneId?: string;
  subIdx?: number;
}

// --- Supabase 初始化 ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_CONFIG = {
  CENTER_SIDE: 15,       
  CORRIDOR_W: 5,
  CORRIDOR_L: 60,
  SUBZONE_SIDE: 15,
  HEX_SIZE_WORLD: 8.0,   
  HEX_SIZE_EDITOR: 25,  
};

const ZONES: ZoneInfo[] = [
  { id: 'pride', name: '慢．傲慢之巔', char: '白龍馬', color: '#f8fafc', textColor: 'text-slate-100', icon: <Snowflake size={14}/> },
  { id: 'doubt', name: '疑．迷途森林', char: '唐三藏', color: '#1e3a8a', textColor: 'text-blue-400', icon: <EyeOff size={14}/> },
  { id: 'anger', name: '嗔．焦熱荒原', char: '孫悟空', color: '#991b1b', textColor: 'text-red-500', icon: <Flame size={14}/> },
  { id: 'greed', name: '貪．慾望泥沼', char: '豬八戒', color: '#14532d', textColor: 'text-emerald-500', icon: <Droplets size={14}/> },
  { id: 'delusion', name: '痴．虛妄流沙', char: '沙悟淨', color: '#78350f', textColor: 'text-orange-500', icon: <Wind size={14}/> },
  { id: 'chaos', name: '混沌迷霧', char: 'Boss', color: '#1e293b', textColor: 'text-slate-400', icon: <Ghost size={14}/> },
];

const TERRAIN_TYPES: Record<string, TerrainInfo> = {
  grass: { id: 'grass', name: '茵綠草地', url: '/assets/terrains/The Sanctuary/Grassland.png', scale: 1.15, vOffset: 0.0, color: '#1a472a', effect: '【移動】消耗 1 點。安全、歸零。' },
  roots: { id: 'roots', name: '世界樹根', url: '/assets/terrains/The Sanctuary/Roots.png', scale: 1.15, vOffset: 0.0, color: '#064e3b', effect: '【阻擋】無法通行。中心裝飾與障礙。' },
  spring: { id: 'spring', name: '能量湧泉', url: '/assets/terrains/The Sanctuary/Spring of Energy.png', scale: 1.15, vOffset: 0.0, color: '#38bdf8', effect: '【特殊】回復 10% HP，擲骰 +1。' },
  roots_yggdrasil: { id: 'roots_yggdrasil', name: '世界樹盤根', url: '/assets/terrains/The Sanctuary/Roots of Yggdrasil.png', scale: 1.15, vOffset: 0.0, color: '#064e3b', effect: '【地障】自然形成的地形障礙。' },
  snow_path: { id: 'snow_path', name: '積雪山徑', url: '/assets/terrains/Arrogance Peak/Snowy Path.png', scale: 1.15, vOffset: 0.0, color: '#e2e8f0', effect: '【移動】消耗 1 點。' },
  ice_wall: { id: 'ice_wall', name: '冰封絕壁', url: '/assets/terrains/Arrogance Peak/Ice Wall.png', scale: 1.15, vOffset: 0.0, color: '#94a3b8', effect: '【阻擋】高度差 > 2。非飛行無法通過。' },
  thin_air: { id: 'thin_air', name: '稀薄空氣', url: '/assets/terrains/Arrogance Peak/Thin Air.png', scale: 1.15, vOffset: 0.0, color: '#cbd5e1', effect: '【減益】本回合攻擊力下降 20%。' },
  slippery_slope: { id: 'slippery_slope', name: '滑坡', url: '/assets/terrains/Arrogance Peak/Slippery Slope.png', scale: 1.15, vOffset: 0.0, color: '#94a3b8', effect: '【機制】結束時若無釘鞋將滑落。' },
  cliffs_pride: { id: 'cliffs_pride', name: '絕雲冰壁', url: '/assets/terrains/Arrogance Peak/Cloud-Piercing Cliffs.png', scale: 1.15, vOffset: 0.0, color: '#64748b', effect: '【地障】極高海拔形成的冰壁。' },
  dark_trail: { id: 'dark_trail', name: '幽暗小徑', url: '/assets/terrains/Forest of Doubt/Dark Trail.png', scale: 1.15, vOffset: 0.0, color: '#1a472a', effect: '【移動】消耗 1 點。' },
  ancient_tree: { id: 'ancient_tree', name: '千年古樹', url: '/assets/terrains/Forest of Doubt/Ancient Tree.png', scale: 1.15, vOffset: 0.0, color: '#0f172a', effect: '【阻擋】無法通行且阻擋視線。' },
  fog: { id: 'fog', name: '濃重迷霧', url: '/assets/terrains/Forest of Doubt/Dense Fog.png', scale: 1.15, vOffset: 0.0, color: '#475569', effect: '【減益】看不到 2 格外的數值。' },
  thorns: { id: 'thorns', name: '荊棘叢', url: '/assets/terrains/Forest of Doubt/Thorns.png', scale: 1.15, vOffset: 0.0, color: '#1e293b', effect: '【機制】移動消耗加倍。' },
  wall_thorns: { id: 'wall_thorns', name: '嘆息荊棘牆', url: '/assets/terrains/Forest of Doubt/Wall of Thorns.png', scale: 1.15, vOffset: 0.0, color: '#1e293b', effect: '【地障】密不可分的防禦荊棘。' },
  cracked_earth: { id: 'cracked_earth', name: '龜裂大地', url: '/assets/terrains/Scorched Earth/Cracked Earth.png', scale: 1.15, vOffset: 0.0, color: '#450a0a', effect: '【移動】消耗 1 點。' },
  obsidian: { id: 'obsidian', name: '黑曜石岩', url: '/assets/terrains/Scorched Earth/Obsidian Rock.png', scale: 1.15, vOffset: 0.0, color: '#111827', effect: '【阻擋】無法通行，悟空可擊碎。' },
  lava: { id: 'lava', name: '熔岩流', url: '/assets/terrains/Scorched Earth/Lava Flow.png', scale: 1.15, vOffset: 0.0, color: '#991b1b', effect: '【減益】停留每回合扣 5% HP。' },
  geyser: { id: 'geyser', name: '間歇泉', url: '/assets/terrains/Scorched Earth/Geyser.png', scale: 1.15, vOffset: 0.0, color: '#ef4444', effect: '【機制】30% 機率彈射鄰格。' },
  abyssal_magma: { id: 'abyssal_magma', name: '虛空火海', url: '/assets/terrains/Scorched Earth/Abyssal Magma.png', scale: 1.15, vOffset: 0.0, color: '#7f1d1d', effect: '【地障】嗔恨構成的致命區。' },
  wetland: { id: 'wetland', name: '泥濘濕地', url: '/assets/terrains/Swamp of Greed/Wetland.png', scale: 1.15, vOffset: 0.0, color: '#064e3b', effect: '【移動】消耗 1 點。' },
  rotten_vines: { id: 'rotten_vines', name: '腐敗巨藤', url: '/assets/terrains/Swamp of Greed/Rotten Vines.png', scale: 1.15, vOffset: 0.0, color: '#14532d', effect: '【阻擋】無法通行。' },
  deep_bog: { id: 'deep_bog', name: '深淵泥淖', url: '/assets/terrains/Swamp of Greed/Deep Bog.png', scale: 1.15, vOffset: 0.0, color: '#022c22', effect: '【減益】進入即立刻停止移動。' },
  mimic: { id: 'mimic', name: '偽裝寶箱', url: '/assets/terrains/Swamp of Greed/Mimic Chest.png', scale: 1.15, vOffset: 0.0, color: '#713f12', effect: '【機制】未過檢定扣骰子。' },
  corrupted_vines: { id: 'corrupted_vines', name: '腐化巨藤', url: '/assets/terrains/Swamp of Greed/Corrupted Vines.png', scale: 1.15, vOffset: 0.0, color: '#064e3b', effect: '【地障】致命的劇毒藤蔓。' },
  sand_dune: { id: 'sand_dune', name: '虛妄沙丘', url: '/assets/terrains/delusion/Sand Dune.png', scale: 1.15, vOffset: 0.0, color: '#d97706', effect: '【移動】消耗 1 點。' },
  sandstorm_wall: { id: 'sandstorm_wall', name: '沙塵暴壁', url: '/assets/terrains/delusion/Sandstorm Wall.png', scale: 1.15, vOffset: 0.0, color: '#451a03', effect: '【阻擋】暫時無法通行的動態牆。' },
  quicksand: { id: 'quicksand', name: '迷走流沙', url: '/assets/terrains/delusion/Quicksand.png', scale: 1.15, vOffset: 0.0, color: '#92400e', effect: '【減益】結束時位移下一格。' },
  mirage: { id: 'mirage', name: '海市蜃樓', url: '/assets/terrains/delusion/Mirage.png', scale: 1.15, vOffset: 0.0, color: '#f59e0b', effect: '【機制】指令前後左右反轉。' },
  chaos_storm_barr: { id: 'chaos_storm_barr', name: '混沌風暴', url: '/assets/terrains/delusion/Chaos Sandstorm.png', scale: 1.15, vOffset: 0.0, color: '#1e293b', effect: '【地障】視覺與行進終極障礙。' },
  ash_path: { id: 'ash_path', name: '灰燼虛道', url: '/assets/terrains/The Chaos/Ash Path.png', scale: 1.15, vOffset: 0.0, color: '#475569', effect: '【移動】消耗 1 點移動力。穩定的立足點。' },
  glitch_wall: { id: 'glitch_wall', name: '錯誤代碼牆', url: '/assets/terrains/The Chaos/Glitch Wall.png', scale: 1.15, vOffset: 0.0, color: '#1e293b', effect: '【阻擋】業障牆。無法通行、破壞或穿越。' },
  entropy_field: { id: 'entropy_field', name: '熵增力場', url: '/assets/terrains/The Chaos/Entropy Field.png', scale: 1.15, vOffset: 0.0, color: '#0f172a', effect: '【特殊】結束時扣除 1 骰子或 15% HP。' },
  random_anomaly: { id: 'random_anomaly', name: '隨機異常', url: '/assets/terrains/The Chaos/Random Anomaly.png', scale: 1.15, vOffset: 0.0, color: '#334155', effect: '【特殊】踏入隨機觸發五區的一種負面效果。' },
  void: { id: 'void', name: '虛空邊界', url: '/assets/terrains/The Chaos/Event Horizon.png', scale: 1.15, vOffset: 0.0, color: '#020617', effect: '【地障】墜入虛空！扣 50% HP 並傳回中心。' },
};

const zoneWeights: Record<string, string[]> = {
  center: ['grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'roots', 'spring', 'roots_yggdrasil'],
  pride: ['snow_path', 'snow_path', 'snow_path', 'snow_path', 'snow_path', 'snow_path', 'snow_path', 'snow_path', 'snow_path', 'snow_path', 'snow_path', 'snow_path', 'ice_wall', 'thin_air', 'slippery_slope', 'cliffs_pride'],
  doubt: ['dark_trail', 'dark_trail', 'dark_trail', 'dark_trail', 'dark_trail', 'dark_trail', 'dark_trail', 'dark_trail', 'dark_trail', 'dark_trail', 'dark_trail', 'dark_trail', 'ancient_tree', 'fog', 'thorns', 'wall_thorns'],
  anger: ['cracked_earth', 'cracked_earth', 'cracked_earth', 'cracked_earth', 'cracked_earth', 'cracked_earth', 'cracked_earth', 'cracked_earth', 'cracked_earth', 'cracked_earth', 'cracked_earth', 'cracked_earth', 'obsidian', 'lava', 'geyser', 'abyssal_magma'],
  greed: ['wetland', 'wetland', 'wetland', 'wetland', 'wetland', 'wetland', 'wetland', 'wetland', 'wetland', 'wetland', 'wetland', 'wetland', 'rotten_vines', 'deep_bog', 'mimic', 'corrupted_vines'],
  delusion: ['sand_dune', 'sand_dune', 'sand_dune', 'sand_dune', 'sand_dune', 'sand_dune', 'sand_dune', 'sand_dune', 'sand_dune', 'sand_dune', 'sand_dune', 'sand_dune', 'sandstorm_wall', 'quicksand', 'mirage', 'chaos_storm_barr'],
  chaos: ['ash_path', 'ash_path', 'ash_path', 'ash_path', 'ash_path', 'ash_path', 'ash_path', 'ash_path', 'ash_path', 'ash_path', 'ash_path', 'ash_path', 'glitch_wall', 'entropy_field', 'random_anomaly', 'void']
};

const App = () => {
  const [view, setView] = useState<'world' | 'editor'>('world'); 
  const [selectedZone, setSelectedZone] = useState<ZoneInfo | {id: string, name: string} | null>(null);
  const [selectedSubZoneIdx, setSelectedSubZoneIdx] = useState<number>(0); 
  const [brush, setBrush] = useState<string>('grass');
  const [mapData, setMapData] = useState<Record<string, string>>({}); 
  const [hoveredHex, setHoveredHex] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>('idle');
  const [corridorL, setCorridorL] = useState<number>(DEFAULT_CONFIG.CORRIDOR_L);
  const [corridorW, setCorridorW] = useState<number>(DEFAULT_CONFIG.CORRIDOR_W);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data, error } = await supabase.from('world_maps').select('data').eq('id', 'main_world_map').single();
        if (data && data.data) {
          const fetchedData = data.data as { terrain?: Record<string, string>, config?: { corridorL: number, corridorW: number } };
          setMapData(fetchedData.terrain || {});
          if (fetchedData.config) {
            setCorridorL(fetchedData.config.corridorL || DEFAULT_CONFIG.CORRIDOR_L);
            setCorridorW(fetchedData.config.corridorW || DEFAULT_CONFIG.CORRIDOR_W);
          }
          setSyncStatus('synced');
        }
      } catch (err) { setSyncStatus('error'); }
    };
    fetchInitialData();
  }, []);

  const saveMapToCloud = async () => {
    setSyncStatus('saving');
    try {
      const { error } = await supabase.from('world_maps').upsert({ 
        id: 'main_world_map', 
        data: { terrain: mapData, config: { corridorL, corridorW } },
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setSyncStatus('synced');
    } catch (error) { setSyncStatus('error'); }
  };

  const axialToPixel = (q: number, r: number, size: number): { x: number, y: number } => ({
    x: size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r),
    y: size * (3/2 * r)
  });

  const getHexPointsStr = (cx: number, cy: number, r: number): string => {
    let points = "";
    for (let i = 0; i < 6; i++) {
      const angle_rad = (Math.PI / 180) * (60 * i - 30);
      points += `${cx + r * Math.cos(angle_rad)},${cy + r * Math.sin(angle_rad)} `;
    }
    return points;
  };

  const getHexRegion = (radius: number): { q: number, r: number }[] => {
    const results: { q: number, r: number }[] = [];
    for (let q = -radius; q <= radius; q++) {
      for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
        results.push({ q, r });
      }
    }
    return results;
  };

  const handleHexClick = useCallback((q: number, r: number) => {
    if (view !== 'editor' || !selectedZone) return;
    const key = `${selectedZone.id}_${selectedSubZoneIdx}_${q},${r}`;
    setMapData(prev => ({ ...prev, [key]: brush }));
    setSyncStatus('idle'); 
  }, [view, selectedZone, selectedSubZoneIdx, brush]);

  const handleFillAll = useCallback(() => {
    if (!selectedZone) return;
    const radius = DEFAULT_CONFIG.SUBZONE_SIDE - 1;
    const allHexes = getHexRegion(radius);
    const fillData: Record<string, string> = {};
    allHexes.forEach(h => {
      const key = `${selectedZone.id}_${selectedSubZoneIdx}_${h.q},${h.r}`;
      fillData[key] = brush;
    });
    setMapData(prev => ({ ...prev, ...fillData }));
    setSyncStatus('idle'); 
  }, [selectedZone, selectedSubZoneIdx, brush]);

  const handleRandomize = useCallback(() => {
    if (!selectedZone) return;
    const radius = DEFAULT_CONFIG.SUBZONE_SIDE - 1;
    const allHexes = getHexRegion(radius);
    const randomData: Record<string, string> = {};
    const weights = zoneWeights[selectedZone.id] || ['grass'];
    
    allHexes.forEach(h => {
      const key = `${selectedZone.id}_${selectedSubZoneIdx}_${h.q},${h.r}`;
      const randomTerrainId = weights[Math.floor(Math.random() * weights.length)];
      randomData[key] = randomTerrainId;
    });

    setMapData(prev => ({ ...prev, ...randomData }));
    setSyncStatus('idle');
  }, [selectedZone, selectedSubZoneIdx]);

  const worldGrid = useMemo(() => {
    const hexes: HexData[] = [];
    const hexMap = new Map<string, boolean>();
    const { CENTER_SIDE, SUBZONE_SIDE, HEX_SIZE_WORLD } = DEFAULT_CONFIG;
    const R_hub = CENTER_SIDE - 1;
    const S_s = SUBZONE_SIDE;

    getHexRegion(R_hub).forEach(p => {
      const pos = axialToPixel(p.q, p.r, HEX_SIZE_WORLD);
      const key = `center_0_${p.q},${p.r}`;
      const terrainId = mapData[key] || 'grass';
      hexes.push({ 
        ...p, ...pos, type: 'center', terrainId, 
        color: TERRAIN_TYPES[terrainId]?.color || '#1a472a', 
        key 
      });
      hexMap.set(`${p.q},${p.r}`, true);
    });

    const sideData = [
      { start: {q: 0, r: -R_hub}, step: {q: 1, r: 0}, out: {q: 1, r: -1} }, 
      { start: {q: R_hub, r: -R_hub}, step: {q: 0, r: 1}, out: {q: 1, r: 0} }, 
      { start: {q: R_hub, r: 0}, step: {q: -1, r: 1}, out: {q: 0, r: 1} }, 
      { start: {q: 0, r: R_hub}, step: {q: -1, r: 0}, out: {q: -1, r: 1} }, 
      { start: {q: -R_hub, r: R_hub}, step: {q: 0, r: -1}, out: {q: -1, r: 0} }, 
      { start: {q: -R_hub, r: 0}, step: {q: 1, r: -1}, out: {q: 0, r: -1} }, 
    ];

    ZONES.forEach((zone, zIdx) => {
      const side = sideData[zIdx];
      const centerIdx = Math.floor(CENTER_SIDE / 2);
      const halfW = Math.floor(corridorW / 2);
      for (let i = -halfW; i <= halfW; i++) {
        const idx = centerIdx + i;
        const startQ = side.start.q + side.step.q * idx;
        const startR = side.start.r + side.step.r * idx;
        for (let l = 1; l <= corridorL; l++) {
          const q = startQ + side.out.q * l;
          const r = startR + side.out.r * l;
          const key = `${q},${r}`;
          if (!hexMap.has(key)) {
            const pos = axialToPixel(q, r, HEX_SIZE_WORLD);
            hexes.push({ q, r, ...pos, type: 'corridor', color: '#1e293b', zoneId: zone.id, key: `corridor_${zone.id}_${key}` });
            hexMap.set(key, true);
          }
        }
      }
      const hubExitQ = side.start.q + side.step.q * centerIdx + side.out.q * corridorL;
      const hubExitR = side.start.r + side.step.r * centerIdx + side.out.r * corridorL;
      const zCQ = hubExitQ + side.out.q * S_s;
      const zCR = hubExitR + side.out.r * S_s;
      const subCenters = [
        { q: 0, r: 0 }, { q: 2*S_s-1, r: -(S_s-1) }, { q: S_s, r: S_s-1 }, 
        { q: -(S_s-1), r: 2*S_s-1 }, { q: -(2*S_s-1), r: S_s-1 }, 
        { q: -S_s, r: -(S_s-1) }, { q: S_s-1, r: -(2*S_s-1) }
      ];
      subCenters.forEach((sc, sIdx) => {
        const cq = zCQ + sc.q;
        const cr = zCR + sc.r;
        getHexRegion(S_s - 1).forEach(p => {
          const q = cq + p.q;
          const r = cr + p.r;
          const key = `${q},${r}`;
          if (!hexMap.has(key)) {
            const dataKey = `${zone.id}_${sIdx}_${p.q},${p.r}`;
            const terrainId = mapData[dataKey];
            const pos = axialToPixel(q, r, HEX_SIZE_WORLD);
            hexes.push({ 
              q, r, ...pos, type: 'subzone', 
              color: terrainId ? (TERRAIN_TYPES[terrainId]?.color || zone.color) : zone.color,
              terrainId: terrainId, zoneId: zone.id, subIdx: sIdx, key: dataKey
            });
            hexMap.set(key, true);
          }
        });
      });
    });

    return hexes.sort((a, b) => a.y - b.y);
  }, [mapData, corridorL, corridorW]);

  const renderHexNode = (hex: HexData, size: number) => {
    const isHovered = hoveredHex === hex.key;
    const terrain = hex.terrainId ? TERRAIN_TYPES[hex.terrainId] : null;
    const hexWidth = size * Math.sqrt(3);
    const assetScale = terrain?.scale || 1.15;
    const assetWidth = hexWidth * assetScale;
    const assetVOffset = (terrain?.vOffset || 0) * size * 3;

    return (
      <g 
        key={hex.key}
        className="transition-all duration-300"
        onMouseEnter={() => setHoveredHex(hex.key)}
        onMouseLeave={() => setHoveredHex(null)}
        onClick={() => {
          if (view === 'world' && hex.type === 'subzone') {
            const zone = ZONES.find(z => z.id === hex.zoneId);
            if (zone) {
              setSelectedZone(zone);
              setSelectedSubZoneIdx(hex.subIdx || 0);
              setView('editor');
            }
          } else if (view === 'world' && hex.type === 'center') {
            setSelectedZone({id: 'center', name: '本心草原'});
            setSelectedSubZoneIdx(0);
            setView('editor');
          } else if (view === 'editor') {
            handleHexClick(hex.q, hex.r);
          }
        }}
      >
        <polygon
          points={getHexPointsStr(hex.x, hex.y, size * 1.01)}
          fill={hex.color}
          stroke={isHovered ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.02)"}
          strokeWidth="1.5"
          className="cursor-pointer"
        />
        {terrain?.url && (
          <image 
            href={terrain.url}
            x={hex.x - assetWidth / 2}
            y={hex.y + (size * 0.8) - assetWidth - assetVOffset}
            width={assetWidth}
            height={assetWidth}
            preserveAspectRatio="xMidYMax meet"
            pointerEvents="none" 
            style={{ 
              filter: isHovered ? 'brightness(1.2) drop-shadow(0 10px 25px rgba(0,0,0,0.8))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              transform: isHovered ? 'scale(1.02)' : 'none',
              transformOrigin: `${hex.x}px ${hex.y}px`,
              transition: 'all 0.3s ease-out'
            }}
          />
        )}
      </g>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#040407] text-slate-300 font-sans overflow-hidden">
      <nav className="flex items-center justify-between px-8 py-4 bg-slate-950/90 border-b border-white/5 backdrop-blur-2xl z-40 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-xl shadow-lg border border-emerald-500/20">
            <Compass size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase italic tracking-widest text-emerald-400">Heart Lotus - Master Plan</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold italic">TypeScript 類型校正版：已補齊缺失圖示</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 shadow-inner">
            <Cloud size={14} className={syncStatus === 'synced' ? 'text-emerald-400' : 'text-yellow-400 animate-pulse'} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{syncStatus}</span>
          </div>
          {view === 'editor' && (
            <button onClick={() => setView('world')} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-bold border border-emerald-400/20 shadow-lg active:scale-95 transition-all">
              <ChevronLeft size={16} /> 返回世界
            </button>
          )}
          <div className="w-11 h-11 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center hover:border-emerald-500/50 transition-colors">
            <User size={22} className="text-emerald-500" />
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-slate-950/60 border-r border-white/5 p-7 backdrop-blur-md z-20 flex flex-col shadow-2xl overflow-y-auto">
          {view === 'world' ? (
            <div className="space-y-8 flex-1 flex flex-col">
              <section className="p-5 bg-white/5 rounded-3xl border border-white/10 shadow-inner">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Maximize2 size={14} className="text-emerald-500" /> 方位配置
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase mb-2 text-slate-500">
                      <span>廊道長度</span>
                      <span className="text-emerald-400 font-mono">{corridorL}</span>
                    </div>
                    <input type="range" min="10" max="100" value={corridorL} onChange={(e) => { setCorridorL(parseInt(e.target.value)); setSyncStatus('idle'); }} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                  </div>
                </div>
              </section>
              <section className="space-y-3.5 flex-1">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">六大修行區</h3>
                <div className="p-4 rounded-3xl border border-white/5 bg-slate-900/50 hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between group border-l-4 border-l-emerald-400" onClick={() => { setSelectedZone({id: 'center', name: '本心草原'}); setSelectedSubZoneIdx(0); setView('editor'); }}>
                   <div className="flex items-center gap-2">
                     <Heart size={14} className="text-emerald-400"/>
                     <span className="text-sm font-black text-slate-100">本心草原 (中心)</span>
                   </div>
                   <Edit3 size={14} className="text-slate-600 group-hover:text-emerald-400" />
                </div>
                {ZONES.map(z => (
                  <div key={z.id} className="p-4 rounded-3xl border border-white/5 bg-slate-900/50 hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between group border-l-4 border-l-transparent hover:border-l-current" style={{ color: z.color }} onClick={() => { setSelectedZone(z); setSelectedSubZoneIdx(0); setView('editor'); }}>
                    <div className="flex items-center gap-2">
                      {z.icon}
                      <div className="flex flex-col">
                        <span className={`text-sm font-black ${z.textColor}`}>{z.name}</span>
                        <span className="text-[10px] opacity-60 italic">對應：{z.char}</span>
                      </div>
                    </div>
                    <Edit3 size={14} className="text-slate-600 group-hover:text-emerald-400" />
                  </div>
                ))}
              </section>
              <button onClick={saveMapToCloud} className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-black text-sm transition-all shadow-2xl uppercase tracking-widest mt-auto">儲存地圖</button>
            </div>
          ) : (
            <div className="space-y-8 flex-1 flex flex-col">
              {selectedZone?.id !== 'center' && (
                <section className="mb-2 animate-in fade-in slide-in-from-top-4 duration-500">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2 px-1">
                    <LayoutGrid size={14} className="text-emerald-500" /> 子區域選擇
                  </h3>
                  <div className="grid grid-cols-4 gap-2 px-1">
                    {[0, 1, 2, 3, 4, 5, 6].map(i => (
                      <button
                        key={i}
                        onClick={() => setSelectedSubZoneIdx(i)}
                        className={`h-10 rounded-xl text-xs font-bold transition-all border ${
                          selectedSubZoneIdx === i 
                            ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 scale-105' 
                            : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        {i === 0 ? '中心' : i}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className={selectedZone?.id === 'center' ? "" : "border-t border-white/5 pt-6"}>
                <div className="flex items-center justify-between mb-5 px-1">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Layers size={14} className="text-emerald-500" /> {selectedZone?.name} 筆刷
                  </h3>
                  <div className="flex items-center gap-2">
                    <button onClick={handleRandomize} title="區域化隨機填滿" className="p-2 bg-white/5 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-all border border-white/10 group"><Dices size={16} className="group-hover:rotate-12" /></button>
                    <button onClick={handleFillAll} title="用當前筆刷填滿" className="p-2 bg-white/5 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-all border border-white/10 group"><PaintBucket size={16} className="group-hover:scale-110" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {Object.values(TERRAIN_TYPES)
                    .filter(t => {
                      if (selectedZone?.id === 'center') return ['grass', 'roots', 'spring', 'roots_yggdrasil'].includes(t.id);
                      if (selectedZone?.id === 'chaos') return ['ash_path', 'glitch_wall', 'entropy_field', 'random_anomaly', 'void', 'glitch'].includes(t.id);
                      return true;
                    })
                    .map((t) => (
                      <button 
                        key={t.id} 
                        onClick={() => setBrush(t.id)} 
                        className={`flex flex-col items-center p-3 rounded-3xl border transition-all overflow-hidden ${brush === t.id ? 'bg-emerald-500/10 border-emerald-500/50 scale-[0.98]' : 'bg-slate-900 border-white/5 opacity-50 hover:opacity-100 hover:bg-slate-800'}`}
                      >
                        <div className="w-12 h-12 rounded-2xl mb-2 overflow-hidden bg-slate-800 flex items-center justify-center relative">
                          {t.url ? <img src={t.url} alt={t.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-700" />}
                          {brush === t.id && <div className="absolute inset-0 bg-emerald-500/10 ring-2 ring-emerald-500/50 rounded-2xl" />}
                        </div>
                        <span className="text-[10px] font-black uppercase mb-1 text-center leading-tight h-5 overflow-hidden">{t.name}</span>
                      </button>
                    ))}
                </div>
              </section>
              <section className="p-4 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 mt-auto">
                <div className="flex items-center gap-2 mb-2 text-emerald-400">
                  {selectedZone?.id === 'chaos' ? <AlertTriangle size={12} /> : <Navigation size={12} />}
                  <h4 className="text-[10px] font-black uppercase">戰棋規則</h4>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed italic">{TERRAIN_TYPES[brush]?.effect}</p>
              </section>
              <button onClick={saveMapToCloud} className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95"><Save size={18} /> 儲存編輯</button>
            </div>
          )}
        </aside>

        <main className="flex-1 relative bg-[#010103] flex items-center justify-center overflow-hidden cursor-crosshair">
          <svg viewBox={view === 'world' ? "-1200 -1200 2400 2400" : "-600 -600 1200 1200"} className="w-full h-full max-w-[98vh] transition-all duration-1000 ease-in-out">
            <g>
              {(view === 'world' ? worldGrid : 
                getHexRegion(DEFAULT_CONFIG.SUBZONE_SIDE - 1).map(h => {
                  const pos = axialToPixel(h.q, h.r, DEFAULT_CONFIG.HEX_SIZE_EDITOR);
                  const key = `${selectedZone?.id}_${selectedSubZoneIdx}_${h.q},${h.r}`;
                  const terrainId = mapData[key];
                  return { 
                    ...h, ...pos, key, terrainId, 
                    type: 'subzone', // 修正點：明確加入 type 屬性
                    color: terrainId ? (TERRAIN_TYPES[terrainId]?.color || (selectedZone as ZoneInfo)?.color) : (selectedZone?.id === 'center' ? '#1a472a' : (selectedZone as ZoneInfo)?.color) 
                  } as HexData; // 使用類型斷言確保符合 renderHexNode 的要求
                }).sort((a,b) => a.y - b.y)
              ).map(hex => renderHexNode(hex, view === 'world' ? DEFAULT_CONFIG.HEX_SIZE_WORLD : DEFAULT_CONFIG.HEX_SIZE_EDITOR))}
            </g>
          </svg>
          <div className="absolute bottom-10 bg-slate-900/80 px-6 py-3 rounded-2xl border border-emerald-500/20 backdrop-blur-xl flex items-center gap-3 shadow-2xl">
             <Heart size={16} className="text-emerald-500 animate-pulse" />
             <span className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">
               {selectedZone?.id === 'center' ? '區域模式：唯一聖域 - 本心草原' : `編輯區塊：${selectedZone?.name} - 第 ${selectedSubZoneIdx} 號小區`}
             </span>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;