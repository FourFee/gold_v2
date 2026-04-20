@echo off
echo Downloading database backup from server...
scp root@178.128.80.147:~/gold/backend/gold_data.db backend/gold_data_%date:~-4,4%%date:~-7,2%%date:~0,2%.db
echo Done! Saved to backend/gold_data_%date:~-4,4%%date:~-7,2%%date:~0,2%.db
pause
