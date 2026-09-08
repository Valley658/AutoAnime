@echo off
chcp 65001 >nul
cls
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [에러] 컴퓨터에 Node.js가 설치되어 있지 않습니다.
    pause
    exit
)
set DOTENV_DEBUG=false
npx -y @dotenvx/dotenvx run -f .env -- node index.js
pause