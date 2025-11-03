# Oldly Fun Music Box API

API backend para el juego musical "Oldly Fun Music Box" desarrollado con Node.js, Express y Prisma.

## Características

- 🎵 Sistema de mazos musicales con códigos QR
- 🔐 Autenticación JWT + Google OAuth
- 🏆 Sistema de rankings y puntuaciones
- 📱 API RESTful completa
- 👨‍💼 Panel de administración
- 🗄️ Base de datos MySQL con Prisma ORM

## Instalación

1. **Clonar y configurar**
```bash
npm install
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

3. **Configurar base de datos**
```bash
# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones (si es necesario)
npx prisma db push
```

4. **Iniciar servidor**
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## Endpoints Disponibles

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Login manual
- `GET /api/auth/google` - Iniciar OAuth con Google
- `GET /api/auth/google/callback` - Callback de Google OAuth
- `POST /api/auth/google` - Login con Google (SPA/Mobile)
- `GET /api/auth/me` - Obtener perfil del usuario

### Mazos
- `GET /api/decks` - Listar mazos disponibles
- `GET /api/decks/:id` - Obtener detalles de un mazo
- `GET /api/decks/:id/cards` - Obtener cartas de un mazo (requiere acceso)
- `POST /api/decks/:id/activate` - Activar acceso a un mazo

### Cartas
- `GET /api/cards/:id/play` - Reproducir carta (por ID o token QR)
- `GET /api/cards/:id/reveal` - Revelar información completa de carta

### Juego
- `POST /api/game/start` - Iniciar nueva partida
- `GET /api/game/:id` - Obtener estado del juego
- `POST /api/game/:id/round` - Enviar resultado de una jugada
- `POST /api/game/:id/finish` - Finalizar partida

### Rankings
- `GET /api/rankings` - Obtener rankings (global o por mazo)
- `GET /api/rankings/user/:userId` - Rankings específicos del usuario
- `GET /api/rankings/deck/:deckId/top` - Top jugadores de un mazo

### Administración
- `POST /api/admin/login` - Login de administrador
- `POST /api/admin/decks` - Crear/editar mazo
- `POST /api/admin/cards` - Crear nueva carta
- `GET /api/admin/users/export` - Exportar datos de usuarios
- `GET /api/admin/stats` - Estadísticas del dashboard

## Estructura del Proyecto

```
src/
├── controllers/        # Lógica de negocio
├── middleware/         # Middlewares (auth, validación)
├── routes/            # Definición de rutas
├── services/          # Servicios auxiliares
├── utils/             # Utilidades y configuración DB
└── app.js             # Servidor principal

prisma/
└── schema.prisma      # Esquema de base de datos
```

## Variables de Entorno Requeridas

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="mysql://usuario:password@localhost:3306/oldly_fun_music_box"
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=oldly-music-box
FRONTEND_URL=http://localhost:3000
```

## Tecnologías Utilizadas

- **Node.js** + **Express** - Backend framework
- **Prisma** - ORM para base de datos
- **MySQL** - Base de datos
- **JWT** - Autenticación
- **Passport.js** - Google OAuth
- **bcryptjs** - Hashing de contraseñas
- **Joi** / **express-validator** - Validación
- **Helmet** - Seguridad
- **CORS** - Cross-Origin Resource Sharing
- **Morgan** - Logging
- **Rate Limiting** - Protección contra spam

## Uso Básico

1. **Registrar usuario**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstname":"Juan","lastname":"Pérez","email":"juan@example.com","password":"123456"}'
```

2. **Obtener mazos disponibles**
```bash
curl http://localhost:3000/api/decks
```

3. **Iniciar juego**
```bash
curl -X POST http://localhost:3000/api/game/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deckId":"1","mode":"score"}'
```

## Contribución

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT.