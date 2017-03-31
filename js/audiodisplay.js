function drawBuffer( width, height, context, data ) {
    var step = Math.ceil( data.length / width );
    var amp = height / 2;
    context.fillStyle = "silver";
    context.clearRect(0,0,width,height);
    for(var i=0; i < width; i++){
        var min = 1.0;
        var max = -1.0;
        for (j=0; j<step; j++) {
            var datum = data[(i*step)+j]; 
            if (datum < min)
                min = datum;
            if (datum > max)
                max = datum;
        }
        context.fillRect(i,(1+min)*amp,1,Math.max(1,(max-min)*amp));
    }
}



var parseTime = d3.timeParse("%d-%b-%y");

class D3Plot {
    constructor(){
        console.log("hello")
        var svg = d3.select("svg"),
            margin = {top: 20, right: 20, bottom: 30, left: 50}

        this.width = +svg.attr("width") - margin.left - margin.right
        this.height = +svg.attr("height") - margin.top - margin.bottom
        
        this.g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        

        this.x = d3.scaleTime()
            .rangeRound([0, this.width]);

        this.y = d3.scaleLinear()
            .rangeRound([this.height, 0]);

    }
	





    draw(){

        var self = this;
        var line = d3.line()
            .x(function(d) { return self.x(d.date); })
            .y(function(d) { return self.y(d.close); });

        d3.tsv("data.tsv", function(d) {
          d.date = parseTime(d.date);
          d.close = +d.close;
          return d;
        }, function(error, data) {
          if (error) throw error;

          self.x.domain(d3.extent(data, function(d) { return d.date; }));
          self.y.domain(d3.extent(data, function(d) { return d.close; }));

          self.g.append("g")
              .attr("transform", "translate(0," + self.height + ")")
              .call(d3.axisBottom(self.x))
            .select(".domain")
              .remove();

          self.g.append("g")
              .call(d3.axisLeft(self.y))
            .append("text")
              .attr("fill", "#000")
              .attr("transform", "rotate(-90)")
              .attr("y", 6)
              .attr("dy", "0.71em")
              .attr("text-anchor", "end")
              .text("Price ($)");

          self.g.append("path")
              .datum(data)
              .attr("fill", "none")
              .attr("stroke", "steelblue")
              .attr("stroke-linejoin", "round")
              .attr("stroke-linecap", "round")
              .attr("stroke-width", 1.5)
              .attr("d", line);
        });

    }

} 

var plot = new D3Plot()

plot.draw()



