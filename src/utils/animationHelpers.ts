import * as d3 from 'd3';

export function animateStationEntry(selection: d3.Selection<SVGCircleElement, any, any, any>) {
  selection.attr('opacity', 0).transition().duration(800).attr('opacity', 1);
}

export function animateFlowEntry(selection: d3.Selection<SVGLineElement, any, any, any>) {
  selection.attr('opacity', 0).transition().delay((_,i) => i*15).duration(700).attr('opacity', 0.75);
}

export function pulseAnimation(selection: d3.Selection<any, any, any, any>) {
  selection.transition().duration(160).attr('r', d => d.radius * 1.18)
    .transition().duration(160).attr('r', d => d.radius);
}
