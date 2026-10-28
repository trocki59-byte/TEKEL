// Uses the user's existing Git Credential Manager session; never saves credentials.
import { execFileSync } from 'node:child_process';
const owner = 'trocki59-byte', repo = 'TEKEL';
function git(args, options = {}) { return execFileSync('git', args, { encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' }, ...options }); }
try {
    const raw = git(['credential', 'fill'], { input: 'protocol=https\nhost=github.com\n\n', stdio: ['pipe', 'pipe', 'pipe'] });
    const credential = Object.fromEntries(raw.trim().split('\n').map(x => { const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1)]; }));
    const headers = { Authorization: 'Bearer ' + credential.password, 'User-Agent': 'Trocki-Studio-Setup', Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' };
    const userResponse = await fetch('https://api.github.com/user', { headers });
    const user = await userResponse.json();
    if (!userResponse.ok || user.login !== owner)
        throw new Error('GitHub hesabı bağlı hesap ile eşleşmiyor.');
    let response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (response.status === 404)
        response = await fetch('https://api.github.com/user/repos', { method: 'POST', headers, body: JSON.stringify({ name: repo, description: 'TEKEL — Türkçe bayi satış, stok, kasa ve veresiye yönetimi', private: true, auto_init: false }) });
    const result = await response.json();
    if (!response.ok)
        throw new Error(`GitHub depo işlemi başarısız (${response.status}): ${result.message}`);
    const remote = 'https://github.com/' + owner + '/' + repo + '.git';
    const existing = git(['remote']).trim().split(/\s+/);
    if (!existing.includes('github'))
        git(['remote', 'add', 'github', remote]);
    else if (git(['remote', 'get-url', 'github']).trim() !== remote)
        throw new Error('GitHub remote adresi farklı.');
    git(['push', 'github', 'HEAD:main'], { stdio: ['ignore', 'pipe', 'pipe'] });
    console.log(JSON.stringify({ url: result.html_url, private: result.private, pushed: true }));
}
catch (error) {
    console.error(error.message?.startsWith('Command failed') ? 'GitHub kimlik doğrulama veya gönderme işlemi başarısız.' : error.message);
    process.exitCode = 1;
}
