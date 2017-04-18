var margin = {top: 20, right: 120, bottom: 20, left: 120},
    width = 1600 - margin.right - margin.left,
    height = 1200 - margin.top - margin.bottom;

var i = 0,
    duration = 750,
    root;

var tree = d3.tree()
    .size([height, width]);

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var stratify = d3.stratify()
  .id(function(d) {
    return d.name;//This position
  })
  .parentId(function(d) {
    return d.parent; //What position this position reports to
  });

function collapse(d) {
  if (d.children) {
    d._children = d.children;
    d._children.forEach(collapse);
    d.children = null;
  }
};

d3.csv("brad-test-after-clean.csv", function(error, data) {
  
  root = stratify(data);

  root.each(function(d) {
    
      d.name = d.id; //transferring name to a name variable
      d.id = i; //Assigning numerical Ids
      i++;
    
    });

  root.x0 = height / 2;
  root.y0 = 0;
  
  root.children.forEach(collapse);
  update(root);
});

d3.select(self.frameElement).style("height", "800px");

function update(source) {

  // Compute the new tree layout.
  var nodes = tree(root).descendants(),
      links = nodes.slice(1);

  // Normalize for fixed-depth.
  nodes.forEach(function(d) { d.y = d.depth * 100; });

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
      .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

  nodeEnter.append("a")
      .attr("href", function(d) { return d.data.img; })
      .append("text")
      .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
      .attr("dy", ".35em")
      .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
      .text(function(d) { return d.name; })
      .style("fill-opacity", 1e-6)
      .style("font-size", "14px");

  // Transition nodes to their new position.
  var nodeUpdate = node.merge(nodeEnter).transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

  nodeUpdate.select("circle")
      .attr("r", 2.5) //4.5
      .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

  nodeUpdate.select("text")
      .style("fill-opacity", 1);

  // Transition exiting nodes to the parent's new position.
  var nodeExit = node.exit().transition()
      .duration(duration)
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
  link.transition()
      .duration(duration)
      .attr("d", connector);

  // Enter any new links at the parent's previous position.
  var linkEnter = link.enter().insert("path", "g")
                        .attr("class", "link")
                        .attr("d", function(d) {
        var o = {x: source.x0, y: source.y0, parent:{x: source.x0, y: source.y0}};
        return connector(o);
      });

  // Transition links to their new position.
  link.merge(linkEnter).transition()
      .duration(duration)
      .attr("d", connector);

  // Transition exiting nodes to the parent's new position.
  link.exit().transition()
      .duration(duration)
      .attr("d",  function(d) {
        var o = {x: source.x, y: source.y, parent:{x: source.x, y: source.y}};
        return connector(o);
      })
      .remove();

  // Stash the old positions for transition.
  nodes.forEach(function(d) {
    d.x0 = d.x;
    d.y0 = d.y;
  });
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


//TESTS
function expand(d){   
    var children = (d.children)?d.children:d._children;
    if (d._children) {        
        d.children = d._children;
        d._children = null;       
    }
    if(children)
      children.forEach(expand);
}

function expandAll(){
    expand(root); 
    update(root);
}

function collapseAll(){
    root.children.forEach(collapse);
    collapse(root);
    update(root);
}
