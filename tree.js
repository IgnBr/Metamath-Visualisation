const colors = {
  constants: "red",
  variables: "orange",
  floatingHypotheses: "blue",
  axiomaticAssertions: "yellow",
};

treeJSON = d3.json("test.json", function (error, data) {
  const children = [...new Set(data.children)];
  const treeData = children[1];
  var totalNodes = 0;
  var maxLabelLength = 0;

  var i = 0;
  var duration = 750;
  var root;

  var viewerWidth = $(document).width();
  var viewerHeight = $(document).height();

  var tree = d3.layout.tree().size([viewerHeight, viewerWidth]);

  var diagonal = d3.svg.diagonal().projection(function (d) {
    return [d.y, d.x];
  });

  function visit(parent, visitFn, childrenFn) {
    if (!parent) return;

    visitFn(parent);

    var children = childrenFn(parent);
    if (children) {
      var count = children.length;
      for (var i = 0; i < count; i++) {
        visit(children[i], visitFn, childrenFn);
      }
    }
  }

  visit(
    treeData,
    function (d) {
      totalNodes++;
      maxLabelLength = Math.max(d.name.length, maxLabelLength);
    },
    function (d) {
      return d.children && d.children.length > 0 ? d.children : null;
    }
  );

  function zoom() {
    svgGroup.attr(
      "transform",
      "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")"
    );
  }

  var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

  var baseSvg = d3
    .select("#tree-container")
    .append("svg")
    .attr("width", viewerWidth)
    .attr("height", viewerHeight)
    .attr("class", "overlay")
    .call(zoomListener);

  function centerNode(source) {
    scale = zoomListener.scale();
    x = -source.y0;
    y = -source.x0;
    x = x * scale + viewerWidth / 2;
    y = y * scale + viewerHeight / 2;
    d3.select("g")
      .transition()
      .duration(duration)
      .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
    zoomListener.scale(scale);
    zoomListener.translate([x, y]);
  }

  function toggleChildren(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else if (d._children) {
      d.children = d._children;
      d._children = null;
    }
    return d;
  }

  function click(d) {
    if (d3.event.defaultPrevented) return;
    d = toggleChildren(d);
    update(d);
    centerNode(d);
  }

  function textClick(d) {
    if (d3.event.defaultPrevented) return;
    if (d.value) {
      const name = d.name;
      d.name = d.value[0];
      d.value[0] = name;
    }
    update(d);
    centerNode(d);
  }

  function update(source) {
    var levelWidth = [1];
    var childCount = function (level, n) {
      if (n.children && n.children.length > 0) {
        if (levelWidth.length <= level + 1) levelWidth.push(0);

        levelWidth[level + 1] += n.children.length;
        n.children.forEach(function (d) {
          childCount(level + 1, d);
        });
      }
    };
    childCount(0, root);
    var newHeight = d3.max(levelWidth) * 25;
    tree = tree.size([newHeight, viewerWidth]);

    var nodes = tree.nodes(root).reverse(),
      links = tree.links(nodes);

    nodes.forEach(function (d) {
      d.y = d.depth * (maxLabelLength * 10);
    });

    node = svgGroup.selectAll("g.node").data(nodes, function (d) {
      return d.id || (d.id = ++i);
    });

    var nodeEnter = node
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", function (d) {
        return "translate(" + source.y0 + "," + source.x0 + ")";
      });

    nodeEnter
      .append("circle")
      .attr("class", "nodeCircle")
      .attr("r", 0)
      .style("fill", function (d) {
        return d._children ? "lightsteelblue" : "#fff";
      })
      .on("click", click);

    nodeEnter
      .append("text")
      .attr("x", function (d) {
        return d.children || d._children ? -10 : 10;
      })
      .attr("dy", ".35em")
      .attr("class", "nodeText")
      .attr("text-anchor", function (d) {
        return d.children || d._children ? "end" : "start";
      })
      .text(function (d) {
        return d.name;
      })
      .style("fill-opacity", 0)
      .on("click", textClick);

    node
      .select("text")
      .attr("x", function (d) {
        return d.children || d._children ? -10 : 10;
      })
      .attr("text-anchor", function (d) {
        return d.children || d._children ? "end" : "start";
      })
      .text(function (d) {
        return d.name;
      });

    node
      .select("circle.nodeCircle")
      .attr("r", 4.5)
      .style("fill", function (d) {
        return d._children ? "lightsteelblue" : "#fff";
      })
      .style("stroke", function (d) {
        switch (d.group) {
          case "variables":
            return colors.variables;
          case "constants":
            return colors.constants;
          case "floatingHypotheses":
            return colors.floatingHypotheses;
          case "axiomaticAssertions":
            return colors.axiomaticAssertions;
          default:
            return "black";
        }
      });

    var nodeUpdate = node
      .transition()
      .duration(duration)
      .attr("transform", function (d) {
        return "translate(" + d.y + "," + d.x + ")";
      });

    nodeUpdate.select("text").style("fill-opacity", 1);

    var nodeExit = node
      .exit()
      .transition()
      .duration(duration)
      .attr("transform", function (d) {
        return "translate(" + source.y + "," + source.x + ")";
      })
      .remove();

    nodeExit.select("circle").attr("r", 0);

    nodeExit.select("text").style("fill-opacity", 0);

    var link = svgGroup.selectAll("path.link").data(links, function (d) {
      return d.target.id;
    });

    link
      .enter()
      .insert("path", "g")
      .attr("class", "link")
      .attr("d", function (d) {
        var o = {
          x: source.x0,
          y: source.y0,
        };
        return diagonal({
          source: o,
          target: o,
        });
      });

    link.transition().duration(duration).attr("d", diagonal);

    link
      .exit()
      .transition()
      .duration(duration)
      .attr("d", function (d) {
        var o = {
          x: source.x,
          y: source.y,
        };
        return diagonal({
          source: o,
          target: o,
        });
      })
      .remove();

    nodes.forEach(function (d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  var svgGroup = baseSvg.append("g");

  root = treeData;
  root.x0 = viewerHeight / 2;
  root.y0 = 0;

  update(root);
  centerNode(root);
});
