import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatedGradient } from '@/components/ui/animated-gradient';
import HeatmapLayer from './HeatmapLayer';
import { MapIcon, NetworkIcon, Flame } from 'lucide-react';
import type { 
  NetworkVisualizationProps, 
  Station, 
  // Flow, 
  ProjectedStation, 
  ProjectedFlow 
} from '@/types/citibike';
import type { Feature, FeatureCollection, Geometry, Polygon } from 'geojson';
import { createProjection, projectCoordinates } from '@/utils/geoProjection';
import { animateStationEntry, animateFlowEntry, pulseAnimation } from '@/utils/animationHelpers';
import { formatNumber, classifyStationActivity } from '@/lib/utils';

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({ 
  stations = [], 
  flows = [], 
  // selectedHour = 8,
  onStationSelect,
  width = 800,
  height = 600 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<ProjectedStation, ProjectedFlow> | null>(null);
  // const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [hoveredStation, setHoveredStation] = useState<Station | null>(null);
  const [visualizationMode, setVisualizationMode] = useState<'network' | 'map' | 'heatmap'>('network');
  const [boroughGeo, setBoroughGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  
  const handleStationClick = useCallback((station: Station) => {
    // setSelectedStation(station);
    onStationSelect?.(station);
  }, [onStationSelect]);

  useEffect(() => {
    d3.json<unknown>('/src/assets/nyc-boroughs.topojson')
      .then(topo => {
        const result = feature(
          topo as any,
          (topo as any).objects.boroughs
        ) as Feature<Geometry, any> | FeatureCollection<Geometry, any>;
        
        const geoCollection: FeatureCollection<Geometry, any> = 'features' in result
          ? result
          : { type: 'FeatureCollection', features: [result] };
        
        setBoroughGeo(geoCollection);
      })
      .catch(err => {
        console.warn('Failed to load borough boundaries, falling back to bbox', err);
        setBoroughGeo(null);
      });
  }, []);

  const getEffectiveDimensions = useCallback(() => {
    switch (visualizationMode) {
      case 'network':
        return { width, height }; 
      case 'map':
        return { 
          width: Math.max(width, 900), 
          height: Math.max(height, 650) 
        };
      case 'heatmap':
        return { 
          width: width * 0.95,
          height: height * 0.95 
        };
      default:
        return { width, height };
    }
  }, [visualizationMode, width, height]);

  const getProjection = useCallback(() => {
    const { width: effectiveWidth, height: effectiveHeight } = getEffectiveDimensions();
    
    if (boroughGeo) {
      const projection = d3.geoMercator();
      projection.fitExtent(
        [[60, 60], [effectiveWidth - 60, effectiveHeight - 60]], 
        boroughGeo
      );
      return projection;
    } else {
      return d3.geoMercator()
        .center([-73.98, 40.75])
        .scale(Math.min(effectiveWidth, effectiveHeight) * 0.18) // Increased scale factor
        .translate([effectiveWidth / 2, effectiveHeight / 2]);
    }
  }, [boroughGeo, getEffectiveDimensions]);
   
  const renderMapVisualization = useCallback(() => {
    if (!stations.length || !svgRef.current) return;
    
    console.log('Map rendering - stations count:', stations.length);
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
  
    const lngs = stations.map(s => s.lng);
    const lats = stations.map(s => s.lat);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    
    const mapSize = Math.min(width, height) * 0.85; 
    const mapX = (width - mapSize) / 2; 
    const mapY = (height - mapSize) / 2; 
    const mapCenterX = width / 2; 
    const mapCenterY = height / 2;
  
    console.log(`Canvas: ${width}x${height}`);
    console.log(`Map square: ${mapSize}x${mapSize} at (${mapX}, ${mapY})`);
    console.log(`Perfect center: (${mapCenterX}, ${mapCenterY})`);
  
    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;
  
    const projection = d3.geoMercator()
      .center([centerLng, centerLat])
      .scale(50000)
      .translate([mapCenterX, mapCenterY]);
  
    const maxTrips = Math.max(...stations.map(s => s.total_trips));
    const container = svg.append('g').attr('class', 'map-container');
  
    container.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#fafafa')
      .attr('stroke', 'none');
  
    const defs = svg.append('defs');
    const gradient = defs.append('radialGradient')
      .attr('id', 'backgroundGradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '70%');
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#ffffff')
      .attr('stop-opacity', 1);
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#f1f5f9')
      .attr('stop-opacity', 1);
  
    container.append('rect')
      .attr('x', mapX)
      .attr('y', mapY)
      .attr('width', mapSize)
      .attr('height', mapSize)
      .attr('fill', 'url(#backgroundGradient)')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 2)
      .attr('rx', 16)
      .attr('ry', 16)
      .style('filter', 'drop-shadow(0 8px 25px rgba(0,0,0,0.15))')
      .style('opacity', 0.95);
  
    container.append('rect')
      .attr('x', mapX + 4)
      .attr('y', mapY + 4)
      .attr('width', mapSize - 8)
      .attr('height', mapSize - 8)
      .attr('fill', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('opacity', 0.6);
  
    const circleGroup = container.append('g').attr('class', 'reference-circles');
    [80, 160, 240].forEach((radius, i) => {
      circleGroup.append('circle')
        .attr('cx', mapCenterX)
        .attr('cy', mapCenterY)
        .attr('r', radius)
        .attr('fill', 'none')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,6')
        .attr('opacity', 0.3 - i * 0.05);
    });
  
    defs.append('clipPath')
      .attr('id', 'mapClip')
      .append('rect')
      .attr('x', mapX)
      .attr('y', mapY)
      .attr('width', mapSize)
      .attr('height', mapSize)
      .attr('rx', 16)
      .attr('ry', 16);
  
    if (boroughGeo) {
      console.log('Drawing borough boundaries');
      const pathGen = d3.geoPath(projection);
      
      container.append('g')
        .attr('class', 'boroughs')
        .attr('clip-path', 'url(#mapClip)')
        .selectAll('path')
        .data(boroughGeo.features)
        .enter()
        .append('path')
        .attr('d', pathGen)
        .attr('fill', 'rgba(148,163,184,0.08)')
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 1)
        .attr('opacity', 0.4);
    }
  
    type StationWithCoords = Station & { x: number; y: number };
    
    const projectedStations: StationWithCoords[] = stations
      .map((station, index) => {
        const angle = (index * 2.4) % (2 * Math.PI);
        const maxRadius = mapSize * 0.35; 
        const spiralRadius = Math.sqrt(index + 1) * (maxRadius / Math.sqrt(stations.length + 1));
        const offsetX = Math.cos(angle) * spiralRadius;
        const offsetY = Math.sin(angle) * spiralRadius;
        
        const x = mapCenterX + offsetX;
        const y = mapCenterY + offsetY;
        
        return { ...station, x, y };
      })
      .filter((station): station is StationWithCoords => station !== null);
  
    const mapContent = container.append('g')
      .attr('class', 'map-content')
      .attr('clip-path', 'url(#mapClip)');
  
    const flowsGroup = mapContent.append('g').attr('class', 'flows');
    flows.forEach((flow) => {
      const sourceStation = projectedStations.find(s => s.station_id === flow.start_station_id);
      const targetStation = projectedStations.find(s => s.station_id === flow.end_station_id);
      if (!sourceStation || !targetStation) return;
  
      const midX = (sourceStation.x + targetStation.x) / 2;
      const midY = (sourceStation.y + targetStation.y) / 2 - 15;
  
      const pathData = `M ${sourceStation.x} ${sourceStation.y} Q ${midX} ${midY} ${targetStation.x} ${targetStation.y}`;
      
      flowsGroup.append('path')
        .attr('d', pathData)
        .attr('fill', 'none')
        .attr('stroke', '#dc2626')
        .attr('stroke-width', 2.5)
        .attr('opacity', 0.65)
        .attr('stroke-linecap', 'round');
    });
  
    projectedStations.forEach((station) => {
      const radius = Math.sqrt(station.total_trips / maxTrips) * 14 + 8;
      const { color: activityColor } = classifyStationActivity(station.total_trips, maxTrips);
  
      const stationGroup = mapContent.append('g')
        .attr('class', 'station-group')
        .style('cursor', 'pointer');
  
      stationGroup.append('circle')
        .attr('cx', station.x)
        .attr('cy', station.y)
        .attr('r', radius + 3)
        .attr('fill', activityColor)
        .attr('opacity', 0.25);
  
      stationGroup.append('circle')
        .attr('cx', station.x)
        .attr('cy', station.y)
        .attr('r', radius)
        .attr('fill', activityColor)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2.5)
        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))');
  
      stationGroup.append('text')
        .attr('x', station.x)
        .attr('y', station.y - radius - 6)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('fill', '#374151')
        .attr('font-weight', '600')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .attr('paint-order', 'stroke')
        .text(station.station_name.substring(0, 16));
  
      stationGroup
        .on('mouseover', (event) => {
          setHoveredStation(station);
          d3.select(event.currentTarget).selectAll('circle')
            .transition()
            .duration(150)
            .attr('stroke', '#f59e0b')
            .attr('stroke-width', 4);
        })
        .on('mouseout', (event) => {
          setHoveredStation(null);
          d3.select(event.currentTarget).selectAll('circle')
            .transition()
            .duration(150)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2.5);
        })
        .on('click', () => {
          onStationSelect?.(station);
        });
    });
  
    mapContent.append('circle')
      .attr('cx', mapCenterX)
      .attr('cy', mapCenterY)
      .attr('r', 1.5)
      .attr('fill', '#6b7280')
      .attr('opacity', 0.4);
  
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.6, 4])
      .on('zoom', (event) => {
        mapContent.attr('transform', event.transform);
      });
  
    svg.call(zoom);
    
  }, [stations, flows, width, height, onStationSelect, boroughGeo]);
  

  const renderNetworkVisualization = useCallback(() => {
    if (!stations.length || !svgRef.current) return;
  
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
  
    const projection = createProjection(width, height);
    const maxTrips = Math.max(...stations.map(s => s.total_trips));
  
    const projectedStations: ProjectedStation[] = stations.map(station => {
      const { color: activityColor } = classifyStationActivity(
        station.total_trips,
        maxTrips
      );
  
      const { x, y } = projectCoordinates(station.lng, station.lat, projection);
      const radius = Math.sqrt(station.total_trips / maxTrips) * 20 + 8;
  
      return {
        ...station,
        x,
        y,
        radius,
        activityColor,
      };
    });

    const links: ProjectedFlow[] = flows.map(flow => {
      const source = projectedStations.find(s => s.station_id === flow.start_station_id);
      const target = projectedStations.find(s => s.station_id === flow.end_station_id);
      return source && target ? { ...flow, source, target } : null;
    }).filter((link): link is ProjectedFlow => link !== null);
  
    const simulation = d3.forceSimulation(projectedStations)
      .force('link', d3.forceLink<ProjectedStation, ProjectedFlow>(links)
        .id(d => d.station_id)
        .distance(d => Math.max(60, 250 - d.trip_count / 15))
        .strength(0.2)
      )
      .force('charge', d3.forceManyBody<ProjectedStation>()
        .strength(d => -400 - (d.total_trips / 30))
        .distanceMax(300)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<ProjectedStation>()
        .radius(d => d.radius + 5)
        .strength(0.9)
      )
      .force('x', d3.forceX<ProjectedStation>(d => d.x).strength(0.3))
      .force('y', d3.forceY<ProjectedStation>(d => d.y).strength(0.3));
  
    simulationRef.current = simulation;
  
    const container = svg.append('g').attr('class', 'd3-container');
    const linksGroup = container.append('g').attr('class', 'links');
    const nodesGroup = container.append('g').attr('class', 'nodes');
  
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 8])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });
  
    svg.call(zoom);
  
    const linkSelection = linksGroup
      .selectAll<SVGLineElement, ProjectedFlow>('.flow-link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'flow-link')
      .attr('stroke', (d) => {
        const intensity = d.trip_count / Math.max(...links.map(l => l.trip_count));
        return intensity > 0.7 ? '#EF4444' : intensity > 0.4 ? '#F59E0B' : '#94A3B8';
      })
      .attr('stroke-opacity', 0.7)
      .attr('stroke-width', d => Math.sqrt(d.trip_count) * 0.4 + 1.5)
      .attr('stroke-linecap', 'round');
  
    animateFlowEntry(linkSelection);
  
    const nodeSelection = nodesGroup
      .selectAll<SVGCircleElement, ProjectedStation>('.station-node')
      .data(projectedStations)
      .enter()
      .append('circle')
      .attr('class', 'station-node')
      .attr('r', d => d.radius)
      .attr('fill', d => d.activityColor)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5)
      .attr('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))')
      .style('cursor', 'pointer')
      .style('transition', 'all 0.3s ease');
  
    animateStationEntry(nodeSelection);
  
    nodeSelection
      .on('mouseover', (event, d) => {
        setHoveredStation(d);
        d3.select(event.currentTarget)
          .attr('stroke', '#FB923C')
          .attr('stroke-width', 4)
          .style('filter', 'drop-shadow(0 6px 12px rgba(251,146,60,0.3))');
      })
      .on('mouseout', (event) => {
        setHoveredStation(null);
        d3.select(event.currentTarget)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2.5)
          .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))');
      })
      .on('click', (event, d: ProjectedStation) => {
        pulseAnimation(d3.select(event.currentTarget));
        onStationSelect?.(d);
      });
  
    const drag = d3.drag<SVGCircleElement, ProjectedStation>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  
    nodeSelection.call(drag);
  
    simulation.on('tick', () => {
      linkSelection
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
  
      nodeSelection
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
    });
  
    return () => {
      simulation?.stop();
    };
  }, [stations, flows, width, height, onStationSelect]);
  
  const renderHeatmapVisualization = useCallback(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove(); 
    }
  }, []);

  useEffect(() => {
    if (visualizationMode === 'network') {
      return renderNetworkVisualization();
    } else if (visualizationMode === 'map') {
      renderMapVisualization();
    } else {
      renderHeatmapVisualization();
    }
  }, [visualizationMode, renderNetworkVisualization, renderMapVisualization, renderHeatmapVisualization]);

  return (
    <AnimatedGradient className="relative w-full h-full rounded-xl overflow-hidden">
      <Card className="h-full border-0 bg-white/95 backdrop-blur-sm">
        <CardContent className="p-0 h-full relative">
          <div className="absolute top-4 right-4 z-20 flex gap-2">
            <Button
              variant={visualizationMode === 'network' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVisualizationMode('network')}
              className="flex items-center gap-2"
            >
              <NetworkIcon className="w-4 h-4" />
              Network
            </Button>
            <Button
              variant={visualizationMode === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVisualizationMode('map')}
              className="flex items-center gap-2"
            >
              <MapIcon className="w-4 h-4" />
              Map
            </Button>
            <Button
              variant={visualizationMode === 'heatmap' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVisualizationMode('heatmap')}
              className="flex items-center gap-2"
            >
              <Flame className="w-4 h-4" />
              Heatmap
            </Button>
          </div>

          <div className="relative w-full h-full">
            {visualizationMode === 'heatmap' ? (
              <HeatmapLayer 
                stations={stations} 
                width={width} 
                height={height} 
                onStationSelect={handleStationClick}
                boroughGeo={boroughGeo} 
              />
            ) : (
              <svg
                ref={svgRef}
                width={width}
                height={height}
                className="w-full h-full"
              />
            )}
          </div>

          <TooltipProvider>
            {hoveredStation && (
              <Tooltip open={!!hoveredStation}>
                <TooltipTrigger asChild>
                  <div className="absolute inset-0 pointer-events-none" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="text-center">
                    <div className="font-semibold">{hoveredStation.station_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatNumber(hoveredStation.total_trips)} trips
                    </div>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {visualizationMode === 'map' ? 'Geographic View' : visualizationMode === 'heatmap' ? 'Heat Map View' : 'Network View'}
                    </Badge>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </CardContent>
      </Card>
    </AnimatedGradient>
  );
};

export default NetworkVisualization;