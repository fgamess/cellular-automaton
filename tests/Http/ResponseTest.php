<?php
/**
 * Created by PhpStorm.
 * User: fgamess
 * Date: 16/02/2018
 * Time: 03:17
 */

namespace Tests\Http;

use Http\Response as SUT;
use Http\Response;
use PHPUnit\Framework\TestCase;

class ResponseTest extends TestCase
{
    /**
     * @var SUT
     */
    public $sut;

    public function setUp()
    {
        $this->sut = new SUT('test content', 200);
    }

    public function test__toString()
    {
        $this->assertEquals($this->sut->getContent(), (string)$this->sut);
    }

    public function testGetRequestStatus()
    {
        $this->assertEquals('OK', Response::getRequestStatus(200));
    }
}
