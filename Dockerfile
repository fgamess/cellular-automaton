FROM php:7.2-apache

RUN apt-get update \
    && apt-get install -y \
    git \
    --no-install-recommends

#Add composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN composer --version

RUN a2enmod rewrite

