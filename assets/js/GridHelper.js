function GridHelper(height, width, squareDimensions) {

    this.createHtmlGrid = function (jsonObject, svgId) {
        let grid = Object.keys(jsonObject).map(function(k) { return jsonObject[k] });
        let svg = document.getElementById(svgId);

        for (let coordinateX = 0; coordinateX < height; coordinateX++){
            for (let coordinateY = 0; coordinateY < width; coordinateY++){
                let currentXArray = [];
                currentXArray['x'] = coordinateX;
                currentXArray['y'] = coordinateY;
                let isAlive = grid[coordinateY][coordinateX]['isAlive'];

                let cell = document.createElementNS("http://www.w3.org/2000/svg","rect"); //to create a circle. for rectangle use "rectangle"
                cell.setAttributeNS(null,"class","rect");
                cell.setAttributeNS(null,"x",coordinateX * squareDimensions);
                cell.setAttributeNS(null,"y",coordinateY * squareDimensions);
                cell.setAttributeNS(null,"width",squareDimensions);
                cell.setAttributeNS(null,"height",squareDimensions);
                cell.setAttributeNS(null,"stroke","black");
                cell.setAttributeNS(null,"fill", isAlive == true ? "black" : "transparent");

                svg.appendChild(cell);
            }
        }
    };

    this.resetHtmlGrid = function (svg) {
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
    };
}