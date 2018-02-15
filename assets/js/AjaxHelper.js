function AjaxHelper (endpoints, gridHelper) {
    this.host = 'http://localhost:'+window.location.port;

    this.getInitialJsonGrid = (url, paramToSend = '') =>
    {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            xhr.onload = () => resolve(getJsonResponse());
            xhr.onerror = () => reject(xhr.statusText);
            xhr.send(paramToSend);

            function getJsonResponse() {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        return xhr.responseText;
                    }
                }
            }
        });
    };

    this.getNewGenerationJsonGrid = (urlNextGeneration, paramToSend) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", urlNextGeneration);
            xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xhr.onload = () => resolve(getJsonResponse());
            xhr.onerror = () => reject(xhr.statusText);
            xhr.send('json_grid='+paramToSend);

            function getJsonResponse() {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        gridHelper.createHtmlGrid(createJsonObject(xhr.responseText), 'grid');
                        return xhr.responseText;
                    }
                }
            }
        });
    };

    this.asyncCall =  async function (funcName, url, paramToSend = '') {
        let resultJson = await this[funcName](url, paramToSend);
        return resultJson;
    };

    this.poll = function (fn, svgId, interval) {
        interval = interval || 50;
        let iterations = 0;

        var checkCondition = function(resolve, reject) {
            var ajax = fn();
            // dive into the ajax promise
            ajax.then( function(response){

                // If the condition is met, we're done!
                if(response && iterations <= 100) {
                    let svg = document.getElementById(svgId);
                    gridHelper.resetHtmlGrid(svg);
                    gridHelper.createHtmlGrid(createJsonObject(response), svgId);
                    let generationsDiv = document.getElementById('generations');
                    generationsDiv.innerText = '';
                    generationsDiv.innerText = 'Generations: '+iterations;
                    //console.log('count '+ iterations)
                    iterations++;
                    setTimeout(checkCondition, interval, resolve, reject);
                }
                // If the condition isn't met but the timeout hasn't elapsed, go again
                else if (iterations <= 100) {
                    setTimeout(checkCondition, interval, resolve, reject);
                }
                // Didn't match and too much time, reject!
                else {
                    reject(new Error('timed out for ' + fn + ': ' + arguments));
                }
            });
        };

        return new Promise(checkCondition);
    };

    this.initialCalls = [
        {
            url : this.host+endpoints.templates.random,
            html_id: 'random-condition'
        },
        {
            url : this.host+endpoints.templates.gosper_glider_gun,
            html_id: 'gosper-glider-gun'
        },
        {
            url : this.host+endpoints.templates.glider,
            html_id: 'glider'
        },
        {
            url : this.host+endpoints.templates.exploder,
            html_id: 'exploder'
        },
        {
            url : this.host+endpoints.templates.tumbler,
            html_id: 'tumbler'
        },
        {
            url : this.host+endpoints.templates.lightweight_spaceship,
            html_id: 'lightweight-spaceship'
        },

    ];
}