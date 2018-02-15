<?php
/**
 * Created by PhpStorm.
 * User: fgamess
 * Date: 15/02/2018
 * Time: 18:36
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
        <svg id="grid" width="800" height="800">

        </svg>
        <div id="generations"></div>
        <div>
            <button onclick="window.location.href='/index.php'">Come back</button>
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


