@echo off
setlocal
set SERVER=root@gold-server
set REMOTE_BACKEND=/root/gold/backend

echo Deploying to server (%SERVER%)...

echo [1/4] Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo [2/4] Uploading frontend...
tar -czf build.tar.gz -C build .
scp build.tar.gz %SERVER%:/var/www/html/
if %errorlevel% neq 0 goto :fail
if exist build.tar.gz del build.tar.gz
ssh %SERVER% "cd /var/www/html && tar -xzf build.tar.gz && rm build.tar.gz && chown -R www-data:www-data /var/www/html && chmod -R 755 /var/www/html"
if %errorlevel% neq 0 goto :fail

rem Backend: copy code files only. NEVER copy *.db (the server keeps the real customer data)
rem or the .env folder (server Python venv). uvicorn runs with --reload and picks up new code itself.
echo [3/4] Uploading backend code (no database)...
tar -czf backend_code.tar.gz -C backend --exclude=__pycache__ --exclude=*.pyc --exclude=*.db main.py models.py schemas.py database.py audit.py requirements.txt routers
scp backend_code.tar.gz %SERVER%:/tmp/
if %errorlevel% neq 0 goto :fail
if exist backend_code.tar.gz del backend_code.tar.gz
ssh %SERVER% "cd %REMOTE_BACKEND% && tar -xzf /tmp/backend_code.tar.gz && rm /tmp/backend_code.tar.gz && (systemctl is-active --quiet gold-backend && systemctl restart gold-backend; true) && sleep 4 && curl -s -o /dev/null -w 'backend check: HTTP %%{http_code} (expect 400)\n' 'http://127.0.0.1:8000/aml/list?entity=check'"
if %errorlevel% neq 0 goto :fail

echo [4/4] Saving code to GitHub...
git add -A
git commit -m "auto deploy"
git push

echo Done! Deploy complete.
pause
exit /b 0

:fail
echo Deploy FAILED - check the error above. Nothing on the server database was touched.
if exist build.tar.gz del build.tar.gz
if exist backend_code.tar.gz del backend_code.tar.gz
pause
exit /b 1
