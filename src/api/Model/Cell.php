<?php
/**
 * Created by PhpStorm.
 * User: fgamess
 * Date: 10/02/2018
 * Time: 15:55
 */

namespace Api\Model;

class Cell implements CellInterface, \JsonSerializable
{
    const DEAD = 0;
    const ALIVE = 1;

    /**
     * @var int
     */
    private $coordinateX;

    /**
     * @var int
     */
    private $coordinateY;

    /**
     * @var bool
     */
    private $isAlive;

    /**
     * Cell constructor.
     * @param int $coordinateX
     * @param int $coordinateY
     * @param bool $isAlive
     * @param bool $isPartOfStillLifes
     */
    public function __construct(int $coordinateX, int $coordinateY, bool $isAlive)
    {
        $this->coordinateX = $coordinateX;
        $this->coordinateY = $coordinateY;
        $this->isAlive = $isAlive;
    }

    /**
     * @return mixed|object
     */
    public function jsonSerialize()
    {
        return (object) get_object_vars($this);
    }

    /**
     * @return int
     */
    public function getCoordinateX():int
    {
        return $this->coordinateX;
    }

    /**
     * @return int
     */
    public function getCoordinateY():int
    {
        return $this->coordinateY;
    }

    /**
     * @return bool
     */
    public function getIsAlive():bool
    {
        return $this->isAlive;
    }

    /**
     * @param bool $isAlive
     * @return CellInterface
     */
    public function setIsAlive(bool $isAlive):CellInterface
    {
        $this->isAlive = $isAlive;

        return $this;
    }
}