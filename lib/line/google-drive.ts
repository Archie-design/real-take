import { google } from 'googleapis';
import { Readable } from 'stream';

const FOLDER_ID = '1y8dqhIyJmUbu8JupnVKR4Rd5t3vJFgx1';

function getDriveClient() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    );
    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    });
    return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function uploadTestimonyCardToDrive(
    buffer: Buffer,
    filename: string
): Promise<void> {
    const drive = getDriveClient();

    await drive.files.create({
        requestBody: {
            name: filename,
            parents: [FOLDER_ID],
            mimeType: 'image/png',
        },
        media: {
            mimeType: 'image/png',
            body: Readable.from(buffer),
        },
    });
}
