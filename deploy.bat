@echo off
echo Deploying to server...

echo [1/3] Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo [2/3] Uploading frontend (Compressed tar.gz)...
tar -czf build.tar.gz -C build .
scp build.tar.gz root@178.128.80.147:/var/www/html/
if exist build.tar.gz del build.tar.gz

echo [2.5/3] Extracting build on server...
ssh root@178.128.80.147 "cd /var/www/html && tar -xzf build.tar.gz && rm build.tar.gz && chown -R www-data:www-data /var/www/html && chmod -R 755 /var/www/html"

echo [3/3] Syncing backend code...
git add .
git commit -m "auto deploy"
git push
ssh root@178.128.80.147 "cd ~/gold && git pull"

echo Done! Deploy complete.
pause
