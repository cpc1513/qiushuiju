@echo off
chcp 65001 >nul
title 秋水居 · 编辑后台
cd /d "%~dp0"

:: 检查 node 是否安装
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   [错误] 没找到 Node.js，请先安装：
  echo   https://nodejs.org  （下载 LTS 版，一路下一步）
  echo.
  pause
  exit /b
)

echo.
echo   秋水居 · 编辑后台启动中…
echo   稍等片刻，浏览器会自动打开
echo.

:: 1.5 秒后自动打开浏览器（不阻塞服务启动）
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3210"

:: 启动后台服务（Ctrl+C 或关窗停止）
node server.js

pause
