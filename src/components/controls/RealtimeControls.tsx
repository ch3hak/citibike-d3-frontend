import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Zap, 
  TrendingUp, 
  Wifi,
  WifiOff
} from 'lucide-react';
import type { RealtimeTripsState, RealtimeTripsControls } from '@/hooks/useRealtimeTrips';

interface SimpleRealtimeControlsProps {
  state: RealtimeTripsState;
  controls: RealtimeTripsControls;
  className?: string;
}

export const RealtimeControls: React.FC<SimpleRealtimeControlsProps> = ({
  state, 
  controls, 
  className 
}) => {
  const speedOptions = [0.5, 1, 2, 5, 10];

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Real-time Simulation
          </CardTitle>
          
          <div className="space-y-2">
            <Badge className={`text-xs w-full justify-center ${
              state.isConnected 
                ? 'bg-green-100 text-green-800 border-green-200' 
                : 'bg-gray-100 text-gray-800 border-gray-200'
            }`}>
              {state.isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {state.isMockMode ? `${state.connectionStatus} (Mock)` : state.connectionStatus}
            </Badge>
            
            <div className="flex gap-1">
              {!state.isConnected ? (
                <Button 
                  onClick={controls.connect} 
                  size="sm" 
                  className="flex-1 text-xs px-2 py-1"
                >
                  Connect
                </Button>
              ) : (
                <Button 
                  onClick={controls.disconnect} 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 text-xs px-2 py-1"
                >
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-600">Playback</div>
          <div className="flex gap-1">
            <Button
              onClick={state.isPlaying ? controls.pauseSimulation : controls.startSimulation}
              disabled={!state.isConnected}
              size="sm"
              className="flex-1 text-xs px-2 py-1"
            >
              {state.isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
            
            <Button
              onClick={controls.stopSimulation}
              disabled={!state.isConnected}
              variant="outline"
              size="sm"
              className="flex-1 text-xs px-2 py-1"
            >
              <Square className="h-3 w-3" />
            </Button>
            
            <Button
              onClick={controls.clearTrips}
              disabled={!state.isConnected}
              variant="outline"
              size="sm"
              className="flex-1 text-xs px-2 py-1"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {state.progress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Progress</span>
              <span>{Math.round(state.progress)}%</span>
            </div>
            <Progress value={state.progress} className="w-full h-2" />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <Zap className="h-3 w-3 text-yellow-600" />
            Speed: {state.currentSpeed}x
          </div>
          
          <div className="grid grid-cols-5 gap-1">
            {speedOptions.map(speed => (
              <Button
                key={speed}
                onClick={() => controls.setSpeed(speed)}
                disabled={!state.isConnected}
                variant={state.currentSpeed === speed ? "default" : "outline"}
                size="sm"
                className="text-xs px-1 py-1"
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-bold text-blue-600">
              {state.tripCount}
            </div>
            <div className="text-xs text-gray-600">Trips</div>
          </div>
          
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-bold text-green-600">
              {state.activeTrips.size}
            </div>
            <div className="text-xs text-gray-600">Active</div>
          </div>
        </div>

        {state.tripsPerSecond > 0 && (
          <div className="text-center p-2 bg-yellow-50 rounded">
            <div className="text-sm font-bold text-yellow-600">
              {state.tripsPerSecond} trips/sec
            </div>
            <div className="text-xs text-gray-600">Rate</div>
          </div>
        )}

        <div className="text-xs text-center text-gray-500 bg-blue-50 p-2 rounded border">
          {state.isConnected 
            ? (state.isPlaying 
                ? `🚀 ${state.isMockMode ? 'Mock' : 'Real-time'} simulation running!` 
                : "⏸️ Ready to simulate trips") 
            : "🔌 Click Connect to use real Citi Bike stream"}
        </div>
      </CardContent>
    </Card>
  );
};

export default RealtimeControls;