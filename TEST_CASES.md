# 🧪 Test Cases - Oldy Fans Fun Music Box

## 📋 Manual Test Cases

### 1. Flujo de QR Code y Juego Competitivo

#### TC001: Escaneo de QR exitoso
- **Descripción**: Verificar que el QR code se procese correctamente
- **Pre-condición**: Usuario autenticado, QR code válido disponible
- **Pasos**:
  1. Escanear QR con token `ABC123DEF456`
  2. Verificar redirección a página de carta
  3. Validar información de la carta mostrada
- **Resultado esperado**: 
  - Carta se muestra correctamente
  - Información de canción, artista y álbum visible
  - Botón "Jugar" habilitado

#### TC002: QR inválido
- **Descripción**: Manejo de QR tokens no válidos
- **Pasos**:
  1. Intentar acceder con token inválido `INVALID123`
- **Resultado esperado**: 
  - Error 404 con mensaje claro
  - Redirección a página de error

#### TC003: Inicio de juego competitivo
- **Descripción**: Crear nueva partida competitiva desde carta
- **Pre-condición**: Carta válida cargada, usuario autenticado
- **Pasos**:
  1. Hacer clic en "Jugar en modo competitivo"
  2. Verificar creación de nueva partida
  3. Confirmar redirección a página de juego
- **Resultado esperado**:
  - Juego creado con ID único
  - Scoreboard inicializado
  - Timer de 1 hora activo

#### TC004: Unirse a juego existente
- **Descripción**: Usuario se une a partida ya iniciada
- **Pre-condición**: Juego competitivo activo en el deck
- **Pasos**:
  1. Escanear QR del mismo deck
  2. Seleccionar "Unirse a juego existente"
  3. Verificar participación en scoreboard
- **Resultado esperado**:
  - Usuario agregado a participantes
  - Puntos inicializados en 0
  - Acceso a cartas del juego

### 2. Autenticación y Registro

#### TC005: Registro de usuario válido
- **Descripción**: Crear cuenta nueva con datos válidos
- **Datos de prueba**:
  ```json
  {
    "firstname": "Test",
    "lastname": "User",
    "email": "test@example.com",
    "password": "123456",
    "whatsapp": "+5491123456789"
  }
  ```
- **Resultado esperado**:
  - Usuario creado exitosamente
  - Token JWT generado
  - Redirección a dashboard

#### TC006: Login con Google OAuth
- **Descripción**: Autenticación mediante Google
- **Pasos**:
  1. Hacer clic en "Iniciar sesión con Google"
  2. Completar flujo OAuth
  3. Verificar redirección exitosa
- **Resultado esperado**:
  - Usuario autenticado
  - Datos de perfil sincronizados
  - Sesión activa

#### TC007: Validación de email único
- **Descripción**: Verificar que no se permitan emails duplicados
- **Pre-condición**: Usuario con email test@example.com ya existe
- **Pasos**:
  1. Intentar registrar con mismo email
- **Resultado esperado**:
  - Error 400 con mensaje "Email ya registrado"

### 3. Sistema de Puntuación

#### TC008: Puntuación por respuesta correcta
- **Descripción**: Calcular puntos según respuestas acertadas
- **Escenarios**:
  - **Solo canción**: 5 puntos
  - **Canción + artista**: 7 puntos
  - **Canción + artista + álbum**: 10 puntos
  - **Solo artista**: 3 puntos
  - **Solo álbum**: 2 puntos
- **Resultado esperado**: Puntuación acorde a criterios

#### TC009: Actualización de ranking
- **Descripción**: Verificar actualización de posiciones
- **Pre-condición**: Múltiples usuarios con puntuaciones
- **Pasos**:
  1. Completar ronda con alta puntuación
  2. Verificar nueva posición en ranking
- **Resultado esperado**: Ranking actualizado en tiempo real

### 4. PWA y Funcionalidad Offline

