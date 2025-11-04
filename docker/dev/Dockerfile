FROM php:8.2-apache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libzip-dev \
    libpq-dev \
    postgresql-client \
    supervisor \
    && docker-php-ext-install zip pdo pdo_pgsql pgsql \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Install Laravel CLI
RUN composer global require laravel/installer \
    && echo 'export PATH="$HOME/.composer/vendor/bin:$PATH"' >> ~/.bashrc

ENV PATH="/root/.composer/vendor/bin:${PATH}"

# Install Yarn
RUN npm install -g yarn

# Enable Apache modules
RUN a2enmod rewrite headers

# Copy Supervisor configuration
COPY docker/dev/config/dev/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy initialization script
COPY docker/dev/config/dev/init.sh /usr/local/bin/init.sh
RUN chmod +x /usr/local/bin/init.sh

# Set working directory
WORKDIR /app/code

# Expose port
EXPOSE 80

# Start initialization script
CMD ["/usr/local/bin/init.sh"]
