---
description: How to deploy AlgoArena to AWS EC2 (all-in-one server)
---

# AlgoArena Deployment Guide — AWS EC2 (All-in-One)

Everything runs on a single EC2 instance: Backend, Frontend, PostgreSQL, Redis, Docker.

## Architecture

```
[Browser] → [Nginx :80/:443]
                ├── / → Next.js static build
                └── /api/* → Flask backend (:9000)
                        ├── PostgreSQL (:5432)
                        ├── Redis (:6379)
                        └── Docker (code execution)
```

---

## Step 1: Launch EC2 Instance

1. Go to **AWS Console** → **EC2** → **Launch Instance**
2. Settings:
   - **Name**: `algoarena-server`
   - **AMI**: Ubuntu Server 24.04 LTS (free tier eligible)
   - **Instance type**: `t2.small` (better for Docker, ~$0.023/hr with credits) or `t2.micro` (free tier)
   - **Key pair**: Create a new key pair → download the `.pem` file
   - **Security Group**: Allow these inbound rules:
     - SSH (port 22) — your IP only
     - HTTP (port 80) — anywhere
     - HTTPS (port 443) — anywhere
     - Custom TCP (port 9000) — anywhere (backend API, temporary)
   - **Storage**: 20 GB gp3
3. Click **Launch Instance**
4. Note the **Public IPv4 address** (e.g., `3.110.xxx.xxx`)

---

## Step 2: SSH into the Instance

```bash
# On your local machine (PowerShell/Terminal)
ssh -i "your-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## Step 3: Install Everything on the Server

// turbo-all

Run these commands on the EC2 instance:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3, pip, venv
sudo apt install -y python3 python3-pip python3-venv

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker

# Pull the sandbox image (for code execution)
docker pull python:3.11-slim
docker pull gcc:latest

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install Nginx
sudo apt install -y nginx
sudo systemctl enable nginx

# Install Node.js 20 (for building Next.js)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## Step 4: Set Up PostgreSQL

```bash
# Create database and user
sudo -u postgres psql -c "CREATE USER algoarena WITH PASSWORD 'your-secure-password-here';"
sudo -u postgres psql -c "CREATE DATABASE contest_db OWNER algoarena;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE contest_db TO algoarena;"
```

---

## Step 5: Clone & Set Up Backend

```bash
# Clone your repo (or SCP your files)
cd /home/ubuntu
git clone YOUR_REPO_URL algoarena
# OR: use scp to copy files from your machine

cd algoarena/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install flask flask-cors docker psycopg2-binary python-dotenv redis pyjwt flask-limiter werkzeug google-generativeai

# Create production .env
cat > .env << 'EOF'
DB_HOST=localhost
DB_NAME=contest_db
DB_USER=algoarena
DB_PASSWORD=your-secure-password-here
DB_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=CHANGE-THIS-TO-A-RANDOM-64-CHAR-STRING
ADMIN_USERS=23se02cs093@ppsu.ac.in
FRONTEND_HOST=YOUR_EC2_PUBLIC_IP
EOF
```

---

## Step 6: Build & Set Up Frontend

```bash
cd /home/ubuntu/algoarena/frontend-next

# Create production .env
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://YOUR_EC2_PUBLIC_IP
NEXT_PUBLIC_GEMINI_API_KEY=YOUR_GEMINI_KEY
EOF

# Install deps and build
npm install
npm run build
```

---

## Step 7: Create Systemd Service for Backend

```bash
sudo tee /etc/systemd/system/algoarena-backend.service > /dev/null << 'EOF'
[Unit]
Description=AlgoArena Flask Backend
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/algoarena/backend
Environment=PATH=/home/ubuntu/algoarena/backend/venv/bin:/usr/bin
ExecStart=/home/ubuntu/algoarena/backend/venv/bin/python server.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable algoarena-backend
sudo systemctl start algoarena-backend
```

---

## Step 8: Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/algoarena > /dev/null << 'EOF'
server {
    listen 80;
    server_name YOUR_EC2_PUBLIC_IP;

    # Frontend (Next.js static export)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 30s;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/algoarena /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 9: Start Frontend with PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start Next.js in production mode
cd /home/ubuntu/algoarena/frontend-next
pm2 start npm --name "algoarena-frontend" -- start
pm2 save
pm2 startup  # Follow the printed command to enable auto-start
```

---

## Step 10: Test

Open your browser and go to:

```
http://YOUR_EC2_PUBLIC_IP
```

---

## Quick Commands Reference

```bash
# Check backend status
sudo systemctl status algoarena-backend

# Check backend logs
sudo journalctl -u algoarena-backend -f

# Restart backend
sudo systemctl restart algoarena-backend

# Check frontend status
pm2 status

# Check frontend logs
pm2 logs algoarena-frontend

# Restart frontend
pm2 restart algoarena-frontend

# Check nginx status
sudo systemctl status nginx
```
