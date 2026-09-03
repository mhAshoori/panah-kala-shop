# Production deployment — VPS (Ubuntu) step by step

Stack (deliberately boring and standard): **Ubuntu 24.04 LTS + Node 22 + PostgreSQL 16 (apt) + Nginx + Let's Encrypt + systemd**. No Docker, no CI — fewer moving parts, everything debuggable by hand.

App and database run on the same VPS. The DB listens on localhost only — it is never reachable from the internet.

Replace `your-domain.ir` with your real domain and `1.2.3.4` with your VPS IP throughout.

---

## 0. DNS (do first — propagation takes time)

At your domain registrar, create one A record:

```
your-domain.ir        A     1.2.3.4
www.your-domain.ir    A     1.2.3.4
```

Verify before continuing: `dig +short your-domain.ir` must return `1.2.3.4`.

---

## 1. Server hardening (as root)

```bash
apt update && apt upgrade -y

# Firewall: SSH, HTTP, HTTPS only
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status

# SSH keys only (make sure you can log in with a key BEFORE this step!)
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl restart ssh

# Optional but recommended: brute-force protection
apt install -y fail2ban
systemctl enable --now fail2ban
```

Create a non-root app user:

```bash
adduser --disabled-password --gecos "" panah
```

---

## 2. Node.js 22 LTS + base tooling

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git nginx postgresql postgresql-contrib certbot python3-certbot-nginx
node -v   # v22.x
```

**Create swap (required if the VPS has ≤ 2 GB RAM — `next build` needs it):**

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 3. PostgreSQL (on this VPS, localhost only)

```bash
# Generate a real password first — DO NOT reuse this example:
openssl rand -base64 24
sudo -u postgres psql <<'SQL'
CREATE USER panah_app WITH PASSWORD 'PASTE_STRONG_PASSWORD_HERE';
CREATE DATABASE panah_kala OWNER panah_app;
SQL
```

Confirm it listens on localhost only (default on Ubuntu — verify anyway):

```bash
ss -lntp | grep 5432      # must show 127.0.0.1:5432, NOT 0.0.0.0
```

Test the connection:

```bash
PGPASSWORD='PASTE_STRONG_PASSWORD_HERE' psql -h 127.0.0.1 -U panah_app -d panah_kala -c 'select 1;'
```

---

## 4. Deploy the app

```bash
su - panah
git clone <YOUR_REPO_URL> app        # private repo → use a deploy key
cd app/panah-kala-shop
```

Create `.env` (never commit this file; it lives only on the server):

```bash
cat > .env <<'EOF'
DATABASE_URL="postgresql://panah_app:PASTE_STRONG_PASSWORD_HERE@localhost:5432/panah_kala?schema=public"
NEXTAUTH_SECRET="PASTE_OUTPUT_OF_openssl_rand_base64_32"
NEXTAUTH_URL="https://your-domain.ir"
AUTH_TRUST_HOST="true"
NEXT_PUBLIC_SITE_URL="https://your-domain.ir"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
AI_API_KEY=""
ZARINPAL_MERCHANT_ID="sandbox-id-or-real-merchant"
ZARINPAL_SANDBOX="true"
ARVAN_ACCESS_KEY=""
ARVAN_SECRET_KEY=""
ARVAN_BUCKET=""
ARVAN_REGION="ir-thr-at1"
ARVAN_PUBLIC_BASE_URL=""
SMSIR_API_KEY=""
SMSIR_LINE_NUMBER=""
SMSIR_OTP_TEMPLATE_ID=""
SMTP_HOST=""
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM=""
CONTACT_EMAIL="support@panahkala.ir"
EOF
chmod 600 .env
```

Build (`.env` must exist before `npm run build` — `NEXT_PUBLIC_*` values are baked in):

```bash
npm ci
npx prisma migrate deploy
npm run build
```

Copy static assets into the standalone bundle:

```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

Optional — load sample data so the pre-launch site isn't empty (run ONCE, only while in noindex phase):

```bash
npm run db:seed
```

Smoke-test manually before wiring systemd:

```bash
cd .next/standalone
PORT=3000 HOSTNAME=127.0.0.1 node server.js
# curl http://127.0.0.1:3000 — expect HTML, then Ctrl+C
```

---

## 5. systemd service (auto-start, auto-restart, logs)

Exit back to root (`exit`), then:

```bash
cat > /etc/systemd/system/panah.service <<'EOF'
[Unit]
Description=Panah Kala (Next.js standalone)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
User=panah
WorkingDirectory=/home/panah/app/panah-kala-shop/.next/standalone
EnvironmentFile=/home/panah/app/panah-kala-shop/.env
ExecStart=/usr/bin/node server.js
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
Environment=NODE_ENV=production
Restart=always
RestartSec=5

# Conservative hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now panah
systemctl status panah        # active (running)
journalctl -u panah -f        # live logs (Ctrl+C to exit)
```

