/**
 * 解析方圓小組名單 CSV，輸出系統可匯入格式
 *
 * 來源格式：多欄並排，每 8 行一個區塊（1 行大隊長 + 7 行隊員）
 * 輸出格式：phone,name,birthday,squad_name,team_name,is_captain,is_commandant
 *
 * 用法：npx ts-node scripts/parse-fangyuan-roster.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const SOURCE_CSV = path.join(
    ROOT,
    'reference/【方圓】 20260503  \u300e大方圓體系限定\u300f親證班第一堂 - 這不是電影 （為期兩個月） - 小組名單-方圓.csv'
);
const OUTPUT_CSV = path.join(ROOT, 'reference/fangyuan_roster_import.csv');

/** 從 "方圓X-Y" 取出小隊名稱 "方圓X" */
function getTeamName(label: string): string {
    const match = label.match(/方圓(\d+)/);
    return match ? `方圓${match[1]}` : '';
}

function main() {
    if (!fs.existsSync(SOURCE_CSV)) {
        console.error('找不到來源 CSV：', SOURCE_CSV);
        process.exit(1);
    }

    const content = fs.readFileSync(SOURCE_CSV, 'utf-8');
    const lines = content.split('\n').map(line => line.split(',').map(c => c.trim()));

    const outputRows: string[][] = [
        ['phone', 'name', 'birthday', 'squad_name', 'team_name', 'is_captain', 'is_commandant']
    ];

    // 前 3 行為空白與標題，從第 4 行（index 3）開始處理
    let lineIdx = 3;
    let battalionNum = 1;

    while (lineIdx < lines.length) {
        const headerLine = lines[lineIdx];

        // 找大隊長標頭行
        if (!headerLine[0]?.includes('大隊長')) {
            lineIdx++;
            continue;
        }

        const leftCommandant = headerLine[1] || '';   // e.g. "1314_林彥達"
        const rightCommandant = headerLine[10] || '';  // e.g. "108_張彥榮"（最後一個區塊可能為空）

        const leftBattalion = `方圓大隊${battalionNum}`;
        const rightBattalion = `方圓大隊${battalionNum + 1}`;

        // 從第一行隊員資料取得各大隊的第一小隊名稱
        const firstMemberRow = lines[lineIdx + 1] || [];
        const leftFirstSquad = getTeamName(firstMemberRow[0] || '');   // 左側第一小隊
        const rightFirstSquad = getTeamName(firstMemberRow[9] || '');  // 右側第一小隊

        // 大隊長歸入其所管第一小隊，is_commandant=true，is_captain=false
        if (leftCommandant) {
            outputRows.push(['', leftCommandant, '', leftBattalion, leftFirstSquad, 'false', 'true']);
        }
        if (rightCommandant) {
            outputRows.push(['', rightCommandant, '', rightBattalion, rightFirstSquad, 'false', 'true']);
        }

        // 處理 7 行隊員資料
        for (let rowOffset = 1; rowOffset <= 7; rowOffset++) {
            const memberRow = lines[lineIdx + rowOffset] || [];

            for (let squadIdx = 0; squadIdx < 6; squadIdx++) {
                const colBase = squadIdx * 3;
                const squadLabel = memberRow[colBase] || '';      // e.g. "方圓1-2"
                const posCode = memberRow[colBase + 1] || '';     // e.g. "1-2"
                const memberIdName = memberRow[colBase + 2] || ''; // e.g. "7250_鄭淑姗"

                if (!memberIdName) continue;

                const teamName = getTeamName(squadLabel);
                const battalion = squadIdx < 3 ? leftBattalion : rightBattalion;

                // 位置碼尾數為 1 者是小隊長
                const slotMatch = posCode.match(/-(\d+)$/);
                const slot = slotMatch ? parseInt(slotMatch[1], 10) : 0;
                const isCaptain = slot === 1 ? 'true' : 'false';

                outputRows.push(['', memberIdName, '', battalion, teamName, isCaptain, 'false']);
            }
        }

        lineIdx += 8;
        battalionNum += 2;
    }

    // 加上 UTF-8 BOM，確保 Excel / Numbers 等軟體正確顯示中文
    const BOM = '\ufeff';
    const csvContent = BOM + outputRows.map(row => row.join(',')).join('\n');
    fs.writeFileSync(OUTPUT_CSV, csvContent, 'utf-8');

    console.log(`✓ 成功解析 ${outputRows.length - 1} 筆成員資料`);
    console.log(`✓ 輸出檔案：${OUTPUT_CSV}`);
    console.log('');
    console.log('下一步：請在 phone 欄位填入各成員手機號碼後，再透過管理介面匯入。');
}

main();
