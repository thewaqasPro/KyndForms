# Dokploy Production Launch Plan for KyndForm

> **Deployment Target:** Dokploy (Docker + Traefik Reverse Proxy)  
> **Repository Branch:** `next`  
> **Exposed Port:** `8000`  
> **Health Check Endpoint:** `/health/ready`

---

## 1. Dokploy Deployment Overview

KyndForm is packaged via a production multi-stage [`Dockerfile`](file:///Users/waqas/Development/2026/kyndForms/Dockerfile) that:
1. Builds all shared packages (`@kyndform/*`).
2. Compiles the frontend webapp into static production assets.
3. Compiles the NestJS backend server.
4. Mounts the compiled frontend assets directly into the server runner image.
5. Serves both the webapp dashboard and the GraphQL API on a single unified port: **`8000`**.

Traefik (Dokploy's built-in ingress reverse proxy) manages SSL termination (Let's Encrypt), HTTPS redirection, and forwards requests to container port `8000`.

---

## 2. Complete Environment Variables for Dokploy

Copy and paste these environment variables into **Dokploy > Your Application > Environment**:

```env
# ==============================================================================
# 1. CORE SYSTEM & REVERSE PROXY
# ==============================================================================
NODE_ENV=production
APP_LISTEN_PORT=8000
APP_LISTEN_HOSTNAME=0.0.0.0

# Set this to your actual production domain (https:// is mandatory)
APP_HOMEPAGE_URL=https://forms.yourdomain.com

# Dokploy uses Traefik as reverse proxy. TRUST_PROXY=true ensures real client IPs,
# rate limiting, and secure HTTPS session cookies function correctly.
TRUST_PROXY=true

# Allowed CORS origins for API requests and embed scripts
CORS_ALLOWED_ORIGINS=https://forms.yourdomain.com

# Cookie domain (leave empty to default to domain hostname, or set to your root domain)
COOKIE_DOMAIN=forms.yourdomain.com
COOKIE_MAX_AGE=1y

# Enable/disable Google fonts in the form renderer
ENABLE_GOOGLE_FONTS=true

# ==============================================================================
# 2. CRYPTOGRAPHIC SECURITY KEYS (CRITICAL: DO NOT USE DEFAULTS)
# ==============================================================================
# Generate 64-char random hex: openssl rand -hex 32
SESSION_KEY=GENERATE_RANDOM_32_BYTE_HEX_KEY
FORM_ENCRYPTION_KEY=GENERATE_RANDOM_32_BYTE_HEX_KEY
BCRYPT_SALT=10
SESSION_MAX_AGE=15d

# ==============================================================================
# 3. DATABASE (MONGODB)
# ==============================================================================
# Format: mongodb://<user>:<password>@<host>:<port>/<database>?authSource=admin
MONGO_URI=mongodb://mongo:<YOUR_MONGO_PASSWORD>@<YOUR_MONGO_HOST>:27017/heyform?authSource=admin&directConnection=true
MONGO_USER=mongo
MONGO_PASSWORD=<YOUR_MONGO_PASSWORD>

# ==============================================================================
# 4. BACKGROUND QUEUE & CACHE (REDIS)
# ==============================================================================
REDIS_HOST=<YOUR_REDIS_HOST>
REDIS_PORT=6379
REDIS_USERNAME=default
REDIS_PASSWORD=<YOUR_REDIS_PASSWORD>
REDIS_DB=2
BULL_JOB_ATTEMPTS=3
BULL_JOB_BACKOFF_DELAY=3000
BULL_JOB_BACKOFF_TYPE=fixed

# ==============================================================================
# 5. OBJECT STORAGE (S3 / MINIO FOR FILE & IMAGE UPLOADS)
# ==============================================================================
S3_ENDPOINT=https://s3.kyndstudio.com
S3_REGION=us-east-1
S3_BUCKET=forms-kyndstudio
S3_ACCESS_KEY_ID=<YOUR_S3_ACCESS_KEY>
S3_SECRET_ACCESS_KEY=<YOUR_S3_SECRET_KEY>
# If your S3 bucket uses a custom public CDN or direct URL:
# S3_PUBLIC_URL=https://s3.kyndstudio.com/forms-kyndstudio
S3_FORCE_PATH_STYLE=true
UPLOAD_FILE_SIZE=10485760
UPLOAD_FILE_TYPES=.jpg,.png,.bmp,.gif,.txt,.md,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.pdf,.mp4,.wmv,.zip,.rar,.7z

# ==============================================================================
# 6. TRANSACTIONAL EMAIL (SMTP)
# ==============================================================================
SMTP_FROM="KyndForm <hello@waqas.pro>"
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<YOUR_BREVO_USER>
SMTP_PASSWORD=<YOUR_BREVO_SMTP_KEY>

# User registration & verification
APP_DISABLE_REGISTRATION=false
VERIFY_USER_EMAIL=true
VERIFY_EMAIL_RESEND_COOLDOWN=60s
VERIFY_EMAIL_RESEND_DAILY_LIMIT=20
VERIFICATION_CODE_EXPIRE=10m
VERIFICATION_CODE_LIMIT=5

# ==============================================================================
# 7. SAFETY, ANTI-BOT & SSRF HARDENING
# ==============================================================================
# Google reCAPTCHA v2/v3 (protects public form submissions and auth against bots)
GOOGLE_RECAPTCHA_KEY=your_recaptcha_site_key
GOOGLE_RECAPTCHA_SECRET=your_recaptcha_secret_key

# Optional Akismet spam filter for text responses
AKISMET_KEY=

# Blocks webhook integrations from querying Dokploy/Docker private subnets (SSRF protection)
KYNDFORM_ALLOW_PRIVATE_OUTBOUND=false

# ==============================================================================
# 8. OPTIONAL 3RD-PARTY INTEGRATIONS (LEAVE BLANK IF NOT USED)
# ==============================================================================
# Google Social Login
GOOGLE_LOGIN_CLIENT_ID=
GOOGLE_LOGIN_CLIENT_SECRET=

# Apple Social Login
APPLE_LOGIN_TEAM_ID=
APPLE_LOGIN_WEB_CLIENT_ID=
APPLE_LOGIN_KEY_ID=
APPLE_LOGIN_PRIVATE_KEY_PATH=

# Stripe Billing / Subscriptions
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_CONNECT_CLIENT_ID=
STRIPE_WEBHOOK_SECRET_KEY=

# Unsplash Stock Images
UNSPLASH_CLIENT_ID=

# OpenAI Form Generator
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_GPT_MODEL=gpt-4o-mini
```

---

## 3. Safety & Production Readiness Checklist

Before clicking **Deploy** in Dokploy, complete these checks:

| # | Check | Action Required | Why It Matters |
| :- | :--- | :--- | :--- |
| **1** | **Generate Production Keys** | Run `openssl rand -hex 32` twice and paste values into `SESSION_KEY` and `FORM_ENCRYPTION_KEY`. | Default keys (`key1`, `key2`) allow attackers to forge session cookies or decrypt submissions. |
| **2** | **Reverse Proxy (`TRUST_PROXY`)** | Set `TRUST_PROXY=true`. | Dokploy uses Traefik. Without `TRUST_PROXY=true`, Express cannot read `X-Forwarded-For` or `X-Forwarded-Proto`, breaking secure cookies and IP rate limits. |
| **3** | **SSRF Hardening** | Keep `KYNDFORM_ALLOW_PRIVATE_OUTBOUND=false`. | Prevents malicious webhook recipients from querying Dokploy's internal docker network (`172.17.0.0/16`) or cloud metadata (`169.254.169.254`). |
| **4** | **Google reCAPTCHA** | Obtain keys from [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin) for your production domain. | Protects form submission endpoints and user sign-ups from automated bot spam. |
| **5** | **S3 / MinIO CORS & Bucket Policy** | In your S3 bucket (`forms-kyndstudio`), add CORS rule allowing `AllowedOrigins: ["https://yourdomain.com"]` and `AllowedMethods: ["GET", "PUT", "POST"]`. | Allows browsers to upload attachments and display images without browser cross-origin blocks. |
| **6** | **Brevo SMTP Sender Verification** | Confirm that `hello@waqas.pro` is verified in your Brevo account dashboard under *Senders & Domains*. | Unverified sender domains are blocked or routed to spam folders by email providers. |

---

## 4. Step-by-Step Dokploy Deployment Guide

### Step 1: Create Application in Dokploy
1. Log into your Dokploy dashboard.
2. Navigate to **Projects** > select or create your project.
3. Click **Create Service** > select **Application**.
4. Set name: `kyndform`.

### Step 2: Configure Source Code
1. In the **Source** tab:
   - **Provider:** GitHub (or Git).
   - **Repository:** `thewaqasPro/heyform` (or your repository).
   - **Branch:** `next`.
   - **Build Type:** `Dockerfile`.
   - **Dockerfile Path:** `./Dockerfile`.
   - **Context Path:** `/`.

### Step 3: Configure Ports & Domain
1. In the **Network / Domains** tab:
   - Click **Add Domain**.
   - Enter your domain (e.g. `forms.yourdomain.com`).
   - Enable **HTTPS** (Traefik will automatically issue a free Let's Encrypt certificate).
   - Container Port: **`8000`**.

### Step 4: Add Environment Variables
1. In the **Environment** tab:
   - Paste the environment block from **Section 2** above.
   - Replace `APP_HOMEPAGE_URL` and `CORS_ALLOWED_ORIGINS` with your actual domain.
   - Set your real database, S3, and SMTP credentials.
   - Generate your unique production `SESSION_KEY` and `FORM_ENCRYPTION_KEY`.
   - Click **Save**.

### Step 5: Configure Health Check
1. In the **Health Check** tab:
   - **Type:** HTTP.
   - **Path:** `/health/ready`.
   - **Port:** `8000`.
   - **Interval:** `20s`.
   - **Timeout:** `5s`.
   - **Retries:** `3`.
   *(Dokploy will wait until both MongoDB and Redis are connected before routing public traffic).*

### Step 6: Deploy & Verify
1. Click **Deploy**.
2. Watch the deployment logs in Dokploy.
3. Once running:
   - Open `https://forms.yourdomain.com/health/ready` -> Expected: `{"status":"ok","checks":{"mongo":"up","redis":"up"}}`.
   - Open `https://forms.yourdomain.com/login` -> Verify the KyndForm dashboard renders over HTTPS.
   - Test sign-up or login with your admin account.
