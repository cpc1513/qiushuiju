@echo off
chcp 65001 >nul
title 秋水居 · 一键修复后台
cd /d "%~dp0"

echo.
echo   正在修复：拉取最新代码 + 重启后台
echo   ======================================
echo.

:: 1. 关掉可能残留的旧后台进程
echo   [1/4] 关闭旧后台进程…
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3210" ^| findstr "LISTENING"') do (
  taskkill /PID %%a /F >nul 2>nul
)
taskkill /F /IM node.exe >nul 2>nul

:: 2. 拉取最新代码
echo   [2/4] 拉取最新代码…
git pull origin main
if errorlevel 1 (
  echo.
  echo   [提示] git pull 遇到问题，尝试强制同步到远程最新版
  echo   （你本地未保存的改动会被覆盖）
  git fetch origin main
  git reset --hard origin/main
)

:: 3. 重新构建
echo   [3/4] 重新构建站点…
node build.js

:: 4. 启动后台
echo   [4/4] 启动后台…
echo.
echo   ======================================
echo   修复完成！浏览器会自动打开后台
echo   如果页面还是旧的，请按 Ctrl+Shift+R 强制刷新
echo   ======================================
echo.

start "" /min cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3210"
node server.js

pause
