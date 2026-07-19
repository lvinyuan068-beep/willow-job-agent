@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 正在启动 Willow Job Agent 2.0...

start "Willow Job Agent Server" powershell -NoLogo -NoExit -Command "& 'H:\node\npm.cmd' run app:start"

timeout /t 3 /nobreak >nul

start "" "http://127.0.0.1:4310"

exit /b