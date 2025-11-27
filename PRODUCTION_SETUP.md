# Configuración de Producción - Variables de Entorno

## ⚠️ Problema Común

Si ves el error:
```
Can't reach database server at `localhost:3306`
```

Significa que la variable de entorno `DATABASE_URL` no está configurada en producción.

## ✅ Soluciones

### Opción 1: Docker con --env-file (Recomendado)

```bash
docker run -p 3004:3004 --env-file .env oldly-backend
```

### Opción 2: Docker con variables individuales

```bash
docker run -p 3004:3004 \
  -e DATABASE_URL="mysql://usuario:contraseña@host:puerto/base_de_datos?sslmode=require" \
  -e JWT_SECRET="tu_jwt_secret_aqui" \
  -e NODE_ENV="production" \
  -e PORT="3004" \
  oldly-backend
```

**Nota:** Reemplaza los valores con tus credenciales reales.

### Opción 3: Docker Compose

Crear `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3004:3004"
    env_file:
      - .env
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

Luego ejecutar:
```bash
docker-compose up -d
```

### Opción 4: DigitalOcean App Platform / Vercel / Otros

Configurar las variables de entorno en el panel de control del servicio:

**Variables requeridas:**
- `DATABASE_URL` - URL completa de conexión a MySQL
- `JWT_SECRET` - Secreto para firmar tokens JWT
- `NODE_ENV` - `production`
- `PORT` - Puerto del servidor (ej: 3004)
- `FRONTEND_URL` - URL del frontend para CORS
- `GOOGLE_CLIENT_ID` - (si usas OAuth)
- `GOOGLE_CLIENT_SECRET` - (si usas OAuth)

## 📝 Formato de DATABASE_URL

El formato correcto para MySQL es:
```
mysql://usuario:contraseña@host:puerto/base_de_datos?sslmode=require
```

Ejemplo para DigitalOcean:
```
DATABASE_URL="mysql://usuario:contraseña@db-mysql-nyc3-XXXXX-do-user-XXXXX-0.l.db.ondigitalocean.com:25060/nombre_base?sslmode=require"
```

**Nota:** Reemplaza `usuario`, `contraseña`, `XXXXX` y `nombre_base` con tus valores reales.

## 🔍 Verificar Configuración

Para verificar que las variables están configuradas:

```bash
# Dentro del contenedor
docker exec -it <container_id> env | grep DATABASE_URL

# O agregar un endpoint de debug (solo en desarrollo)
# GET /api/debug/env (no exponer en producción)
```

## ⚠️ Seguridad

- **NUNCA** subas el archivo `.env` al repositorio
- Usa secretos del sistema de despliegue para variables sensibles
- Rota las contraseñas regularmente
- Usa diferentes bases de datos para desarrollo y producción

