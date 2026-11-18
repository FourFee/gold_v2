#!/bin/bash
VENDOR="0x2ce3"
VENDOR_DEC=$(( VENDOR ))
PYTHON="/Users/nuttapard/Documents/idreadcard/venv/bin/python3.10"
SCRIPT="/Users/nuttapard/Documents/idreadcard/ifcard_reader.py"
LOG="/Users/nuttapard/Documents/idreadcard/idcard.log"
PID_FILE="/tmp/idreadcard.pid"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [usb_monitor] $*" >> "$LOG"; }

reader_connected() {
    ioreg -p IOUSB -w 0 2>/dev/null | grep -q "EMV Smartcard Reader"
}

start_reader() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        return
    fi
    log "เสียบเครื่องอ่านบัตรแล้ว — เริ่มระบบ"
    "$PYTHON" "$SCRIPT" >> "$LOG" 2>&1 &
    echo $! > "$PID_FILE"
}

stop_reader() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        kill "$PID" 2>/dev/null
        rm -f "$PID_FILE"
        log "ถอดเครื่องอ่านบัตรแล้ว — หยุดระบบ"
    fi
}

log "USB monitor เริ่มทำงาน"

while true; do
    if reader_connected; then
        start_reader
    else
        stop_reader
    fi
    sleep 3
done
