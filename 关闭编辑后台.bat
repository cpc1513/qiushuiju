@echo off
chcp 65001 >nul
title 关闭编辑后台

:: 结束占用 3210 端口的 node 进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3210" ^| findstr "LISTENING"') do (
  taskkill /PID %%a /F >nul 2>nul
)

echo.
echo   编辑后台已关闭
echo.
timeout /t 2 >nul
