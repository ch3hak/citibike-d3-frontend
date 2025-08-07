import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Activity, BarChart3, Clock, MapPin, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import NetworkVisualization from '@/components/visualisations/NetworkVisualisation';
import TimeControls from '@/components/controls/TimeControls';
import {StationDetails} from '@/components/controls/StationDetails';
import { AnimatedGradient } from '@/components/ui/animated-gradient';
import useStationData from './hooks/useStationData';
import type { Station } from '@/types/citibike';
import { formatNumber, getHourLabel } from '@/lib/utils';
import './index.css';

interface Dimensions {
  width: number;
  height: number;
}

const App: React.FC = () => {
  const { 
    stations, 
    flows, 
    stats, 
    loading, 
    error, 
    fetchFlows,
    refetch
  } = useStationData();

  const maxTrips = stations.length > 0 ? Math.max(...stations.map(s => s.total_trips)) : 0;

  const [selectedHour, setSelectedHour] = useState<number>(8);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('viz-container');
      if (container) {
        const rect = container.getBoundingClientRect();
        setDimensions({
          width: Math.max(800, rect.width - 40),
          height: Math.max(600, window.innerHeight - 220)
        });
      }
    };

    updateDimensions();
    const handleResize = () => updateDimensions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedHour) {
      fetchFlows(selectedHour, { limit: 100, min_trips: 2 });
    }
  }, [selectedHour, fetchFlows]);

  const handleHourChange = useCallback((hour: number) => {
    setSelectedHour(hour);
    setSelectedStation(null);
  }, []);

  const handleStationSelect = useCallback((station: Station) => {
    setSelectedStation(station);
  }, []);

  const handleRefresh = useCallback(async () => {
    await refetch();
    if (selectedHour) {
      await fetchFlows(selectedHour, { limit: 100, min_trips: 2 });
    }
  }, [refetch, fetchFlows, selectedHour]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <Card className="border-destructive/50">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold text-destructive mb-2">Connection Error</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <div className="flex gap-2">
                <Button onClick={() => window.location.reload()} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
                <Button variant="outline" onClick={handleRefresh} className="flex-1">
                  Refresh Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-citibike-blue to-citibike-orange rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-citibike-blue to-citibike-orange bg-clip-text text-transparent">
                  NYC Citi Bike Network
                </h1>
                <p className="text-muted-foreground text-sm">
                  Interactive visualization of bike share patterns
                </p>
              </div>
            </motion.div>
            
            <div className="flex items-center gap-4">
              {stats && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-right"
                >
                  <div className="text-sm text-muted-foreground">Total Trips</div>
                  <div className="text-2xl font-bold text-primary">
                    {formatNumber(stats.total_trips)}
                  </div>
                </motion.div>
              )}
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 space-y-6"
          >
            <TimeControls
              selectedHour={selectedHour}
              onHourChange={handleHourChange}
              isLoading={loading}
            />
            
            <StationDetails
              station={selectedStation}
              maxTrips={maxTrips}
              onClose={() => setSelectedStation(null)}
            />

            {stats && (
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-primary">System Overview</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <div className="font-semibold">Peak Hour</div>
                        <div className="text-xs text-muted-foreground">{stats.peak_hour}:00</div>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <Activity className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <div className="font-semibold">Avg Duration</div>
                        <div className="text-xs text-muted-foreground">{stats.avg_trip_duration_min}min</div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Stations:</span>
                        <Badge variant="secondary">{stats.unique_start_stations}</Badge>
                      </div>
                      {stats.busiest_station && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Busiest: </span>
                          <span className="font-medium">{stats.busiest_station.station_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6 bg-gradient-to-r from-white to-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Station Network - {getHourLabel(selectedHour)}
                    </h2>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {flows.length} flows
                      </Badge>
                      <Badge variant="outline">
                        {stations.length} stations
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Interactive network showing bike trip patterns during rush hour
                  </p>
                </div>

                <div id="viz-container" className="relative">
                  {loading ? (
                    <div className="flex items-center justify-center h-96 bg-gradient-to-br from-gray-50 to-gray-100">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center"
                      >
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <div className="text-muted-foreground font-medium">Loading visualization...</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Processing {stations.length} stations and {flows.length} flows
                        </div>
                      </motion.div>
                    </div>
                  ) : (
                    <NetworkVisualization
                      stations={stations}
                      flows={flows}
                      selectedHour={selectedHour}
                      onStationSelect={setSelectedStation}
                      width={dimensions.width}
                      height={dimensions.height}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default App;