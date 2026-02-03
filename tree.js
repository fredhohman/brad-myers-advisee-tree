var margin = {top: 20, right: 120, bottom: 20, left: 140},
    width = 1900 - margin.right - margin.left,
    height = 3600 - margin.top - margin.bottom;

var i = 0,
    duration = 1500,
    pause = 800,
    buttonTransTime = 1000,
    root,
    playing = false;

var buttonColor = '#845fb4',
    buttonBackgroundColor = '#ffffff';

var tree = d3.tree()
    .size([height, width]);

var svg = d3.select("#tree").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var stratify = d3.stratify()
  .id(function(d) {
    return d.id; //This position
  })
  .parentId(function(d) {
    return d.parent_id; //What position this position reports to
  });

function collapse(d) {
  if (d.children) {
      d._children = d.children;

    d._children.forEach(collapse);
    d.children = null;
  }
}

var nodeColor = "#845fb4";
var nodeColorNoChildren = "#ffffff";
var NodeStrokeColor = "#542988";

// var nodeColor = "#ffffff";
// var nodeColorNoChildren = "#ffffff";
// var NodeStrokeColor = "#cccccc";

function reverseData(rootNode) {
  if (rootNode.children) {
    rootNode.children.reverse();
    rootNode.children.forEach(function(node) {
      reverseData(node);
    });
  }
  if (rootNode._children) {
    rootNode._children.reverse();
    rootNode._children.forEach(function(node) {
      reverseData(node);
    });
  }
}

d3.csv("data.csv", function(error, data) {

  root = stratify(data);

  root.each(function(d) {

      d.name = d.id; //transferring name to a name variable
      d.id = i; //Assigning numerical Ids
      i++;

    });

  root.x0 = height / 2;
  root.y0 = 0;

  reverseData(root);
  // root.children.forEach(collapse);
  
  gen1();
  update(root);
  play();

});

d3.select(self.frameElement).style("height", "800px");

function update(source) {

  // Force interrupt?
  d3.selectAll('.node').interrupt().selectAll("*").interrupt();

  // Compute the new tree layout.
  var nodes = tree(root).descendants(),
      links = nodes.slice(1);

  // Normalize for fixed-depth.
  nodes.forEach(function(d) { d.y = d.depth * 260; }); //100 for ribbon, 210 for print out and slides

  // Update the nodes…
  var node = svg.selectAll("g.node")
      .data(nodes, function(d) { return d.id || (d.id = ++i); });

  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
      .on("click", click);

  nodeEnter.append("circle")
      .attr("r", 1e-6)
      .style("fill", nodeColor);

  nodeEnter.append("a")
      // .attr("title", function(d) { return d.name; })
      .append("text")
      .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
      .attr("dy", ".35em")
      .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
      .text(function(d) { return d.data.name; })
      .style("fill-opacity", 1e-6)
      .style("font-size", function(d) {
        if (d.depth === 1 || d.depth === 0) {
          return "14px";
        }
      });

  // Transition nodes to their new position.
  var nodeUpdate = node.merge(nodeEnter)
      .transition().duration(duration)
      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
      .on('end', function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
      });

  nodeUpdate.select("circle")
      .attr("r", 4.25) //2.5 for ribbon
      .style("fill", nodeColor)
      .style("stroke", function(d) { return d._children ? NodeStrokeColor : nodeColorNoChildren; })
      .style("stroke-width", function(d) { return d._children ? "4" : "0"; });

  nodeUpdate.select("text")
      .style("fill-opacity", 1);

  // Transition exiting nodes to the parent's new position.
  var nodeExit = node.exit().interrupt().transition()
      .duration(duration)
      // .attr("fill", "#ffffff")
      .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
      .remove();

  nodeExit.select("circle")
      .attr("r", 1e-6);

  nodeExit.select("text")
      .style("fill-opacity", 1e-6);

  // Update the links…
  var link = svg.selectAll("path.link")
      .data(links, function(link) { var id = link.id + '->' + link.parent.id; return id; });

  // Transition links to their new position.
  link.transition().duration(duration)
    .attr("d", connector);

  // Enter any new links at the parent's previous position.
  var linkEnter = link.enter().insert("path", "g")
                        .attr("class", "link")
                        .attr("d", function(d) {
        var o = {x: source.x0, y: source.y0, parent:{x: source.x0, y: source.y0}};
        return connector(o);
      });

  // Transition links to their new position.
  link.merge(linkEnter).interrupt().transition()
      .duration(duration)
      .attr("d", connector);


  // Transition exiting nodes to the parent's new position.
  link.exit().interrupt().transition()
      .duration(duration)
      .attr("d",  function(d) {
        var o = {x: source.x, y: source.y, parent:{x: source.x, y: source.y}};
        return connector(o);
      })
      .remove();

  // Stash the old positions for transition. 
  // This has been moved up!
  // nodes.forEach(function(d) {
  //   d.x0 = d.x;
  //   d.y0 = d.y;
  // });

}

// Toggle children on click.
function click(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
  update(d);
}

// replaces d3 v3 diagonal
function connector(d) {
  return "M" + d.y + "," + d.x +
    "C" + (d.y + d.parent.y) / 2 + "," + d.x +
    " " + (d.y + d.parent.y) / 2 + "," + d.parent.x +
    " " + d.parent.y + "," + d.parent.x;
}

function expand(nod){
  if (nod._children) {
      nod.children = nod._children;
      nod._children = null;
  }
}

