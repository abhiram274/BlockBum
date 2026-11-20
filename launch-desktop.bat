@echo off
setlocal enabledelayedexpansion
title BlockBum Core Desktop Launcher
echo ========================================================
echo   Starting BlockBum Decentralized Client ^& Platform
echo ========================================================

:: Ensure Node.js is in PATH
where node.exe >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    )
)

cd /d "%~dp0client\desktop"

:: Build frontend bundle if dist\index.html does not exist or if --build is passed
if not exist "dist\index.html" (
    echo [BlockBum] First-time setup: compiling frontend bundle...
    call npm run build
) else (
    if "%1"=="--build" (
        echo [BlockBum] Rebuilding frontend bundle...
        call npm run build
    )
)

echo [BlockBum] Launching BlockBum Core Desktop...
call npx electron .
