import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { hexbin as d3Hexbin } from 'd3-hexbin';
import type { Station } from '@/types/citibike';
import type { Feature, FeatureCollection, Point, GeoJsonProperties } from 'geojson';

interface HeatmapLayerProps {
  stations: Station[];
  width: number;
  height: number;
  onStationSelect?: (station: Station) => void;
  boroughGeo?: FeatureCollection | null;
}

type ProjectedStation = Station & { x: number; y: number };

const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ stations, width, height, onStationSelect }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredStation, setHoveredStation] = useState<ProjectedStation | null>(null);
  const [boroughGeo, setBoroughGeo] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (!stations.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const stationFeatures: Feature<Point, GeoJsonProperties>[] = stations.map(s => ({
      type: "Feature",
      properties: {}, 
      geometry: {
        type: "Point",
        coordinates: [s.lng, s.lat]
      }
    }));

    const combinedFeatures: Feature[] = [
      ...(boroughGeo?.features ?? []),
      ...stationFeatures
    ];

    const featureCollection: FeatureCollection = {
      type: "FeatureCollection",
      features: combinedFeatures,
    };

    const projection = d3.geoMercator()
      .fitExtent(
        [[80, 80], [width - 80, height - 80]], // Generous padding
        {
          type: "FeatureCollection",
          features: combinedFeatures
        }
      );

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#fff');

    const projectedStations: ProjectedStation[] = stations
      .map(station => {
        const coords = projection([station.lng, station.lat]);
        if (!coords) return null;
        return { ...station, x: coords[0], y: coords[1] };
      })
      .filter(Boolean) as ProjectedStation[];

    const hexRadius = Math.min(24, Math.max(16, Math.min(width, height) * 0.025)); // Smaller, responsive radius
    const hexbin = d3Hexbin<ProjectedStation>()
      .x(d => d.x)
      .y(d => d.y)
      .radius(hexRadius)
      .extent([[0, 0], [width, height]]);

    const bins = hexbin(projectedStations);

    const maxHexTrips = Math.max(
      1,
      ...bins.map(bin =>
        bin.reduce((sum, s) => sum + s.total_trips, 0)
      )
    );

    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxHexTrips]);

    svg.append('g')
      .selectAll('path')
      .data(bins)
      .join('path')
      .attr('d', bin => `M${bin.x},${bin.y}${hexbin.hexagon(hexRadius - 2)}`)
      .attr('fill', bin => colorScale(bin.reduce((sum, s) => sum + s.total_trips, 0)))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('opacity', 0.7);

      const stationMax = Math.max(1, ...stations.map(s => s.total_trips));
      const stationScale = d3.scaleSequential(d3.interpolateBlues).domain([0, stationMax]);
      
      const stationCircles = svg.append('g')
        .selectAll('circle')
        .data(projectedStations)
        .join('circle')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', d => Math.sqrt(d.total_trips / stationMax) * 5 + 2)
        .attr('fill', d => stationScale(d.total_trips))
        .attr('stroke', d => hoveredStation?.station_id === d.station_id ? '#fb923c' : '#fff')
        .attr('stroke-width', d => hoveredStation?.station_id === d.station_id ? 3 : 2)
        .style('cursor', 'pointer')
        .on('mouseover', (event, d) => setHoveredStation(d))
        .on('mouseout', () => setHoveredStation(null))
        .on('click', (event, d) => {
          console.log('Heatmap station clicked:', d.station_name); // Debug log
          
          d3.select(event.currentTarget)
            .transition()
            .duration(150)
            .attr('r', Math.sqrt(d.total_trips / stationMax) * 6 + 3)
            .transition()
            .duration(150)
            .attr('r', Math.sqrt(d.total_trips / stationMax) * 5 + 2);
          
          onStationSelect?.(d);
        });
        stationCircles.append('title')
        .text(d => `${d.station_name}\n${d.total_trips} trips`);
      
  }, [stations, width, height, hoveredStation, boroughGeo, onStationSelect]);

  const legendWidth = 210;
  const legendHeight = 16;
  const tripVals = stations.map(s => s.total_trips);
  const minTrips = Math.min(...tripVals);
  const maxTrips = Math.max(...tripVals);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: 'block' }}
      />
      <div style={{
        position: 'absolute',
        left: 24,
        bottom: 24,
        background: 'rgba(255,255,255,0.98)',
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: '10px 14px 12px 14px',
        fontSize: 12,
        color: '#444',
        zIndex: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ fontWeight: 500, marginBottom: 6 }}>
          Station Density & Activity
        </div>
        <div style={{
          width: legendWidth,
          height: legendHeight,
          background: 'linear-gradient(to right, #ffffcc, #fd8d3c, #e31a1c)',
          border: '1px solid #bbb',
          borderRadius: 5,
          marginBottom: 8
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span>{minTrips} trips</span>
          <span>Hotspot</span>
          <span>{maxTrips}+</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
          Hexbin = area density<br />
          Circles = station trips (hover/tap)
        </div>
      </div>
      {hoveredStation && (
        <div style={{
          position: 'absolute',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.95)',
          color: '#fff',
          padding: '8px 14px',
          borderRadius: 8,
          fontSize: 13,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 20
        }}>
          <b>{hoveredStation.station_name}</b><br />
          {hoveredStation.total_trips} trips
        </div>
      )}
    </div>
  );
};

export default HeatmapLayer;