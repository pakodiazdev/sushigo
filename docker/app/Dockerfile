FROM php:8.2-apache

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

# Install Docker CLI
RUN install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli docker-compose-plugin \
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
COPY docker/app/config/dev/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy initialization script
COPY docker/app/config/dev/init.sh /usr/local/bin/init.sh
RUN chmod +x /usr/local/bin/init.sh

# Set working directory
WORKDIR /app/code

# Expose port 80
EXPOSE 80

# Start initialization script
CMD ["/usr/local/bin/init.sh"]
