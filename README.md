# 🗳️ Sistema de Cadastro Eleitoral de Campo
## Guia Completo de Instalação e Build Android APK

---

## 📁 Estrutura do Projeto

```
projeto-eleitoral/
├── .env                       ← Configuração (senhas, IPs)
├── .gitignore                 ← Arquivos a ignorar no Git
├── package.json               ← Dependências
├── server.js                  ← Backend (Node.js)
├── banco.sql                  ← Banco de dados
├── capacitor.config.json      ← Configuração APK
├── frontend/
│   ├── index.html             ← App (Web + APK)
│   ├── public/
│   │   └── config.js          ← Configuração Frontend
│   └── dist/                  ← Compilado (gerado)
└── android/                   ← Projeto Android (gerado)
    └── app/build/outputs/apk/release/
        └── app-release.apk    ← APK FINAL! 📱
```

---

## ⚙️ PASSO 1 — Preparar Ambiente

### 1.1 Instalar Node.js
```bash
# Verificar versão (precisa v18+)
node --version
npm --version

# Caso não tenha: https://nodejs.org
```

### 1.2 Instalar MySQL
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install mysql-server -y
sudo mysql_secure_installation

# Verificar
mysql --version
```

### 1.3 Instalar Java (para APK)
```bash
# Ubuntu/Debian
sudo apt install openjdk-17-jdk -y
java -version
```

### 1.4 Instalar Android Studio
```bash
# Download: https://developer.android.com/studio
# Instale e configure SDK/Gradle
```

---

## ⚙️ PASSO 2 — Criar Projeto

### 2.1 Criar pastas
```bash
mkdir projeto-eleitoral
cd projeto-eleitoral

# Criar subpastas
mkdir frontend/public -p
```

### 2.2 Copiar arquivos
Copie estes arquivos para a raiz:
- `.env`
- `.gitignore`
- `package.json`
- `server.js`
- `banco.sql`
- `capacitor.config.json`

Copie para `frontend/`:
- `index.html`

Copie para `frontend/public/`:
- `config.js`

### 2.3 Editar .env
```bash
# Abra .env e preencha:
DB_HOST=localhost          # ou seu IP MySQL
DB_USER=root               # seu usuário
DB_PASS=sua_senha          # sua senha MySQL
DB_NAME=eleitoral          # nome do banco
JWT_SECRET=sua_chave_secreta_32_chars
CORS_ORIGIN=http://192.168.1.50:3000  # seu IP
```

### 2.4 Editar config.js
```javascript
// frontend/public/config.js
// Linha ~25 - MUDE PARA SEU IP:
apiUrl = 'http://192.168.1.50:3000';  // seu IP

```

---

## ⚙️ PASSO 3 — Configurar Banco de Dados

```bash
# Conectar ao MySQL
mysql -u root -p

# Dentro do MySQL:
mysql> source banco.sql;
mysql> exit;

# Verificar tabelas
mysql -u root -p eleitoral
mysql> SHOW TABLES;
mysql> SELECT COUNT(*) FROM usuarios;
mysql> exit;
```

---

## ⚙️ PASSO 4 — Iniciar Backend

```bash
# Instalar dependências
npm install

# Iniciar servidor
npm start

# Você verá:
# ✅ MySQL conectado
# 🚀 Servidor rodando na porta 3000
```

**Teste:** Abra `http://localhost:3000` no navegador

---

## ⚙️ PASSO 5 — Testar Frontend Web

```bash
# Login padrão:
# Usuário: admin
# Senha: Admin@2024

# Cadastre alguns dados
# Teste o formulário
```

---

## ⚙️ PASSO 6 — Gerar APK Android

### 6.1 Instalar Capacitor
```bash
npm install @capacitor/cli @capacitor/core @capacitor/android
```

### 6.2 Criar Keystore (assinatura)
```bash
# UMA VEZ SÓ - cria chave para assinar APK
keytool -genkey -v -keystore eleitoral.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 -alias eleitoral

# Responda as perguntas (pode apertar Enter)
# Senha: defina uma senha forte
```

