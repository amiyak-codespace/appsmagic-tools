#!/bin/bash
echo "Starting Spot Interruption Watcher..."
while true; do
  TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" -s 2>/dev/null)
  if [ -n "$TOKEN" ]; then
    HTTP_CODE=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s -o /dev/null -w "%{http_code}" http://169.254.169.254/latest/meta-data/spot/instance-action)
    if [ "$HTTP_CODE" == "200" ]; then
      echo "$(date): ⚠️ SPOT INTERRUPTION NOTICE RECEIVED! Triggering emergency backup..." >> /tmp/spot-watcher.log
      /home/ubuntu/openclaw-backup-scripts/openclaw_backup.sh >> /tmp/spot-watcher.log 2>&1
      echo "$(date): Emergency backup complete." >> /tmp/spot-watcher.log
      exit 0
    fi
  fi
  sleep 5
done
