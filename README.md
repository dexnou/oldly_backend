# Oldy Fans Fun Music Box - Backend API

Servidor backend para el juego musical de trivias con sistema de puntuación, autenticación OAuth y gestión de cartas QR.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Esquema de Base de Datos](#esquema-de-base-de-datos)
- [Endpoints de API](#endpoints-de-api)
- [Flujo de Autenticación](#flujo-de-autenticación)
- [Flujo de Juego](#flujo-de-juego)
- [Configuración OAuth](#configuración-oauth)
- [Test Cases](#test-cases)
- [Estructura del Proyecto](#estructura-del-proyecto)

## 🚀 Características

- **Autenticación múltiple**: Email/contraseña y Google OAuth
- **Gestión de usuarios**: Perfiles, avatares, rankings
- **Sistema de mazos**: Cartas QR con canciones, artistas y álbumes
- **Modos de juego**: Casual y Competitivo con puntuación
- **Expiración automática**: Juegos expiran después de 1 hora
- **Rankings globales**: Sistema de puntuación y niveles
- **Panel de administración**: Gestión completa de contenido
- **API RESTful**: Endpoints documentados con validación

## 📋 Requisitos

- **Node.js** >= 16.0.0
- **MySQL** 5.7 o superior
- **npm** >= 8.0.0

## 🛠 Instalación

```bash
# Clonar repositorio
git clone https://github.com/dexnou/oldly_backend.git
cd oldly_backend

# Instalar dependencias
npm install

# Generar Prisma client
npm run prisma:generate

# Configurar base de datos
npm run prisma:migrate

# Sembrar datos iniciales (opcional)
npm run seed
```

## ⚙️ Configuración

Crear archivo `.env` basado en `.env.example`:

```env
# Environment Configuration
NODE_ENV=development
PORT=3010

# Database
DATABASE_URL="mysql://usuario:contraseña@localhost:3306/oldly_fun_music_box"

# JWT Secret
JWT_SECRET=tu_jwt_secret_aqui
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3010/api/auth/google/callback

# AWS S3 / DigitalOcean Spaces
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=oldly-music-box

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3010
```

### Scripts disponibles

```bash
npm run dev         # Desarrollo con nodemon
npm start          # Producción
npm run build      # Build para producción
npm run prisma:generate  # Generar Prisma client
npm run prisma:migrate   # Ejecutar migraciones
npm run prisma:studio    # Abrir Prisma Studio
npm run seed       # Sembrar datos de prueba
```

## 🗄️ Esquema de Base de Datos

### Usuarios (`users`)
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- firstname: VARCHAR(60) NOT NULL
- lastname: VARCHAR(60) NOT NULL
- email: VARCHAR(120) UNIQUE NOT NULL
- whatsapp: VARCHAR(30) NULL
- password_hash: VARCHAR(255) NULL
- google_id: VARCHAR(255) UNIQUE NULL
- avatar_url: VARCHAR(255) NULL
- created_at: DATETIME DEFAULT NOW()
- updated_at: DATETIME ON UPDATE NOW()
- last_login_at: DATETIME NULL
- is_active: BOOLEAN DEFAULT TRUE
```

### Mazos (`decks`)
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- title: VARCHAR(100) UNIQUE NOT NULL
- description: TEXT NULL
- theme: VARCHAR(50) NOT NULL
- buy_link: VARCHAR(255) NULL
- cover_image: VARCHAR(255) NULL
- active: BOOLEAN DEFAULT TRUE
- created_at: DATETIME DEFAULT NOW()
- updated_at: DATETIME ON UPDATE NOW()
```

### Cartas (`cards`)
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- deck_id: INT NOT NULL FOREIGN KEY
- artist_id: INT NOT NULL FOREIGN KEY
- album_id: INT NULL FOREIGN KEY
- song_name: VARCHAR(150) NOT NULL
- qr_code: TEXT NOT NULL
- qr_token: CHAR(16) UNIQUE NOT NULL
- preview_url: VARCHAR(255) NULL
- spotify_url: VARCHAR(255) NULL
- difficulty: ENUM('easy','medium','hard') DEFAULT 'medium'
- created_at: DATETIME DEFAULT NOW()
- updated_at: DATETIME ON UPDATE NOW()
```

### Juegos (`games`)
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- user_id: INT NOT NULL FOREIGN KEY
- deck_id: INT NOT NULL FOREIGN KEY
- mode: ENUM('casual','competitive') DEFAULT 'competitive'
- status: ENUM('started','finished','abandoned','expired') DEFAULT 'started'
- total_points: INT DEFAULT 0
- total_rounds: INT DEFAULT 0
- started_at: DATETIME DEFAULT NOW()
- ended_at: DATETIME NULL
```

### Participantes de Juego (`game_participants`)
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- game_id: INT NOT NULL FOREIGN KEY
- name: VARCHAR(80) NOT NULL
- total_points: INT DEFAULT 0
- total_rounds: INT DEFAULT 0
- created_at: DATETIME DEFAULT NOW()
```

### Rankings (`rankings`)
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- user_id: INT NOT NULL FOREIGN KEY
- deck_id: INT NOT NULL FOREIGN KEY
- points_total: INT DEFAULT 0
- games_played: INT DEFAULT 0
- last_played_at: DATETIME DEFAULT NOW()
- level: INT DEFAULT 1
```

## 📡 Endpoints de API

### 🔐 Autenticación

#### POST `/api/auth/register`
Registrar nuevo usuario

**Body:**
```json
{
  "firstname": "Juan",
  "lastname": "Pérez",
  "email": "juan@ejemplo.com",
  "password": "123456",
  "whatsapp": "+5491123456789"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "user": {
      "id": "1",
      "firstname": "Juan",
      "lastname": "Pérez",
      "email": "juan@ejemplo.com",
      "whatsapp": "+5491123456789",
      "avatarUrl": null,
      "createdAt": "2025-11-11T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST `/api/auth/login`
Iniciar sesión

**Body:**
```json
{
  "email": "juan@ejemplo.com",
  "password": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": {
      "id": "1",
      "firstname": "Juan",
      "lastname": "Pérez",
      "email": "juan@ejemplo.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### GET `/api/auth/google`
Redirigir a Google OAuth

**Query Params:**
- `redirect`: URL de redirección post-login

#### GET `/api/auth/google/callback`
Callback de Google OAuth (manejado automáticamente)

#### GET `/api/auth/me`
Obtener perfil del usuario autenticado

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1",
      "firstname": "Juan",
      "lastname": "Pérez",
      "email": "juan@ejemplo.com",
      "whatsapp": "+5491123456789",
      "avatarUrl": null,
      "createdAt": "2025-11-11T10:00:00.000Z",
      "lastLoginAt": "2025-11-11T10:30:00.000Z"
    }
  }
}
```

### 🃏 Cartas

#### GET `/api/cards/:token`
Obtener carta por QR token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "card": {
      "id": 1,
      "songName": "Bohemian Rhapsody",
      "qrToken": "ABC123DEF456",
      "previewUrl": "https://spotify.com/preview/123",
      "spotifyUrl": "https://spotify.com/track/123",
      "difficulty": "medium",
      "artist": {
        "id": 1,
        "name": "Queen",
        "country": "UK"
      },
      "album": {
        "id": 1,
        "title": "A Night at the Opera",
        "releaseYear": 1975
      },
      "deck": {
        "id": 1,
        "title": "Rock Clásico",
        "theme": "rock"
      }
    }
  }
}
```

#### POST `/api/cards/:cardId/play` 🔒
Registrar jugada de carta (requiere autenticación)

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "gameMode": "competitive",
  "userKnew": true
}
```

#### POST `/api/cards/:cardId/reveal` 🔒
Revelar respuesta de carta

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "gameMode": "competitive"
}
```

### 🎮 Juegos

#### GET `/api/game/active-competitive/:deckId` 🔒
Obtener juego competitivo activo para un mazo

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "game": {
      "id": 1,
      "mode": "competitive",
      "status": "started",
      "totalPoints": 150,
      "totalRounds": 5,
      "startedAt": "2025-11-11T10:00:00.000Z",
      "participants": [
        {
          "id": 1,
          "name": "Juan",
          "totalPoints": 80,
          "totalRounds": 3
        },
        {
          "id": 2,
          "name": "María",
          "totalPoints": 70,
          "totalRounds": 2
        }
      ]
    }
  }
}
```

#### POST `/api/game/start-competitive` 🔒
Iniciar nuevo juego competitivo

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "deckId": 1
}
```

#### POST `/api/game/:gameId/submit-competitive-round` 🔒
Enviar ronda competitiva

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "participantName": "Juan",
  "cardId": 5,
  "songCorrect": true,
  "artistCorrect": true,
  "albumCorrect": false,
  "points": 7
}
```

### 🎯 Mazos

#### GET `/api/decks`
Obtener todos los mazos activos

**Response (200):**
```json
{
  "success": true,
  "data": {
    "decks": [
      {
        "id": 1,
        "title": "Rock Clásico",
        "description": "Los mejores hits del rock",
        "theme": "rock",
        "coverImage": "https://ejemplo.com/cover.jpg",
        "cardCount": 25,
        "active": true
      }
    ]
  }
}
```

#### POST `/api/decks/:deckId/activate` 🔒
Activar mazo para usuario

**Headers:**
```
Authorization: Bearer <token>
```

### 🏆 Rankings

#### GET `/api/rankings/:deckId`
Obtener ranking de un mazo

**Query Params:**
- `limit`: Número de resultados (default: 10)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "rankings": [
      {
        "position": 1,
        "user": {
          "id": "1",
          "firstname": "Juan",
          "lastname": "Pérez"
        },
        "pointsTotal": 1250,
        "gamesPlayed": 15,
        "level": 3,
        "lastPlayedAt": "2025-11-11T10:00:00.000Z"
      }
    ]
  }
}
```

## 🔄 Flujo de Autenticación

### 1. Registro/Login Manual
```
1. Cliente envía credenciales → POST /api/auth/register
2. Backend valida email único
3. Backend hashea contraseña con bcrypt
4. Backend crea usuario en BD
5. Backend genera token JWT
6. Backend retorna {user, token}
```

### 2. Login con Google OAuth
```
1. Cliente → GET /api/auth/google
2. Backend → Redirect a Google OAuth
3. Google → Autorización del usuario
4. Google → Redirect con código
5. Backend → Intercambio código por token
6. Backend → Obtener perfil de Google
7. Backend → Crear/buscar usuario en BD
8. Backend → Generar JWT token
9. Backend → Redirect con token al frontend
```

## 🎮 Flujo de Juego

### 1. Escanear QR y Jugar
```
1. Cliente escanea QR → GET /api/cards/:token
2. Backend retorna datos de la carta
3. Cliente reproduce audio/muestra info
4. Cliente envía respuesta → POST /api/cards/:cardId/play
5. Backend registra jugada y actualiza puntuación
6. Backend retorna resultado y estado del juego
```

### 2. Modo Competitivo
```
1. Iniciar juego → POST /api/game/start-competitive
2. Para cada carta:
   - Enviar ronda → POST /api/game/:gameId/submit-competitive-round
   - Backend actualiza participantes
   - Backend retorna scoreboard actualizado
3. Juego expira automáticamente después de 1 hora
```

## 🔧 Configuración OAuth

### Google OAuth Setup

1. **Crear proyecto en Google Cloud Console:**
   - Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - Crea un nuevo proyecto o selecciona uno existente

2. **Habilitar Google+ API:**
   - En el menú lateral: APIs & Services > Library
   - Busca "Google+ API" y habilítala

3. **Crear credenciales OAuth:**
   - APIs & Services > Credentials
   - Create Credentials > OAuth 2.0 Client IDs
   - Application type: Web application

4. **Configurar URLs:**
   - Authorized JavaScript origins: `http://localhost:3010`
   - Authorized redirect URIs: `http://localhost:3010/api/auth/google/callback`

5. **Copiar credenciales al .env:**
   ```env
   GOOGLE_CLIENT_ID=tu_client_id_aqui
   GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
   ```

### Producción
Para producción, actualiza las URLs autorizadas:
- Origins: `https://tu-dominio.com`
- Redirect URI: `https://tu-dominio.com/api/auth/google/callback`

## 🧪 Test Cases

### Postman Collection

#### 1. Autenticación
```bash
# Registrar usuario
POST {{BASE_URL}}/api/auth/register
Content-Type: application/json

{
  "firstname": "Test",
  "lastname": "User",
  "email": "test@example.com",
  "password": "123456",
  "whatsapp": "+5491123456789"
}

# Login
POST {{BASE_URL}}/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "123456"
}

# Verificar perfil
GET {{BASE_URL}}/api/auth/me
Authorization: Bearer {{token}}
```

#### 2. Cartas y Juego
```bash
# Obtener carta por QR
GET {{BASE_URL}}/api/cards/ABC123DEF456

# Obtener mazos
GET {{BASE_URL}}/api/decks

# Activar mazo
POST {{BASE_URL}}/api/decks/1/activate
Authorization: Bearer {{token}}

# Iniciar juego competitivo
POST {{BASE_URL}}/api/game/start-competitive
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "deckId": 1
}

# Enviar ronda
POST {{BASE_URL}}/api/game/1/submit-competitive-round
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "participantName": "Test User",
  "cardId": 1,
  "songCorrect": true,
  "artistCorrect": true,
  "albumCorrect": false,
  "points": 7
}
```

#### 3. Rankings
```bash
# Ver ranking de mazo
GET {{BASE_URL}}/api/rankings/1?limit=10
```

### Variables de Entorno para Postman
```json
{
  "BASE_URL": "http://localhost:3010",
  "token": "Bearer_token_aqui"
}
```

### Test Scenarios

1. **Autenticación completa**
   - ✅ Registro exitoso
   - ✅ Login con credenciales correctas
   - ❌ Login con credenciales incorrectas
   - ✅ Google OAuth flow
   - ✅ Verificación de token JWT

2. **Gestión de cartas**
   - ✅ Obtener carta por QR token válido
   - ❌ QR token inválido
   - ✅ Jugar carta en modo casual
   - ✅ Jugar carta en modo competitivo

3. **Sistema de juegos**
   - ✅ Iniciar juego competitivo
   - ✅ Unirse a juego existente
   - ✅ Enviar rondas
   - ✅ Expiración automática (1 hora)

4. **Rankings y puntuación**
   - ✅ Ver rankings globales
   - ✅ Actualización de puntos
   - ✅ Sistema de niveles

## 📁 Estructura del Proyecto

```
Backend/
├── src/
│   ├── app.js                 # Punto de entrada principal
│   ├── controllers/           # Controladores de rutas
│   │   ├── authController.js  # Autenticación y usuarios
│   │   ├── cardController.js  # Gestión de cartas
│   │   ├── gameController.js  # Lógica de juegos
│   │   ├── deckController.js  # Gestión de mazos
│   │   ├── rankingController.js # Rankings y puntuación
│   │   └── adminController.js # Panel de administración
│   ├── middleware/            # Middlewares personalizados
│   │   ├── auth.js           # Autenticación JWT
│   │   ├── passport.js       # Configuración Passport
│   │   └── validation.js     # Validación de datos
│   ├── routes/               # Definición de rutas
│   │   ├── auth.js          # Rutas de autenticación
│   │   ├── cards.js         # Rutas de cartas
│   │   ├── game.js          # Rutas de juego
│   │   ├── decks.js         # Rutas de mazos
│   │   ├── rankings.js      # Rutas de rankings
│   │   └── admin.js         # Rutas de administración
│   ├── services/             # Servicios de negocio
│   │   └── authService.js   # Servicios de autenticación
│   └── utils/               # Utilidades
│       └── database.js      # Configuración Prisma
├── prisma/                  # Esquemas y migraciones
│   ├── schema.prisma       # Esquema de base de datos
│   └── seed.js            # Datos de prueba
├── .env.example            # Ejemplo de variables de entorno
├── package.json           # Dependencias y scripts
└── README.md             # Este archivo
```

## 🚀 Despliegue

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
# Build
npm run build

# Migrar base de datos
npm run prisma:migrate

# Iniciar
npm start
```

### Docker
```bash
# Build imagen
docker build -t oldly-backend .

# Ejecutar contenedor
docker run -p 3010:3010 --env-file .env oldly-backend
```

## 📄 Licencia

MIT License - ver archivo [LICENSE](LICENSE) para detalles.

## 🤝 Contribuir

1. Fork el proyecto
2. Crear branch para feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📞 Soporte

Para soporte y preguntas:
- **Email**: soporte@oldlymusic.com
- **GitHub Issues**: [Crear issue](https://github.com/dexnou/oldly_backend/issues)
- **Documentación**: [Wiki del proyecto](https://github.com/dexnou/oldly_backend/wiki)

---

**Oldy Fans Fun Music Box Backend** - Desarrollado con ❤️ por el equipo de dexnou