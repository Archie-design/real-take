/**
 * 一次性執行腳本：取得 Google OAuth2 Refresh Token
 * 用法：node scripts/get-google-token.mjs
 *
 * 執行前需先在 .env.local 填入：
 *   GOOGLE_OAUTH_CLIENT_ID=...
 *   GOOGLE_OAUTH_CLIENT_SECRET=...
 */

import { createServer } from 'http';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:9876/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ 請先在 .env.local 填入 GOOGLE_OAUTH_CLIENT_ID 和 GOOGLE_OAUTH_CLIENT_SECRET');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log('\n✅ 請在瀏覽器開啟以下網址並登入你的 Google 帳號：\n');
console.log(authUrl);
console.log('\n授權完成後會自動顯示 Refresh Token...\n');

const server = createServer(async (req, res) => {
    if (!req.url?.startsWith('/callback')) return;

    const url = new URL(req.url, 'http://localhost:9876');
    const code = url.searchParams.get('code');

    if (!code) {
        res.end('❌ 未收到授權碼');
        return;
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        res.end('<h2>✅ 授權成功！請回到終端機查看 Refresh Token</h2>');

        console.log('========================================');
        console.log('✅ 成功取得 Refresh Token！');
        console.log('');
        console.log('請將以下三個值加入 Vercel 環境變數：');
        console.log('');
        console.log(`GOOGLE_OAUTH_CLIENT_ID=${CLIENT_ID}`);
        console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${CLIENT_SECRET}`);
        console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('========================================\n');
    } catch (err) {
        res.end('❌ 取得 Token 失敗：' + err.message);
        console.error(err);
    } finally {
        server.close();
    }
});

server.listen(9876, () => {
    console.log('等待 Google 授權回呼中（port 9876）...');
});
