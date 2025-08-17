import * as d3 from 'd3';
import type { GeoProjection } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry, Polygon } from 'geojson';


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

export function createNYCProjection(
  width: number,
  height: number
): GeoProjection {
  const bboxFeature: Feature<Polygon> = {
    type: 'Feature',
    properties: {}, 
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-74.25, 40.5],
        [-73.7,  40.5],
        [-73.7,  40.9],
        [-74.25, 40.9],
        [-74.25, 40.5]
      ]]
    }
  };

  const geoCollection: FeatureCollection<Polygon> = {
    type: 'FeatureCollection',
    features: [bboxFeature]
  };

  const projection = d3.geoMercator();
  projection.fitSize([width, height], geoCollection);

  return projection;
}