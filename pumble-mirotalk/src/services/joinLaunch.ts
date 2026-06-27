import type { Request, Response } from 'express';
import { takePendingJoin } from './pendingJoinStore';

const LAUNCH_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Joining MiroTalk…</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #1a1a1a; }
  </style>
</head>
<body>
  <p>Opening MiroTalk…</p>
  <p id="status"></p>
  <script>
    const room = new URLSearchParams(location.search).get('room');
    const status = document.getElementById('status');
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch('/pumble-join/pending?room=' + encodeURIComponent(room || ''));
        if (res.ok) {
          const data = await res.json();
          if (data.url) { location.replace(data.url); return; }
        }
      } catch (_) {}
      if (attempts >= 30) {
        clearInterval(timer);
        status.textContent = 'Could not open the call. Click Join call in Pumble again.';
      }
    }, 200);
  </script>
</body>
</html>`;

export function createJoinLaunchHandler() {
    return (_req: Request, res: Response): void => {
        res.type('html').send(LAUNCH_HTML);
    };
}

export function createJoinPendingHandler() {
    return (req: Request, res: Response): void => {
        const roomId = String(req.query.room || '');
        const joinUrl = takePendingJoin(roomId);

        if (!joinUrl) {
            res.status(404).json({ ok: false });
            return;
        }

        res.json({ ok: true, url: joinUrl });
    };
}
