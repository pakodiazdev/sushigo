FROM php:8.2-apache AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libzip-dev \
    libpq-dev \
    postgresql-client \
    supervisor \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    && docker-php-ext-install zip pdo pdo_pgsql pgsql \
    && rm -rf /var/lib/apt/lists/*


# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

ENV PATH="/root/.composer/vendor/bin:${PATH}"

# Enable Apache modules
RUN a2enmod rewrite headers

# Set working directory
WORKDIR /app/code

# Expose port 80
EXPOSE 80

FROM base as dev

# Install Node.js 20.x (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install Yarn
RUN npm install -g yarn

# Install Docker CLI
RUN install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# Install Laravel CLI
RUN composer global require laravel/installer \
    && echo 'export PATH="$HOME/.composer/vendor/bin:$PATH"' >> ~/.bashrc

# Copy Supervisor configuration
COPY docker/app/config/dev/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy initialization script
COPY docker/app/config/dev/init.sh /usr/local/bin/init.sh

RUN chmod +x /usr/local/bin/init.sh

# Start initialization script
CMD ["/usr/local/bin/init.sh"]

FROM base AS prod

ARG APP_KEY
ARG APP_ENV=production
ARG APP_DEBUG=false
ARG API_URL
ARG DB_CONNECTION

# Solo ENV para valores que NO cambian en runtime
ENV APP_KEY=${APP_KEY}
ENV APP_ENV=${APP_ENV}
ENV APP_DEBUG=${APP_DEBUG}
ENV API_URL=${API_URL}
ENV DB_CONNECTION=${DB_CONNECTION}

# DB credentials se pasarán vía environment en docker-compose (runtime)
# NO usar ENV aquí para permitir valores dinámicos

WORKDIR /var/www/html

# 1) Apache -> /public (solo vhost, sin reemplazos globales)
RUN sed -ri -e 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/000-default.conf \
    && printf '%s\n' \
    '<Directory /var/www/html/public>' \
    '    AllowOverride All' \
    '    Require all granted' \
    '</Directory>' \
    > /etc/apache2/conf-available/laravel.conf \
    && a2enconf laravel

# 2) Composer deps con cache
COPY ./code/api/composer.json ./code/api/composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader --no-scripts

# 3) App code
COPY ./code/api /var/www/html/

# 4) Permisos
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# 5) Descubrir paquetes (ya con artisan presente)
RUN php artisan package:discover --ansi

# 6) Pre-generar claves de Passport y documentación Swagger
RUN php artisan passport:keys --force \
    && php artisan l5:generate

# NOTA: config:cache, route:cache y view:cache se ejecutan en init.sh
# para que usen las variables de entorno reales del runtime
