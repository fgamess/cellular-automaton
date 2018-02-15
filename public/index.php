<?php
/**
 * Created by PhpStorm.
 * User: fgamess
 * Date: 08/02/2018
 * Time: 15:42
 */


$loader = require __DIR__.'/../autoload.php';

?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Franck’s Cellular Automatons</title>
    <link rel="stylesheet" href="../assets/css/app.css">

</head>
    <body>
        <div class="container">
        <h1>Franck's Cellular Automaton</h1>

        <div id="app">
            <h2>Random initial condition</h2>
            <svg id="random-condition" width="400" height="400">

            </svg>
            <div>
                <button onclick="window.location.href='/automaton.php?template=random'">Go</button>
                <br><br>
            </div>
            <h2>Gosper Glider Gun</h2>
            <svg id="gosper-glider-gun" width="400" height="400">

            </svg>
            <div>
                <button onclick="window.location.href='/automaton.php?template=gosper_glider_gun'">Go</button>
                <br><br>
            </div>
            <h2>Glider</h2>
            <svg id="glider" width="400" height="400">

            </svg>
            <div>
                <button onclick="window.location.href='/automaton.php?template=glider'">Go</button>
                <br><br>
            </div>
            <h2>Exploder</h2>
            <svg id="exploder" width="400" height="400">

            </svg>
            <div>
                <button onclick="window.location.href='/automaton.php?template=exploder'">Go</button>
                <br><br>
            </div>
            <h2>Tumbler</h2>
            <svg id="tumbler" width="400" height="400">

            </svg>
            <div>
                <button onclick="window.location.href='/automaton.php?template=tumbler'">Go</button>
                <br><br>
            </div>
            <h2>Lightweight spaceship</h2>
            <svg id="lightweight-spaceship" width="400" height="400">

            </svg>
            <div>
                <button onclick="window.location.href='/automaton.php?template=lightweight_spaceship'">Go</button>
                <br><br>
            </div>
        </div>
    </div>
    <script src="../assets/js/Utils.js"></script>
    <script src="../assets/js/Endpoints.js"></script>
    <script src="../assets/js/GridHelper.js"></script>
    <script src="../assets/js/AjaxHelper.js"></script>
    <script src="../assets/js/app.js"></script>

    </body>
</html>

