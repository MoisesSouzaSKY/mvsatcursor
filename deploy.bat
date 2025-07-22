@echo off
echo 🚀 Iniciando deploy do MV SAT...

REM Gerar build do projeto
echo 🔨 Gerando build do projeto...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Falha ao gerar o build. Corrija os erros e tente novamente.
    exit /b 1
)

REM Perguntar se deseja fazer deploy no Firebase Hosting
set /p deployHosting="Deseja fazer deploy no Firebase Hosting? (s/n): "
if "%deployHosting%"=="s" (
    echo 🔥 Fazendo deploy no Firebase Hosting...
    call firebase deploy --only hosting
    if %errorlevel% neq 0 (
        echo ❌ Falha ao fazer deploy no Firebase Hosting.
    ) else (
        echo ✅ Deploy no Firebase Hosting concluído com sucesso!
    )
)

REM Perguntar se deseja salvar as alterações no GitHub
set /p saveToGithub="Deseja salvar as alterações no GitHub? (s/n): "
if "%saveToGithub%"=="s" (
    set /p commitMessage="Digite a mensagem do commit: "
    
    echo 🔄 Adicionando arquivos ao Git...
    call git add .
    
    echo 🔄 Commitando alterações...
    call git commit -m "%commitMessage%"
    
    echo 🔄 Enviando alterações para o GitHub...
    call git push
    if %errorlevel% neq 0 (
        echo ❌ Falha ao salvar as alterações no GitHub.
    ) else (
        echo ✅ Alterações salvas no GitHub com sucesso!
    )
)

echo 🎉 Processo de deploy concluído! 