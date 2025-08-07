import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, TrendingUp, Clock, X, Users, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { StationDetailsProps } from '@/types/citibike';
import { formatNumber, formatDuration } from '@/lib/utils';
import { classifyStationActivity } from '@/lib/utils';


export const StationDetails: React.FC<StationDetailsProps & { maxTrips: number }> = ({ station, onClose, maxTrips }) => {
  if (!station) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-5 w-5" />
            Station Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Click on a station to see details</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activity = classifyStationActivity(station.total_trips, maxTrips);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-primary leading-tight flex-1">
                <MapPin className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-semibold">{station.station_name}</span>
                {onClose && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0 flex items-center justify-center hover:bg-destructive/20 ml-auto"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </div>
            <div className="flex justify-center gap-2 mt-2">
              <Badge variant="outline" className="flex items-center justify-center text-xs min-w-[120px] text-center">
                ID: {station.station_id}
              </Badge>
              <Badge 
                variant="secondary" 
                className="flex items-center justify-center text-xs text-white hover:opacity-100 min-w-[120px] text-center"
                style={{ backgroundColor: activity.color }}
              >
                {activity.level}
              </Badge>
            </div>
          </CardHeader>


          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200"
              >
                <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-700">
                  {formatNumber(station.total_departures)}
                </div>
                <div className="text-sm text-green-600 font-medium">Departures</div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200"
              >
                <MapPin className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-700">
                  {formatNumber(station.total_arrivals)}
                </div>
                <div className="text-sm text-blue-600 font-medium">Arrivals</div>
              </motion.div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200"
              >
                <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-700">
                  {formatNumber(station.total_trips)}
                </div>
                <div className="text-sm text-purple-600 font-medium">Total Trips</div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200"
              >
                <Clock className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-700">
                  {station.avg_duration_min}
                </div>
                <div className="text-sm text-orange-600 font-medium">Avg Duration (min)</div>
              </motion.div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground">Location</h4>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Latitude:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {Number(station.lat.toFixed(6))}
                  </code>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Longitude:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {Number(station.lng.toFixed(6))}
                  </code>
                </div>
              </div>
            </div>

            <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Activity Insights</span>
              </div>
              <div className="text-xs text-blue-700 space-y-1">
                <div>
                  Balance: {station.total_departures > station.total_arrivals ? 'More departures' : 'More arrivals'}
                </div>
                <div>
                  Efficiency: {formatDuration(station.avg_duration_min)} average trip
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default StationDetails;