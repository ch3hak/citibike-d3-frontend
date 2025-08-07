import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatedGradient } from '@/components/ui/animated-gradient';
import type { 
  NetworkVisualizationProps, 
  Station, 
  // Flow, 
  ProjectedStation, 
  ProjectedFlow 
} from '@/types/citibike';
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

  const handleStationClick = useCallback((station: Station) => {
    // setSelectedStation(station);
    onStationSelect?.(station);
  }, [onStationSelect]);

  useEffect(() => {
    if (!stations.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const projection = createProjection(width, height);
    const maxTrips = Math.max(...stations.map(s => s.total_trips));
    const classifications = stations.map(s => classifyStationActivity(s.total_trips, maxTrips));

    const projectedStations: ProjectedStation[] = stations.map(station => {
      const { color: activityColor } = classifyStationActivity(
        station.total_trips,
        maxTrips
      );

      const { x, y } = projectCoordinates(station.lng, station.lat, projection);
      const radius = Math.sqrt(station.total_trips / maxTrips) * 20 + 8;

      return{
        ...station,
        x,
        y,
        radius,
        activityColor,
    }
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
      .on('mouseout', (event, /*d*/) => {
        setHoveredStation(null);
        d3.select(event.currentTarget)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2.5)
          .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))');
      })
      .on('click', (event, d: ProjectedStation) => {
        // handleStationClick(d);
        pulseAnimation(d3.select(event.currentTarget));
        // setSelectedStation(d);
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

  }, [stations, flows, width, height, onStationSelect, handleStationClick]);

  return (
    <AnimatedGradient className="relative w-full h-full rounded-xl overflow-hidden">
      <Card className="h-full border-0 bg-white/95 backdrop-blur-sm">
        <CardContent className="p-0 h-full">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="w-full h-full"
          />
          
          {/* <AnimatePresence>
            {selectedStation && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="absolute top-6 left-6 z-10"
              >
                <Card className="glass-card max-w-xs">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-primary text-lg leading-tight">
                          {selectedStation.station_name}
                        </h3>
                        <Badge variant="secondary" className="mt-1">
                          ID: {selectedStation.station_id}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="text-center p-2 bg-green-50 rounded-lg">
                          <div className="text-xl font-bold text-green-600">
                            {formatNumber(selectedStation.total_departures)}
                          </div>
                          <div className="text-green-700">Departures</div>
                        </div>
                        
                        <div className="text-center p-2 bg-blue-50 rounded-lg">
                          <div className="text-xl font-bold text-blue-600">
                            {formatNumber(selectedStation.total_arrivals)}
                          </div>
                          <div className="text-blue-700">Arrivals</div>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Total Trips:</span>
                          <span className="font-semibold">{formatNumber(selectedStation.total_trips)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="text-muted-foreground">Avg Duration:</span>
                          <span className="font-semibold">{selectedStation.avg_duration_min}min</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence> */}

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