---

## 6. Nginx reverse proxy

```bash
cat > /etc/nginx/sites-available/panah <<'EOF'
# HTTP → the app; certbot will upgrade this file to HTTPS automatically
server {
    listen 80;
    server_name your-domain.ir www.your-domain.ir;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;   # AI assistant SSE streams
        proxy_buffering off;       # SSE must not be buffered
    }
}
EOF

ln -s /etc/nginx/sites-available/panah /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

---

## 7. HTTPS (Let's Encrypt)

```bash
certbot --nginx -d your-domain.ir -d www.your-domain.ir
# Choose "redirect" (2) when asked — force all HTTP to HTTPS
```

Auto-renewal is installed by default; verify with:

```bash
certbot renew --dry-run
```

Open `https://your-domain.ir` — the site must be live.

---

## 8. Going live checklist

| Item | Pre-launch (now) | Launch |
|---|---|---|
| Google indexing | Admin → Homepage → SEO → **fNoindex = ON** (robots `Disallow: /`, empty sitemap, noindex meta — already wired) | Turn OFF |
| Sample data | Seeded (fake products) is fine | Reset DB before real launch: drop + recreate the DB, `npx prisma migrate deploy` (do NOT re-seed) |
| ZarinPal | `ZARINPAL_SANDBOX=true` | Real merchant id + `ZARINPAL_SANDBOX=false` |
| SMS.ir | `SMSIR_API_KEY` + `SMSIR_LINE_NUMBER` (raw text OTP works without template approval) | Add `SMSIR_OTP_TEMPLATE_ID` once SMS.ir approves the template |
| Admin password | Seeded `admin@example.com / 123456` — **change immediately** | — |
| Dev codes | With `SMSIR_API_KEY` set, the `123456`/`456789` master codes are **disabled automatically** | — |

**Change the admin password right after first login** (Admin → users, or profile).

---

## 9. SMS.ir setup (do this once the site is reachable — they check it)

1. Log in at https://app.sms.ir → **Developer / وب سرویس** → create an **API key** → put it in `.env` as `SMSIR_API_KEY`, then `systemctl restart panah`.
2. Send-path priority in the app:
   - `SMSIR_OTP_TEMPLATE_ID` set → templated OTP (`/v1/send/verify`) — requires SMS.ir to approve the template.
   - else `SMSIR_LINE_NUMBER` set → plain-text OTP via `/v1/send/bulk` (`کد تایید پناه کالا: 123456`) — **no template approval needed, works today**.
   - else → dev fallback (console log, code 123456). Never happens once the key is set.
3. Copy a **line number** from the panel (Send page → sender lines, e.g. `+983000505`) into `SMSIR_LINE_NUMBER`.
4. Test: sign in with phone → you must receive the code by SMS.
5. Later, request an OTP template containing `{CODE}`; when approved add `SMSIR_OTP_TEMPLATE_ID` and restart — the app switches to the template path automatically and falls back to bulk if the template send ever fails.

---

## 10. Updates (every deploy)

```bash
su - panah
cd app/panah-kala-shop
git pull
npm ci
npx prisma migrate deploy
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
exit
systemctl restart panah
```

---

## 11. Backups + monitoring (minimum viable)

Nightly DB dump (keep 7 days) — as root:

```bash
cat > /etc/cron.daily/panah-backup <<'EOF'
#!/bin/sh
sudo -u postgres pg_dump panah_kala | gzip > /var/backups/panah-$(date +\%F).sql.gz
find /var/backups -name 'panah-*.sql.gz' -mtime +7 -delete
EOF
chmod +x /etc/cron.daily/panah-backup
```

Quick health check:

```bash
systemctl is-active panah
journalctl -u panah -n 100 --no-pager
curl -s -o /dev/null -w '%{http_code}' https://your-domain.ir   # 200
```

---

## Troubleshooting

| Symptom | Check |
|---|---|
| 502 from Nginx | `systemctl status panah` — app down? `journalctl -u panah -n 50` |
| DB connection refused | PostgreSQL running? `systemctl status postgresql`; correct password in `.env`? |
| OTP not arriving | `journalctl -u panah | grep SMS` — status code tells you why (6 = no credit, 113 = template missing, 7 = IP not allowed — add your VPS IP in the SMS.ir panel) |
| Build OOM / killed | Swap missing — see step 2 |
| `uselibpqcompat` warning in logs | Harmless with local Postgres; only Neon URLs get the flag appended |
