@echo off
title BlockBum Core Desktop Launcher
echo ========================================================
echo Starting BlockBum Decentralized Client & Platform...
echo ========================================================
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0client\desktop"
call npx electron .
