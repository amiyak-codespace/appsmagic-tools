#!/bin/bash
set -e

# ==============================================================
# OpenClaw Automated Respawn Script
# To run on a fresh EC2:
# aws s3 cp s3://appsmagic-picoclaw-backup-20260312/openclaw_respawn.sh .
# chmod +x openclaw_respawn.sh && ./openclaw_respawn.sh
# ==============================================================

echo "Starting OpenClaw Respawn Sequence..."

# 1. System Dependencies
echo "Installing Dependencies..."
sudo apt-get update
sudo apt-get install -y curl wget git jq zip unzip

# Install Node.js 22 (LTS)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g npm@latest

# Install AWS CLI if missing
if ! command -v aws &> /dev/null
then
    curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip -q awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
fi

# 2. Download Brain from S3
echo "Downloading OpenClaw Brain Backup from S3..."
BUCKET="s3://appsmagic-picoclaw-backup-20260312"
aws s3 cp $BUCKET/openclaw-brain-latest.tar.gz /tmp/openclaw-brain.tar.gz

# 3. Extract Brain
echo "Extracting Brain..."
cd /
sudo tar -xzf /tmp/openclaw-brain.tar.gz
sudo chown -R ubuntu:ubuntu /home/ubuntu/.openclaw /home/ubuntu/openclaw-mounts /home/ubuntu/Ws

# Restore exact permissions for SSH keys
chmod 700 /home/ubuntu/Ws/ssh
chmod 600 /home/ubuntu/Ws/ssh/*.pem 2>/dev/null || true

# 4. Install OpenClaw
echo "Installing OpenClaw Globally..."
export NPM_CONFIG_PREFIX=~/.npm-global
mkdir -p ~/.npm-global
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

npm install -g openclaw@latest

# 5. Restore Node Modules in the Mount
echo "Rebuilding OpenClaw dependencies..."
cd /home/ubuntu/openclaw-mounts/openclaw_home
npm install

# 6. Start the Gateway
echo "Starting OpenClaw Gateway..."
~/.npm-global/bin/openclaw gateway start

echo "=========================================================="
echo "Respawn Complete! OpenClaw is now ALIVE and running."
echo "=========================================================="

# 7. Setup Spot Watcher
echo "Setting up Spot Watcher Service..."
aws s3 sync $BUCKET/scripts/ /home/ubuntu/openclaw-backup-scripts/
chmod +x /home/ubuntu/openclaw-backup-scripts/*.sh

cat << 'SERVICE' | sudo tee /etc/systemd/system/spot-watcher.service
[Unit]
Description=AWS Spot Instance Interruption Watcher
After=network.target

[Service]
ExecStart=/home/ubuntu/openclaw-backup-scripts/spot_interruption_handler.sh
Restart=always
User=ubuntu
Group=ubuntu
Environment=PATH=/usr/bin:/usr/local/bin:/bin
WorkingDirectory=/home/ubuntu/openclaw-backup-scripts

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable spot-watcher.service
sudo systemctl start spot-watcher.service

echo "Spot Watcher configured!"
