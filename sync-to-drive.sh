#!/usr/bin/env bash
# Watch book.pdf for changes and sync to Google Drive
set -euo pipefail

BOOK_DIR="/home/nano-pi/projects/cocktail-book"
PDF_FILE="book.pdf"
REMOTE="gdrive:cocktail-book/"
DEBOUNCE=3
LAST_SYNC=0

cd "$BOOK_DIR"
echo "Watching $PDF_FILE for changes, syncing to $REMOTE"

inotifywait -m -e close_write,moved_to --format '%f' "$BOOK_DIR" |
while read -r changed; do
    [[ "$changed" == "$PDF_FILE" ]] || continue
    NOW=$(date +%s)
    (( NOW - LAST_SYNC < DEBOUNCE )) && continue
    LAST_SYNC=$NOW
    echo "[$(date '+%H:%M:%S')] Syncing to Drive..."
    rclone copy "$BOOK_DIR/$PDF_FILE" "$REMOTE" --checksum -v 2>&1 \
        && echo "[$(date '+%H:%M:%S')] Done." \
        || echo "[$(date '+%H:%M:%S')] FAILED" >&2
done
