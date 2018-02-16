<?php
/**
 * Created by PhpStorm.
 * User: fgamess
 * Date: 10/02/2018
 * Time: 15:56
 */

namespace Model;

interface CellInterface
{
    /**
     * @return int
     */
    public function getCoordinateX():int;

    /**
     * @return int
     */
    public function getCoordinateY():int;

    /**
     * @return bool
     */
    public function getIsAlive():bool;
}