<?php
/**
 * Created by PhpStorm.
 * User: fgamess
 * Date: 16/02/2018
 * Time: 02:49
 */

namespace Tests\Util;

use PHPUnit\Framework\TestCase;
use Util\GridHelper as SUT;

class GridHelperTest extends TestCase
{
    /**
     * @var SUT
     */
    public $sut;

    public function setUp()
    {
        $this->sut = new SUT(10, 10);
    }

    public function testGetWidth()
    {
        $this->assertEquals(10, $this->sut->getWidth());
    }

    public function testGetHeight()
    {
        $this->assertEquals(10, $this->sut->getHeight());
    }

    public function testGenerateGrid()
    {
        $this->sut->generateGrid(false);
        $this->assertInternalType('array', $this->sut->grid);
        $this->assertEquals($this->sut->getHeight(), count($this->sut->grid));
        $this->assertEquals($this->sut->getWidth(), count($this->sut->grid[0]));
        $this->sut->generateGrid(true);
        $this->assertInternalType('array', $this->sut->grid);
    }

    public function testGenerateGridFromJson()
    {
        $this->sut->generateGridFromJson('{ "test1": "test value 1", "test2": "test value 2" }');
        $this->assertInternalType('array', $this->sut->grid);
        $this->assertArrayHasKey('test1', $this->sut->grid);
        $this->assertEquals('test value 1', $this->sut->grid['test1']);
    }

    public function testGetRandomState()
    {
        $this->assertInternalType('bool', $this->sut->getRandomState());
    }
}
