# Cellular Automaton (Conway's game of life) PHP/Javascript
[![Build Status](https://travis-ci.org/fgamess/cellular-automaton.svg?branch=master)](https://travis-ci.org/fgamess/cellular-automaton)

Multiple cellular automatons (Conway's Game of Life) written in PHP and displayed with html/javascript (ES6)

## Table of contents
- [Prerequisites](https://github.com/fgamess/cellular-automatond#prerequisites)
  - [Tools required](https://github.com/fgamess/file-consumer-command#tools-required)
  - [Set up the docker stack](https://github.com/fgamess/cellular-automaton#set-up-the-docker-stack)
  - [Setting www-data as owner of the files](https://github.com/fgamess/cellular-automaton#setting-www-data-as-owner-of-the-files)
  - [Install the vendors](https://github.com/fgamess/cellular-automaton#install-the-vendors)
- [How to use](https://github.com/fgamess/cellular-automaton#how-to-use)
  - [Going to the index page](https://github.com/fgamess/cellular-automaton#going-to-index-page)
- [Testing](https://github.com/fgamess/cellular-automaton#testing)
  - [Run the tests](https://github.com/fgamess/cellular-automaton#run-the-tests)


Prerequisites
-------------

###### Tools required

In order to use the docker stack provided:
- Docker CE for Windows, Docker CE for Linux or Docker CE for MAC installed
- Docker Compose installed

Or you can use your own Apache server but:
- don’t forget to enable **rewrite** mod.
- you must have **composer** and **git** installed

###### Set up the docker stack

Install and start the Docker stack.

The docker stack is composed by only one container : php7.2 with apache. All the configuration is done.

Using Docker CE :

    docker-compose build
then

    docker-compose up -d

You only need this command. It will start the container (php7.2/apache).

###### Setting www-data as owner of the files.

Set www-data user and group as owner of the files inside the project. Connect to the php container with the root user using this command

    docker exec -it cellular_automaton_php bash
When you are in the bash run

    chown -R www-data:www-data .
Exit from the bash

    exit

###### Install the vendors

Connect to the php container with the www-data user:

    docker exec -itu www-data cellular_automaton_php composer install


How to use
----------

###### Going to the index page

If you use the docker stack:

    http://localhost:14300/index.php

If you use your own apache server with your own configured virtual host:

    http://<your host>:<port>/index.php
    
Then you will have some Game of life patterns displayed at their initial state.
If you choose one, you will be redirect on a new page displaying the 100 first iterations for this pattern. 

Testing
-------

###### Run the tests

Just run:

    vendor/bin/phpunit tests