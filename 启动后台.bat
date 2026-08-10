@echo off
chcp 65001 >nul
cd /d %~dp0
start "秋水居 · 编辑后台" /min cmd /c "node server.js"
timeout /t 1 /nobreak >nul
start "" http://localhost:3210
