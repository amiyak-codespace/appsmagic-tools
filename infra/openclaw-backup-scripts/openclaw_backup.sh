#!/bin/bash
set -e

echo "Starting OpenClaw Brain Backup at $(date)"

BACKUP_DIR="/tmp/openclaw_backup"
BUCKET="s3://appsmagic-picoclaw-backup-20260312"
DATE=$(date +%Y%m%d_%H%M%S)
ARCHIVE="openclaw-brain-${DATE}.tar.gz"

mkdir -p $BACKUP_DIR
cd $BACKUP_DIR

cat << 'EXCLUDE' > excludes.txt
*/node_modules/*
*/.cache/*
*/.npm/*
*/logs/*
*.sock
*.log
EXCLUDE

echo "Compressing brain, mounts, and ssh keys..."
tar -czf $ARCHIVE \
  --exclude-from=excludes.txt \
  /home/ubuntu/.openclaw \
  /home/ubuntu/openclaw-mounts \
  /home/ubuntu/Ws/ssh \
  2>/dev/null || true

echo "Uploading $ARCHIVE to S3..."
/usr/local/bin/aws s3 cp $ARCHIVE $BUCKET/backups/daily/$ARCHIVE
/usr/local/bin/aws s3 cp $ARCHIVE $BUCKET/openclaw-brain-latest.tar.gz

echo "Uploading respawn script to S3..."
/usr/local/bin/aws s3 sync /home/ubuntu/openclaw-backup-scripts/ $BUCKET/scripts/

# Cleanup old backups (keep last 7 days)
# We can use S3 Lifecycle Rules, but let's do a simple aws s3 rm for files older than 7 days
# (For safety, we will rely on S3 Lifecycle Rules for deletion if configured, but keeping the backup size small makes it trivial).

echo "Cleaning up local files..."
rm -f $ARCHIVE excludes.txt

echo "OpenClaw Backup Completed Successfully!"
