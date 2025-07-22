# Script de Deploy para MV SAT
Write-Host "🚀 Iniciando deploy do MV SAT..." -ForegroundColor Cyan

# Verificar se o Firebase CLI está instalado
if (!(Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Firebase CLI não encontrado. Por favor, instale com 'npm install -g firebase-tools'" -ForegroundColor Red
    exit 1
}

# Verificar se o usuário está logado no Firebase
try {
    $firebaseStatus = firebase projects:list
} catch {
    Write-Host "❌ Você não está logado no Firebase. Por favor, execute 'firebase login'" -ForegroundColor Red
    exit 1
}

# Gerar build do projeto
Write-Host "🔨 Gerando build do projeto..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Falha ao gerar o build. Corrija os erros e tente novamente." -ForegroundColor Red
    exit 1
}

# Perguntar se deseja fazer deploy no Firebase Hosting
$deployHosting = Read-Host "Deseja fazer deploy no Firebase Hosting? (s/n)"
if ($deployHosting -eq "s") {
    Write-Host "🔥 Fazendo deploy no Firebase Hosting..." -ForegroundColor Yellow
    firebase deploy --only hosting
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha ao fazer deploy no Firebase Hosting." -ForegroundColor Red
    } else {
        Write-Host "✅ Deploy no Firebase Hosting concluído com sucesso!" -ForegroundColor Green
    }
}

# Perguntar se deseja fazer deploy das regras do Firestore
$deployFirestore = Read-Host "Deseja fazer deploy das regras do Firestore? (s/n)"
if ($deployFirestore -eq "s") {
    Write-Host "🔥 Fazendo deploy das regras do Firestore..." -ForegroundColor Yellow
    firebase deploy --only firestore:rules
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha ao fazer deploy das regras do Firestore." -ForegroundColor Red
    } else {
        Write-Host "✅ Deploy das regras do Firestore concluído com sucesso!" -ForegroundColor Green
    }
}

# Perguntar se deseja fazer deploy dos índices do Firestore
$deployFirestoreIndexes = Read-Host "Deseja fazer deploy dos índices do Firestore? (s/n)"
if ($deployFirestoreIndexes -eq "s") {
    Write-Host "🔥 Fazendo deploy dos índices do Firestore..." -ForegroundColor Yellow
    firebase deploy --only firestore:indexes
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha ao fazer deploy dos índices do Firestore." -ForegroundColor Red
    } else {
        Write-Host "✅ Deploy dos índices do Firestore concluído com sucesso!" -ForegroundColor Green
    }
}

# Perguntar se deseja fazer deploy das regras do Storage
$deployStorage = Read-Host "Deseja fazer deploy das regras do Storage? (s/n)"
if ($deployStorage -eq "s") {
    Write-Host "🔥 Fazendo deploy das regras do Storage..." -ForegroundColor Yellow
    firebase deploy --only storage
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha ao fazer deploy das regras do Storage." -ForegroundColor Red
    } else {
        Write-Host "✅ Deploy das regras do Storage concluído com sucesso!" -ForegroundColor Green
    }
}

# Perguntar se deseja fazer deploy das funções
$deployFunctions = Read-Host "Deseja fazer deploy das funções do Firebase? (s/n)"
if ($deployFunctions -eq "s") {
    Write-Host "🔥 Fazendo deploy das funções do Firebase..." -ForegroundColor Yellow
    firebase deploy --only functions
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha ao fazer deploy das funções do Firebase." -ForegroundColor Red
    } else {
        Write-Host "✅ Deploy das funções do Firebase concluído com sucesso!" -ForegroundColor Green
    }
}

# Perguntar se deseja salvar as alterações no GitHub
$saveToGithub = Read-Host "Deseja salvar as alterações no GitHub? (s/n)"
if ($saveToGithub -eq "s") {
    $commitMessage = Read-Host "Digite a mensagem do commit"
    
    Write-Host "🔄 Adicionando arquivos ao Git..." -ForegroundColor Yellow
    git add .
    
    Write-Host "🔄 Commitando alterações..." -ForegroundColor Yellow
    git commit -m $commitMessage
    
    Write-Host "🔄 Enviando alterações para o GitHub..." -ForegroundColor Yellow
    git push
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha ao salvar as alterações no GitHub." -ForegroundColor Red
    } else {
        Write-Host "✅ Alterações salvas no GitHub com sucesso!" -ForegroundColor Green
    }
}

Write-Host "🎉 Processo de deploy concluído!" -ForegroundColor Cyan 