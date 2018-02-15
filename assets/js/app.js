let endpoints = new Endpoints();


if (window.location.pathname == '/index.php') {
    let gridHelper = new GridHelper(38, 38, 10, 10);
    let ajaxHelper = new AjaxHelper(endpoints, gridHelper);

    ajaxHelper.initialCalls.forEach(function(element) {
        var promise = ajaxHelper.asyncCall('getInitialJsonGrid', element.url);
        promise.then((result) => {
            gridHelper.createHtmlGrid(createJsonObject(result), element.html_id);
        })
    })
} else {
    let gridHelper = new GridHelper(38, 38, 20, 20);
    let ajaxHelper = new AjaxHelper(endpoints, gridHelper);
    let svgId = 'grid';
    let template = getParameterByName('template');
    let currentJson = '';
    var promise = ajaxHelper.asyncCall('getInitialJsonGrid', endpoints.templates[template]);
    promise.then((result) => {
        gridHelper.createHtmlGrid(createJsonObject(result), svgId);
        currentJson = result;
        ajaxHelper.poll(
            async function() {
                let resultJson = await ajaxHelper.asyncCall(
                    'getNewGenerationJsonGrid',
                    endpoints.newGeneration,
                    currentJson
                );
                currentJson = resultJson;
                return resultJson;
            },
            svgId
        )
    })
}

