<?php
/**
 * Created by PhpStorm.
 * User: fgamess
 * Date: 10/02/2018
 * Time: 20:05
 */

namespace Util;

use Model\Cell;

class GridHelper
{
    /**
     * @var int
     */
    private $width;

    /**
     * @var int
     */
    private $height;

    /**
     * @var array
     */
    public $grid = [];

    public function __construct(int $width, int $height)
    {
        $this->width = $width;
        $this->height = $height;
    }

    /**
     * @return int
     */
    public function getWidth():int
    {
        return $this->width;
    }

    /**
     * @return int
     */
    public function getHeight():int
    {
        return $this->height;
    }

    /**
     * @param bool $randomize
     * @return GridHelper
     * @throws \Exception
     */
    public function generateGrid(bool $randomize):GridHelper
    {
        for ($coordinateX = 0; $coordinateX < $this->width; $coordinateX++) {
            for ($coordinateY = 0; $coordinateY < $this->height; $coordinateY++) {
                if ($randomize) {
                    $this->grid[$coordinateY][$coordinateX] = new Cell($coordinateX, $coordinateY, $this->getRandomState());
                } else {
                    $this->grid[$coordinateY][$coordinateX] = new Cell($coordinateX, $coordinateY, Cell::DEAD);
                }
            }
        }

        return $this;
    }

    /**
     * Generate grid from json received by POST ajax request
     *
     * @param string $json
     */
    public function generateGridFromJson(string $json)
    {
        $this->grid = json_decode($json, true);
    }


    /**
     * @return bool
     * @throws \Exception
     */
    public function getRandomState():bool
    {
        return random_int(Cell::DEAD, 5)  === 0;
    }
}