function showDepthN(cur_node, n){
  if (cur_node.children) {
    if (cur_node.depth < n) {
      // expand(cur_node);
      cur_node.children.forEach(function(d) {
        showDepthN(d, n);
      });
    } else {
      collapse(cur_node);
    }
    update(cur_node);
  } else {

    if (cur_node.depth < n) {
      expand(cur_node);
      if(cur_node.children) {
        update(cur_node);
        cur_node.children.forEach(function(d) {
        showDepthN(d, n);
        });
      }
    }
  }
}

function changeFontSizeGen1() {
  d3.selectAll('.node text').style('font-size', function(d) {
    switch (d.depth) {
      case 0:
        return '20px';
      default:
        return '12px';
    }
  });
}

function changeFontSizeGen2() {
  d3.selectAll('.node text').style('font-size', function(d) {
    switch (d.depth) {
      case 0:
        return '20px';
      case 1:
        return '18px';
      default:
        return '12px';
    }
  });
}

function changeFontSizeGen3() {
  d3.selectAll('.node text').style('font-size', function(d) {
    switch (d.depth) {
      case 0:
        return '20px';
      case 1:
        return '18px';
      case 2:
        return '16px';
      default:
        return '12px';
    }
  });
}

function changeFontSizeGen4() {
  d3.selectAll('.node text').style('font-size', function(d) {
    switch (d.depth) {
      case 0:
        return '20px';
      case 1:
        return '12px';
      case 2:
        return '12px';
      case 3:
        return '12px';
      default:
        return '12px';
    }
  });
}

function changeFontSizeGen5() {
  d3.selectAll('.node text').style('font-size', function(d) {
    switch (d.depth) {
      case 0:
        return '20px';
      case 1:
        return '12px';
      case 2:
        return '12px';
      case 3:
        return '12px';
      case 4:
        return '12px';
      default:
        return '12px';
    }
  });
}

function changeFontSizeGen6() {
  d3.selectAll('.node text').style('font-size', function(d) {
    switch (d.depth) {
      case 0:
        return '20px';
      case 1:
        return '12px';
      case 2:
        return '12px';
      case 3:
        return '12px';
      case 4:
        return '12px';
      case 5:
        return '12px';
      default:
        return '12px';
    }
  });
}

function changeFontSizeGen7() {
  d3.selectAll('.node text').style('font-size', function(d) {
    switch (d.depth) {
      case 0:
        return '20px';
      case 1:
        return '12px';
      case 2:
        return '12px';
      case 3:
        return '12px';
      case 4:
        return '12px';
      case 5:
        return '12px';
      default:
        return '12px';
    }
  });
}

function gen1() {
  showDepthN(root, 0);
  changeFontSizeGen1();

  d3.selectAll('button').transition().duration(buttonTransTime)
                        .style('background-color', buttonBackgroundColor)
                        .style('color', buttonColor);
  d3.select('#gen1button').transition().duration(buttonTransTime)
                          .style('background-color', buttonColor)
                          .style('color', buttonBackgroundColor);
}

function gen2() {
  showDepthN(root, 1);
  changeFontSizeGen2();

  d3.selectAll('button').transition().duration(buttonTransTime)
                        .style('background-color', buttonBackgroundColor)
                        .style('color', buttonColor);
  d3.select('#gen2button').transition().duration(buttonTransTime)
                          .style('background-color', buttonColor)
                          .style('color', buttonBackgroundColor);
}

function gen3() {
  showDepthN(root, 2);
  changeFontSizeGen3();

  d3.selectAll('button').transition().duration(buttonTransTime)
                        .style('background-color', buttonBackgroundColor)
                        .style('color', buttonColor);
  d3.select('#gen3button').transition().duration(buttonTransTime)
                          .style('background-color', buttonColor)
                          .style('color', buttonBackgroundColor);
}

function gen4() {
  showDepthN(root, 3);
  changeFontSizeGen4();

  d3.selectAll('button').transition().duration(buttonTransTime)
                        .style('background-color', buttonBackgroundColor)
                        .style('color', buttonColor);
  d3.select('#gen4button').transition().duration(buttonTransTime)
                          .style('background-color', buttonColor)
                          .style('color', buttonBackgroundColor);
}

function gen5() {
  showDepthN(root, 4);
  changeFontSizeGen5();

  d3.selectAll('button').transition().duration(buttonTransTime)
                        .style('background-color', buttonBackgroundColor)
                        .style('color', buttonColor);
  d3.select('#gen5button').transition().duration(buttonTransTime)
                          .style('background-color', buttonColor)
                          .style('color', buttonBackgroundColor);
}

function gen6() {
  showDepthN(root, 5);
  changeFontSizeGen6();

  d3.selectAll('button').transition().duration(buttonTransTime)
                        .style('background-color', buttonBackgroundColor)
                        .style('color', buttonColor);
  d3.select('#gen6button').transition().duration(buttonTransTime)
                          .style('background-color', buttonColor)
                          .style('color', buttonBackgroundColor);
}

function gen7() {
  showDepthN(root, 6);
  changeFontSizeGen7();

  d3.selectAll('button').transition().duration(buttonTransTime)
                        .style('background-color', buttonBackgroundColor)
                        .style('color', buttonColor);
  d3.select('#gen7button').transition().duration(buttonTransTime)
                          .style('background-color', buttonColor)
                          .style('color', buttonBackgroundColor);
}

function play() {
  if (!playing){

    playing = true;
    
    gen1();

    setTimeout(function(){
        gen2();
    }, duration + pause);

    setTimeout(function(){
        gen3();
    }, (duration + pause)*2);

    setTimeout(function(){
        gen4();
    }, (duration + pause)*3);

    setTimeout(function(){
        gen5();
    }, (duration + pause)*4);

    setTimeout(function(){
        gen6();
    }, (duration + pause)*5);

    setTimeout(function(){
      gen7();

      playing = false;
    }, (duration + pause)*6);

  }
}