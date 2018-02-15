<?php
/**
 * Created by PhpStorm.
 * User: fgamess
 * Date: 10/02/2018
 * Time: 19:50
 */

namespace Http;

use Api\Game;
use Controller\GameController;

class Kernel
{
    /**
     * Property: method
     * The HTTP method this request was made in, either GET, POST, PUT or DELETE
     */
    protected $method = '';

    /**
     * Property : request
     * Contains $_POST. Basically an array
     * @var array
     */
    protected $request;

    /**
     * @var mixed
     */
    protected $controller;

    /**
     * Constructor: __construct
     * Allow for CORS, assemble and pre-process the data
     *
     * @param array $request
     */
    public function __construct(array $request)
    {
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: *");
        header("Content-Type: application/json");

        $this->method = $_SERVER['REQUEST_METHOD'];

        $this->controller = new GameController();


        switch($this->method) {
            case 'GET':
                $this->request = $this->cleanInputs($request);
                break;
            case 'POST':
                $this->request = $request;
                break;
            default:
                echo new Response('Invalid Method', 405);
                break;
        }
    }

    /**
     * Build response based on given data.
     * Base behavior : if you choose to use method name as endpoints, check if
     * the method corresponding to the endpoint exist
     */
    public function processRoute()
    {
        $this->controller->handleRoute($this->request);
    }

    /**
     * @param $data
     * @return array|string
     */
    private function cleanInputs($data)
    {
        $cleanInput = Array();
        if (is_array($data)) {
            foreach ($data as $k => $v) {
                $cleanInput[$k] = $this->cleanInputs($v);
            }
        } else {
            $cleanInput = trim(strip_tags($data));
        }
        return $cleanInput;
    }
}