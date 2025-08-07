import * as d3 from 'd3';

export function createProjection(width: number, height: number) {
  return d3.geoMercator()
    .center([-73.9772, 40.7527])
    .scale(55000)
    .translate([width / 2, height / 2]);
}

export function projectCoordinates(lng: number, lat: number, projection: d3.GeoProjection) {
  const [x, y] = projection([lng, lat]) || [0,0];
  return { x, y };
}
