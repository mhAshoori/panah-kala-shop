# Deploying dev.panahkalashop.com — full step-by-step guide

**What we're building:** your shop running on a subdomain `dev.panahkalashop.com` on your new VPS, hidden from Google (noindex), database on the same VPS, HTTPS, auto-restart, nightly backups.

**Stack (boring = reliable):** Ubuntu 24.04 · Node 22 · PostgreSQL 16 · Nginx · Let's Encrypt (certbot) · systemd.

**How to read this guide**
- Every value **you must replace** is written like `⟨LIKE-THIS⟩`.
- Type the commands exactly; `sudo` lines run as admin, plain lines run as the app user we create.
- Each step says *why* in one line — understanding beats copy-paste.

**Prerequisites you have:** domain at a registrar (DNS panel access), VPS with a root password/SSH access, this repo on GitHub (`git@github.com:mhAshoori/panah-kala-shop.git`).

---

## 0. Push the latest code from your PC first

The VPS will clone from GitHub, so the repo must be current:

```bash
cd D:/xTEMP/projects/001-panah-kala-shop/panah-kala-shop
git push origin main
```

---

## 1. DNS — point the subdomain at your VPS

In your registrar's DNS panel (wherever you bought panahkalashop.com), add **one record**:

| Type | Name/Host | Value | TTL |
|---|---|---|---|
| A | `dev` | `⟨YOUR_VPS_IP⟩` | Auto/600 |

