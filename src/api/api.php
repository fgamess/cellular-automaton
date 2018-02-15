<?php
/**
 * Created by PhpStorm.
 * User: fgamess
 * Date: 10/02/2018
 * Time: 15:26
 */

use Http\Kernel;

$loader = require __DIR__.'/../../autoload.php';

try {
    $httpKernel = new Kernel($_REQUEST);
    $httpKernel->processRoute();
} catch (Exception $e) {
    echo json_encode(Array('error' => $e->getMessage()));
}