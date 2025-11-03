# Scripts para configuración de la base de datos

# 1. Crear archivo .env con tus datos reales
cp .env.example .env

# 2. Instalar dependencias
npm install

# 3. Generar cliente Prisma
npx prisma generate

# 4. Si es una nueva instalación, hacer push del schema a la DB
# (Esto creará las tablas basándose en tu schema.prisma)
npx prisma db push

# 5. Opcional: Abrir Prisma Studio para ver la base de datos
npx prisma studio

# 6. Iniciar el servidor en modo desarrollo
npm run dev