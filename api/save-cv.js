function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a == null || b == null) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => deepEqual(a[k], b[k]));
}

function stripUpdated(obj) {
  const clone = JSON.parse(JSON.stringify(obj));
  if (clone.meta) clone.meta.updated = null;
  return clone;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { password, content } = req.body || {};

  if (!process.env.ADMIN_PASSWORD) {
    res.status(500).json({ error: 'Server chưa cấu hình ADMIN_PASSWORD' });
    return;
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    // Slow down brute-force guessing. Serverless functions don't share memory
    // across instances, so a hard lockout counter isn't reliable here - an
    // artificial delay is the simple option that still works under scaling.
    await new Promise(r => setTimeout(r, 1500));
    res.status(401).json({ error: 'Sai mật khẩu' });
    return;
  }
  if (!process.env.GITHUB_TOKEN) {
    res.status(500).json({ error: 'Server chưa cấu hình GITHUB_TOKEN' });
    return;
  }
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    res.status(400).json({ error: 'Nội dung không hợp lệ (phải là JSON object)' });
    return;
  }

  const owner = process.env.GITHUB_OWNER || 'thanhleesenpai';
  const repo = process.env.GITHUB_REPO || 'cv';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const path = process.env.GITHUB_FILE_PATH || 'data.json';

  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const ghHeaders = {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'cv-admin-panel'
  };

  try {
    const getRes = await fetch(`${apiBase}?ref=${branch}`, { headers: ghHeaders });
    if (!getRes.ok) {
      const errBody = await getRes.text();
      throw new Error(`Không đọc được file hiện tại trên GitHub (${getRes.status}): ${errBody}`);
    }
    const fileData = await getRes.json();
    const sha = fileData.sha;

    let existingContent = null;
    try {
      existingContent = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
    } catch {
      existingContent = null;
    }

    if (existingContent && deepEqual(stripUpdated(content), stripUpdated(existingContent))) {
      res.status(200).json({ ok: true, unchanged: true });
      return;
    }

    content.meta = content.meta || {};
    content.meta.updated = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(new Date());

    const newContent = Buffer.from(JSON.stringify(content, null, 2) + '\n', 'utf-8').toString('base64');

    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Update CV content via admin panel',
        content: newContent,
        sha,
        branch
      })
    });

    if (!putRes.ok) {
      const errBody = await putRes.text();
      throw new Error(`Không commit được lên GitHub (${putRes.status}): ${errBody}`);
    }

    res.status(200).json({ ok: true, unchanged: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