### 6.3 Build Frontend
```bash
# Compilar HTML/CSS/JS para produção
cd frontend && npm install && npm run build && cd ..

# Cria pasta: frontend/dist/
```

### 6.4 Sincronizar Android
```bash
# Preparar projeto Android
npx cap sync android
```

### 6.5 Compilar APK
```bash
# Entrar na pasta Android
cd android

# Build de release (demora 15-20 min primeira vez)
./gradlew assembleRelease

# No Windows:
# gradlew.bat assembleRelease

# Sair da pasta
cd ..

# ✅ APK pronto em:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## 📱 PASSO 7 — Testar APK no Celular

### 7.1 Via USB
```bash
# Conectar celular por USB
# Ativar "Depuração USB" (Settings > Developer Options)

# Instalar APK
adb install android/app/build/outputs/apk/release/app-release.apk

# Sucesso!
```

### 7.2 Via Arquivo
```bash
# Copiar APK para celular
# Abrir gerenciador de arquivos
# Tocar no APK para instalar
```

---

## 📤 PASSO 8 — Distribuir APK (SEM PLAY STORE)

### Opção 1: Email/WhatsApp
```
Arquivo: app-release.apk (30-50 MB)
Envie direto!
```

### Opção 2: Link do Servidor
```bash
# Copiar para servidor
scp app-release.apk user@seu-servidor:/var/www/downloads/

# Acessar pelo celular
https://seu-servidor.com/downloads/app-release.apk

# Clicar em instalar
```

### Opção 3: GitHub Releases
```
1. Criar repositório
2. Fazer upload do APK
3. Criar Release
4. Compartilhar link público
```

---

## 🔑 Credenciais Padrão

| Usuário | Senha | Perfil |
|---------|-------|--------|
| admin | Admin@2024 | Administrador |
| pres | Admin@2024 | Presidente |
| joao | Admin@2024 | Cadastrador |
| maria | Admin@2024 | Cadastrador |

**⚠️ ALTERE TODAS AS SENHAS após o primeiro login!**

---

## 🛡️ Segurança

✅ Senhas: bcrypt 12 rounds  
✅ Autenticação: JWT 8 horas  
✅ Validação: CPF (algoritmo oficial)  
✅ Deduplicação: Por CPF  
✅ Controle de acesso: Por role (adm/cad/pres)  
✅ Assinatura: APK com certificado próprio  

---

## 🔧 Comandos Úteis

```bash
# Backend desenvolvimento (auto-reload)
npm run backend:dev

# Frontend desenvolvimento
npm run frontend:dev

# Build tudo
npm run build

# Sincronizar Android
npm run cap:sync

# Abrir Android Studio
npm run cap:open

# APK de uma vez
npm run apk:build
```

---

## 🐛 Troubleshooting

### "Cannot connect to MySQL"
```bash
# Verificar se MySQL está rodando
sudo systemctl status mysql
sudo systemctl start mysql
```

### "JAVA_HOME not set"
```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
```

### "APK não instala"
```bash
# Desinstalar versão anterior
adb uninstall br.com.cadastroeleitoral.app

# Reinstalar
adb install -r app-release.apk
```

### "Port 3000 already in use"
```bash
# Mudar porta em .env
PORT=3001

# Ou matar processo
lsof -ti:3000 | xargs kill -9
```

---

## 📋 Checklist Final

```
✅ .env preenchido
✅ config.js com IP correto
✅ MySQL banco criado
✅ Backend rodando
✅ Frontend testado
✅ Keystore criado
✅ APK compilado
✅ APK testado no celular
✅ APK distribuído
✅ Pronto para uso!
```

---

## 📊 API Endpoints

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| POST | `/login` | Público | Login |
| GET | `/cadastros` | Autenticado | Listar |
| POST | `/cadastros` | Autenticado | Criar |
| GET | `/relatorio` | adm, pres | Relatório |

---

## 🎉 Pronto!

Seu sistema está **100% funcional** para APK Android sem Play Store!

**Backend** ↔️ **MySQL**  
**Frontend** ↔️ **Backend**  
**APK** ↔️ **Frontend**  

Tudo conectado! 🚀