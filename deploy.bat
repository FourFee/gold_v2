@echo off
echo Deploying to server...

echo [1/3] Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo [2/3] Uploading frontend...
scp -r build/ root@178.128.80.147:/var/www/html/frontend/

echo [3/3] Uploading backend (excluding database)...
scp backend/*.py backend/routers/*.py backend/requirements.txt root@178.128.80.147:~/gold/backend/
scp -r backend/routers/ root@178.128.80.147:~/gold/backend/

echo Done! Deploy complete.
pause