Replace `⟨YOUR_VPS_IP⟩` with the public IPv4 of your VPS (find it in the provider's dashboard — it looks like `185.xx.xx.xx`).

**Verify before moving on** (from your PC, after ~10 min):

```bash
nslookup dev.panahkalashop.com
```

✅ Must answer with your VPS IP. If it doesn't, stop — certbot (step 7) will fail.

---

## 2. First login + server hardening

Open a terminal on your PC and SSH in as root (your provider emailed the password or SSH key):

```bash
ssh root@⟨YOUR_VPS_IP⟩
```

### 2.1 Update + create a non-root user

```bash
apt update && apt upgrade -y
adduser --disabled-password --gecos "" panah
```

### 2.2 SSH keys only (the #1 security win)

**On your PC** (Git Bash — you already have git so you have ssh):

```bash
ssh-keygen -t ed25519 -C "vps-panah"          # press Enter 3× (default location)
cat ~/.ssh/id_ed25519.pub                      # copies in next step
```

Then put that key on the server (from your PC — this is the one command that prompts for root's password):

```bash
ssh-copy-id root@⟨YOUR_VPS_IP⟩
```

Test key login works **before** locking passwords out:

```bash
ssh root@⟨YOUR_VPS_IP⟩        # should get in WITHOUT a password prompt
```

Back on the server, disable password logins:

```bash
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl restart ssh
```

> ⚠️ **Never close this SSH window until you've tested a new one can log in.** If you lock yourself out, the provider's recovery console is the only way back.

### 2.3 Firewall + brute-force protection

```bash
apt install -y ufw fail2ban
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose          # expect: 22, 80, 443 allowed, everything else denied
systemctl enable --now fail2ban
```

That's the whole perimeter: nobody reaches the DB or Node directly — only Nginx on 80/443.

---

## 3. Install Node 22 + base tooling

Still as root on the server:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git nginx postgresql postgresql-contrib certbot python3-certbot-nginx
node -v    # expect v22.x
```

### 3.1 Swap file (required on ≤2 GB VPS — `next build` eats RAM)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h    # confirm Swap: 2.0Gi
```

---

## 4. PostgreSQL — the database, on this VPS

### 4.1 Create a strong password FIRST (run once, copy the output)

```bash
openssl rand -base64 24
```

Copy it — from here on it's `⟨DB_PASSWORD⟩` (do NOT use the example below).

### 4.2 Create user + database

```bash
sudo -u postgres psql <<'SQL'
CREATE USER panah_app WITH PASSWORD '⟨DB_PASSWORD⟩';
CREATE DATABASE panah_kala OWNER panah_app;
SQL
```

### 4.3 Verify it's localhost-only + login works

```bash
ss -lntp | grep 5432        # must show 127.0.0.1:5432 — NOT 0.0.0.0
PGPASSWORD='⟨DB_PASSWORD⟩' psql -h 127.0.0.1 -U panah_app -d panah_kala -c 'select 1;'
```

✅ `1` printed = database ready. The DB is unreachable from the internet by design.

---

## 5. Deploy the app

### 5.1 Clone as the app user

```bash
su - panah
git clone git@github.com:mhAshoori/panah-kala-shop.git app
cd app/panah-kala-shop
```

> If the repo is private, GitHub needs the server's key: `cat ~/.ssh/id_ed25519.pub` as `panah`, then GitHub.com → Settings → SSH keys → **Add deploy key** (read-only is enough) → paste.

### 5.2 Create the production `.env`

```bash
openssl rand -base64 32        # run once → this is ⟨AUTH_SECRET⟩
cat > .env <<'EOF'
DATABASE_URL="postgresql://panah_app:⟨DB_PASSWORD⟩@localhost:5432/panah_kala?schema=public"
NEXTAUTH_SECRET="⟨AUTH_SECRET⟩"
NEXTAUTH_URL="https://dev.panahkalashop.com"
AUTH_TRUST_HOST="true"
NEXT_PUBLIC_SITE_URL="https://dev.panahkalashop.com"
ZARINPAL_MERCHANT_ID="⟨ZARINPAL_SANDBOX_MERCHANT⟩"
ZARINPAL_SANDBOX="true"
SMSIR_API_KEY="⟨SMSIR_API_KEY⟩"
SMSIR_OTP_TEMPLATE_ID="⟨SMSIR_TEMPLATE_ID⟩"
SMTP_HOST=""
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM=""
CONTACT_EMAIL="support@panahkala.ir"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
AI_API_KEY=""
ARVAN_ACCESS_KEY="⟨ARVAN_ACCESS_KEY⟩"
ARVAN_SECRET_KEY="⟨ARVAN_SECRET_KEY⟩"
ARVAN_BUCKET="panah-kala-shop-bucket"
ARVAN_REGION="ir-tbz-sh1"
ARVAN_PUBLIC_BASE_URL="https://panah-kala-shop-bucket.s3.ir-tbz-sh1.arvanstorage.ir"
EOF
chmod 600 .env
```

Replace every `⟨…⟩` — most are copy-paste from your local `.env` (SMS.ir, Arvan, ZarinPal sandbox merchant). Leave SMTP empty for now (emails log to the server console instead — fine for preload).

### 5.3 Build

```bash
npm ci
npx prisma migrate deploy
npm run build
```

~2-5 minutes. This is the production build (`next build`), same as your local gate.

### 5.4 Load the catalog (seed) — runs once

```bash
npm run db:seed
```

### 5.5 Smoke test by hand

```bash
PORT=3000 HOSTNAME=127.0.0.1 npm start &
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000    # expect 200
kill %1
```

---

## 6. systemd — auto-start, auto-restart, logs

`exit` back to root, then:

```bash
cat > /etc/systemd/system/panah.service <<'EOF'
[Unit]
Description=Panah Kala (Next.js)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
User=panah
WorkingDirectory=/home/panah/app/panah-kala-shop
EnvironmentFile=/home/panah/app/panah-kala-shop/.env
ExecStart=/usr/bin/npm start
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now panah
systemctl status panah          # expect "active (running)"
journalctl -u panah -f          # live logs — Ctrl+C to exit
```

If the VPS has 2+ GB RAM you can also use the standalone build for lower memory (`output: "standalone"` is already in the config) — but `npm start` is the safe default; switch only when comfortable.

---

## 7. Nginx + HTTPS

### 7.1 Reverse proxy

```bash
cat > /etc/nginx/sites-available/panah <<'EOF'
server {
    listen 80;
    server_name dev.panahkalashop.com;

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
        proxy_read_timeout 120s;
        proxy_buffering off;
    }
}
EOF

ln -sf /etc/nginx/sites-available/panah /etc/nginx/sites-enabled/panah
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 7.2 HTTPS certificate (free, auto-renews)

```bash
certbot --nginx -d dev.panahkalashop.com
# When asked choose option 2 = Redirect (force HTTPS)
```

Needs the DNS record from step 1 to be live. Test renewal:

```bash
certbot renew --dry-run
```

🎉 **Open https://dev.panahkalashop.com in a browser — your shop is live.**

---

## 8. SEO lockdown — Google must NOT see this preload

Your app already has the full chain built in; turn it on:

1. Sign in as admin (`admin@example.com` / `123456` — **change this password now**: Admin → Users → edit).
2. Admin → **Homepage** → SEO section → enable **"حالت تعمیرات: خروج از نتایج گوگل (noindex)"**.
3. Save.

What this flips (all already implemented, no code changes):
- `<meta name="robots" content="noindex, nofollow">` on every page
- `robots.txt` → `User-agent: * / Disallow: /`
- Sitemap returns empty

**Belt-and-suspenders extra** (blocks any crawler that ignores meta/robots, e.g. rogue scrapers building SEO profiles for your content before launch):

```bash
cat > /etc/nginx/snippets/block-crawlers <<'EOF'
map $http_user_agent $bad_bot {
    default 0;
    ~*googlebot 1;
    ~*bingbot 1;
    ~*yandex 1;
    ~*ahrefsbot 1;
    ~*semrushbot 1;
}
EOF
```

Then add these two lines **inside the `server { }` block** of `/etc/nginx/sites-available/panah` (after `client_max_body_size`):

```nginx
    include /etc/nginx/snippets/block-crawlers;
    if ($bad_bot) { return 403; }
```

```bash
nginx -t && systemctl reload nginx
```

**Verify the lock:** open https://dev.panahkalashop.com/robots.txt — must say `Disallow: /`. View page source — `<meta name="robots" content="noindex, nofollow">` present. At real launch, flip the admin toggle off + remove the Nginx snippet lines (or keep them — they only match known bot user-agents and real users never see them).

---

## 9. Day-2 operations

### Deploy a new version

```bash
su - panah
cd app/panah-kala-shop
git pull
npm ci
npx prisma migrate deploy
npm run build
exit
systemctl restart panah
```

### Backups (nightly, keep 7 days) — as root

```bash
cat > /etc/cron.daily/panah-backup <<'EOF'
#!/bin/sh
sudo -u postgres pg_dump panah_kala | gzip > /var/backups/panah-$(date +\%F).sql.gz
find /var/backups -name 'panah-*.sql.gz' -mtime +7 -delete
EOF
chmod +x /etc/cron.daily/panah-backup
# test one backup now:
/etc/cron.daily/panah-backup && ls -lh /var/backups/panah-*.sql.gz
```

### Quick health check

```bash
systemctl is-active panah
systemctl is-active postgresql nginx
curl -s -o /dev/null -w '%{http_code}\n' https://dev.panahkalashop.com    # 200
journalctl -u panah -n 50 --no-pager
```

---

## 10. Troubleshooting map

| Symptom | Where to look | Usual fix |
|---|---|---|
| 502 Bad Gateway | `systemctl status panah`, `journalctl -u panah -n 50` | app crashed → check error above; `systemctl restart panah` |
| Blank page / 500 | `journalctl -u panah -n 100` | DB env wrong → re-check `.env` `DATABASE_URL` |
| certbot fails | `dig +short dev.panahkalashop.com` | DNS not propagated yet — wait, retry |
| Can't SSH anymore | provider web console | you closed session before key test (step 2.2 warning) |
| OTP never arrives | `journalctl -u panah \| grep SMS` | status 6=no credit, 7=IP not allowed (add VPS IP in SMS.ir panel), 113=template missing |
| Build killed mid-way | `free -h` | no swap → step 3.1 |
| Images don't load | bucket URL in `.env`, `curl -I <image-url>` | Arvan `ARVAN_*` values wrong |

---

## 11. When the preload looks good → final production

1. Point the **apex** `panahkalashop.com` A record at the VPS, add a second `certbot -d panahkalashop.com -d www.panahkalashop.com` (or duplicate the Nginx server block).
2. Flip **noindex OFF** in the admin panel.
3. Remove the Nginx block-crawler snippet (optional).
4. Swap `ZARINPAL_SANDBOX="false"` + real merchant id.
5. Get the SMS.ir **production** key + approved OTP template (they need the live site — you'll have it).
6. Consider a fresh DB: drop `panah_kala`, recreate, `npx prisma migrate deploy` (+ `npm run db:seed` only if you want the demo catalog; real store = seed nothing, add products via admin).
7. Change `NEXTAUTH_URL`/`NEXT_PUBLIC_SITE_URL` to the apex domain, restart.
