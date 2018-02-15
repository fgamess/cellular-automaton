<?php
/**
 * Created by PhpStorm.
 * User: fgamess
 * Date: 13/02/2018
 * Time: 17:52
 */

namespace Api;

use Api\Model\Cell;
use Util\GridHelper;


class Game
{
    /**
     * @var GridHelper
     */
    private $gridHelper;

    /**
     * @var bool
     */
    private $random = true;

    /**
     * @var string
     */
    private $template = NULL;

    /**
     * Game constructor.
     * @param bool $random
     * @param null $template
     * @throws \Exception
     */
    public function __construct(bool $random = true, $template = NULL)
    {
        $this->random = $random;
        $this->template = $template;
        $this->gridHelper = new GridHelper(38, 38);
        $this->gridHelper->generateGrid($random);

        if (!empty($template)) {
            $this->setTemplate($this->template);
        }
    }

    /**
     * @param string $name
     */
    public function setTemplate(string $name)
    {
        $template = $name . '.txt';
        $path = '../../templates/' . $template;

        $file = fopen($path, 'r');

        if ($template == 'glider_gun.txt') {
            // We don't need to center this pattern, we will simply follow the template disposition
            $centerX = 0;
            $centerY = 0;
        } else {
            $centerX = (int) floor($this->gridHelper->getWidth()  / 2) / 2;
            $centerY = (int) floor($this->gridHelper->getHeight() / 2) / 2;
        }

        $x = $centerX;
        $y = $centerY;
        while ($c = fgetc($file)) {
            if ($c == 'O') {
                $this->gridHelper->grid[$y][$x] = new Cell($x, $y, Cell::ALIVE);
            }
            if ($c == "\n") {
                $y++;
                $x = $centerX;
            }
            else {
                $x++;
            }
        }
        fclose($file);
    }

    /**
     * @return array
     * @throws \Exception
     */
    public function getInitialGrid():array
    {
        return $this->gridHelper->grid;
    }

    /**
     * @param string $jsonString
     * @return GridHelper
     */
    public function buildGridFromJson(string $jsonString):GridHelper
    {
        $this->gridHelper->generateGridFromJson($jsonString);

        return $this->gridHelper;
    }

    /**
     * Processes a new generation for all cells.
     *
     * Base on these rules:
     * 1. Any live cell with fewer than two live neighbours dies, as if by needs caused by underpopulation.
     * 2. Any live cell with more than three live neighbours dies, as if by overcrowding.
     * 3. Any live cell with two or three live neighbours lives, unchanged, to the next generation.
     * 4. Any dead cell with exactly three live neighbours will come to life.
     *
     * @return array
     */
    public function generateGridUsingRules():array
    {
        $cells = &$this->gridHelper->grid;
        $kill_queue = $born_queue = [];
        for ($y = 0; $y < $this->gridHelper->getHeight(); $y++) {
            for ($x = 0; $x < $this->gridHelper->getWidth(); $x++) {
                // All cell activity is determined by the neighbor count.
                $neighbor_count = $this->getAliveNeighborCount($x, $y);
                if ($cells[$y][$x]['isAlive'] && ($neighbor_count < 2 || $neighbor_count > 3)) {
                    $kill_queue[] = [$y, $x];
                }
                if (!$cells[$y][$x]['isAlive'] && $neighbor_count === 3) {
                    $born_queue[] = [$y, $x];
                }
            }
        }
        foreach ($kill_queue as $c) {
            $cells[$c[0]][$c[1]]['isAlive'] = 0;
        }
        foreach ($born_queue as $c) {
            $cells[$c[0]][$c[1]]['isAlive'] = 1;
        }

        return $cells;
    }

    /**
     * Gets living neighbors for a cell at given coordinates.
     *
     * @param int $x
     * @param int $y
     *
     * @return int
     *   Returns the number of alive neighbors for this cell.
     */
    private function getAliveNeighborCount($x, $y) {
        $alive_count = 0;
        for ($y2 = $y - 1; $y2 <= $y + 1; $y2++) {
            if ($y2 < 0 || $y2 >= $this->gridHelper->getHeight()) {
                // Out of range.
                continue;
            }
            for ($x2 = $x - 1; $x2 <= $x + 1; $x2++) {
                if ($x2 == $x && $y2 == $y) {
                    // Current cell spot.
                    continue;
                }
                if ($x2 < 0 || $x2 >= $this->gridHelper->getWidth()) {
                    // Out of range.
                    continue;
                }
                if ($this->gridHelper->grid[$y2][$x2]['isAlive']) {
                    $alive_count += 1;
                }
            }
        }
        return $alive_count;
    }
}