#### TC010: Instalación de PWA
- **Descripción**: Verificar que la app se puede instalar
- **Pasos**:
  1. Abrir app en navegador compatible
  2. Buscar prompt de instalación
  3. Instalar aplicación
- **Resultado esperado**:
  - App instalada en dispositivo
  - Icono en pantalla de inicio
  - Funciona como app nativa

#### TC011: Cache offline
- **Descripción**: Verificar funcionalidad sin conexión
- **Pre-condición**: App visitada previamente online
- **Pasos**:
  1. Desconectar internet
  2. Intentar navegar en la app
- **Resultado esperado**:
  - Páginas principales cargables
  - Imágenes en cache disponibles
  - Mensaje claro sobre estado offline

### 5. Administración

#### TC012: Login de administrador
- **Datos de prueba**:
  ```json
  {
    "email": "admin@oldlymusic.com",
    "password": "admin123"
  }
  ```
- **Resultado esperado**: Acceso a panel administrativo

#### TC013: Estadísticas del dashboard
- **Descripción**: Verificar métricas en panel admin
- **Métricas esperadas**:
  - Total de usuarios registrados
  - Juegos activos
  - Cartas más jugadas
  - Rankings por deck

## 🔧 Tests Automatizados con Postman

### Configuración inicial:
1. Importar `postman-collection.json`
2. Importar `postman-environment.json`
3. Configurar variables de entorno:
   - `BASE_URL`: http://localhost:3001
   - `FRONTEND_URL`: http://localhost:3001

### Ejecución de tests:
1. **Authentication Flow**: Ejecutar carpeta "🔐 Authentication"
2. **Game Flow**: Ejecutar "🎮 Game" → "🃏 Cards" → "🏆 Rankings"
3. **Admin Flow**: Ejecutar "👨‍💼 Admin"

### Tests automatizados incluidos:
- ✅ Validación de estructura de respuestas
- ✅ Verificación de códigos de estado HTTP
- ✅ Extracción automática de tokens
- ✅ Validación de tiempo de respuesta (< 5s)
- ✅ Tests de formato JSON

## 🚨 Casos Edge y Errores

### Error Handling Tests:

#### EH001: Token expirado
- **Setup**: Token JWT expirado
- **Endpoint**: Cualquier endpoint protegido
- **Resultado esperado**: 401 Unauthorized

#### EH002: Datos malformados
- **Setup**: JSON inválido en request
- **Resultado esperado**: 400 Bad Request

#### EH003: Usuario inexistente
- **Setup**: ID de usuario que no existe
- **Resultado esperado**: 404 Not Found

#### EH004: Juego expirado
- **Setup**: Intentar acceder a juego > 1 hora
- **Resultado esperado**: Error de juego expirado

#### EH005: Límite de participantes
- **Setup**: Más de 20 usuarios en un juego
- **Resultado esperado**: Error de límite alcanzado

## 📊 Métricas de Performance

### Benchmarks esperados:
- **Tiempo de respuesta API**: < 500ms (promedio)
- **Carga de página**: < 2s (First Contentful Paint)
- **Time to Interactive**: < 3s
- **Tamaño de bundle**: < 1MB (gzipped)

### Load Testing:
- **Usuarios concurrentes**: 100+
- **Requests por segundo**: 50+
- **Uptime**: 99.9%

## ✅ Checklist de Deployment

### Pre-deployment:
- [ ] Todos los tests de Postman pasan
- [ ] Tests manuales completados
- [ ] Performance benchmarks cumplidos
- [ ] Security scan sin vulnerabilidades críticas
- [ ] PWA lighthouse score > 90
- [ ] Database migrations aplicadas
- [ ] Environment variables configuradas
- [ ] SSL certificados válidos
- [ ] Monitoreo y logs configurados

### Post-deployment:
- [ ] Smoke tests en producción
- [ ] Monitoring dashboard activo
- [ ] Backup schedule configurado
- [ ] Error tracking funcionando
- [ ] Analytics implementado