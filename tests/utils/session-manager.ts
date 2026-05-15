import fs from 'fs';
import path from 'path';

export const SESSION_FILE = path.join(process.cwd(), 'test-results/e2e-session.json');

export function saveSession(data: any) {
  if (!fs.existsSync(path.dirname(SESSION_FILE))) {
    fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
  }
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
}

export function loadSession() {
  if (!fs.existsSync(SESSION_FILE)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
}
