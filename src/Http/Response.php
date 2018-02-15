<?php
/**
 * Created by PhpStorm.
 * User: fgamess
 * Date: 13/02/2018
 * Time: 23:14
 */

namespace Http;


class Response
{
    private $content;

    /**
     * @var string
     */
    private $version = '1.1';

    /**
     * @var string
     */
    private $statusCode;

    public function __construct($content, $statusCode)
    {
        $this->content = $content;
        $this->statusCode = $statusCode;
    }

    /**
     * Returns the Response as an HTTP string.
     *
     * @return string The Response as an HTTP string
     *
     */
    public function __toString():string
    {
        $header = sprintf('HTTP/%s %s %s', $this->version, $this->statusCode, $this->getRequestStatus($this->statusCode));
        header($header);

        return $this->getContent();
    }

    /**
     * Sets the response content.
     *
     * @param mixed $content Content that can be cast to string
     *
     * @return $this
     *
     * @throws \UnexpectedValueException
     */
    public function setContent($content)
    {
        $this->content = (string) $content;

        return $this;
    }

    /**
     * Gets the current response content.
     *
     * @return string Content
     */
    public function getContent()
    {
        return $this->content;
    }

    /**
     * @param int $code
     * @return string
     */
    static function getRequestStatus(int $code):string
    {
        $status = array(
            200 => 'OK',
            404 => 'Not Found',
            405 => 'Method Not Allowed',
            500 => 'Internal Server Error',
        );
        return ($status[$code])?$status[$code]:$status[500];
    }

}