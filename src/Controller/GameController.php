<?php
/**
 * Created by PhpStorm.
 * User: fgamess
 * Date: 13/02/2018
 * Time: 22:47
 */

namespace Controller;

use Api\Game;
use Http\Response;

class GameController
{
    const ROUTES = [
        'grid/generate' => 'generateGrid',
        'grid/new-generation' => 'getNextGeneration',
    ];

    public function handleRoute(array $request)
    {
        $route = $request['request'];
        if (array_key_exists($route, self::ROUTES)) {
            if (isset($request['template'])) {
                $template = $request['template'];
                echo $this->{self::ROUTES[$route]}($template);
            } else {
                echo $this->{self::ROUTES[$route]}();
            }
        }

        return new Response("No Endpoint: $route", 404);
    }

    /**
     * @param string $template
     * @return Response
     * @throws \Exception
     */
    public function generateGrid(string $template)
    {
        $random = $template == 'random';
        $template = $random ? NULL : $template;

        $game = new Game($random, $template);
        $grid = $game->getInitialGrid();
        $response = new Response(json_encode($grid), 200);

        return $response;
    }

    public function gosperGliderGun()
    {
        $game = new Game(false, 'glider_gun');
        $grid = $game->getInitialGrid();
        $response = new Response(json_encode($grid), 200);

        return $response;
    }

    public function getNextGeneration()
    {
        $game = new Game();
        $game->buildGridFromJson($_POST['json_grid']);
        $newGenerationGrid = $game->generateGridUsingRules();
        $response = new Response(json_encode($newGenerationGrid), 200);

        return $response;
    }

}