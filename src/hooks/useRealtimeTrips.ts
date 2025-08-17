import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebSocket } from './useWebSocket'; // Your existing hook
import { MockRealtimeServer } from '../utils/mockRealtimeServer';
import type { Trip, SimulatorMessage } from '@/utils/TripSimulator';
import type { Station } from '@/types/citibike';

export interface AnimatedTrip extends Trip {
  animationStartTime: number;
  isActive: boolean;
  progress: number;
}

export interface RealtimeTripsState {
  isConnected: boolean;
  connectionStatus: string;
  
  isPlaying: boolean;
  currentSpeed: number;
  progress: number;
  totalTrips: number;
  
  recentTrips: Trip[];
  allTrips: Trip[];
  activeTrips: Map<string, AnimatedTrip>;
  
  tripCount: number;
  tripsPerSecond: number;
  
  isMockMode: boolean;
}

export interface RealtimeTripsControls {
  connect: () => void;
  disconnect: () => void;

  startSimulation: () => void;
  pauseSimulation: () => void;
  stopSimulation: () => void;
  setSpeed: (speed: number) => void;
  
  getActiveTrips: () => AnimatedTrip[];
  clearTrips: () => void;
}

interface UseRealtimeTripsOptions {
  websocketUrl?: string;
  maxRecentTrips?: number;
  tripDuration?: number; 
  autoConnect?: boolean;
}

export const useRealtimeTrips = (
  options: UseRealtimeTripsOptions = {}
): [RealtimeTripsState, RealtimeTripsControls] => {
  
  const {
    websocketUrl = 'ws://localhost:8080',
    maxRecentTrips = 100,
    tripDuration = 30000,
    autoConnect = false
  } = options;

  const mockServerRef = useRef<MockRealtimeServer | null>(null);
  const [useMockMode, setUseMockMode] = useState(false);
  
  const {
    connectionStatus: wsConnectionStatus,
    lastMessage,
    connect: wsConnect,
    disconnect: wsDisconnect,
    sendMessage
  } = useWebSocket(websocketUrl);

  const connectionStatus = useMockMode ? 'Connected' : wsConnectionStatus;

  const [state, setState] = useState<RealtimeTripsState>({
    isConnected: connectionStatus === 'Connected',
    connectionStatus,
    isPlaying: false,
    currentSpeed: 1,
    progress: 0,
    totalTrips: 0,
    recentTrips: [],
    allTrips: [],
    activeTrips: new Map(),
    tripCount: 0,
    tripsPerSecond: 0,
    isMockMode: useMockMode,
  });

  const trailCleanupRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const tripCountRef = useRef(0);
  const lastTripCountTime = useRef(Date.now());

  useEffect(() => {
    setState(prevState => ({
      ...prevState,
      connectionStatus,
      isConnected: connectionStatus === 'Connected',
      isMockMode: useMockMode
    }));
  }, [connectionStatus, useMockMode]);

  useEffect(() => {
    if (autoConnect && connectionStatus === 'Disconnected') {
      connect();
    }
  }, [autoConnect, connectionStatus]);

  const handleMessage = useCallback((message: SimulatorMessage) => {
    if (!message.type) return;
    
    setState(prevState => {
      const newState = { ...prevState };

      switch (message.type) {
        case 'new_trips':
          if (Array.isArray(message.data)) {
            const newTrips = message.data as Trip[];
            
            newState.recentTrips = [
              ...newTrips,
              ...prevState.recentTrips
            ].slice(0, maxRecentTrips);
            
            newState.allTrips = [...prevState.allTrips, ...newTrips];
            
            newTrips.forEach((trip, index) => {
              const tripId = trip.trip_id || `${trip.start_station_id}-${trip.end_station_id}-${Date.now()}-${index}`;
              newState.activeTrips.set(tripId, {
                ...trip,
                animationStartTime: Date.now(),
                isActive: true,
                progress: 0
              });
            });
            
            newState.tripCount += newTrips.length;
            tripCountRef.current += newTrips.length;
            
            if (message.progress) {
              newState.progress = message.progress.percentage;
              newState.totalTrips = message.progress.total;
            }
          }
          break;

        case 'simulation_started':
          newState.isPlaying = true;
          if (message.data?.totalTrips) {
            newState.totalTrips = message.data.totalTrips;
          }
          break;

        case 'simulation_paused':
          newState.isPlaying = false;
          break;

        case 'simulation_resumed':
          newState.isPlaying = true;
          break;

        case 'simulation_stopped':
        case 'simulation_complete':
          newState.isPlaying = false;
          if (message.type === 'simulation_complete') {
            newState.progress = 100;
          }
          break;

        case 'speed_changed':
          if (message.data?.speed) {
            newState.currentSpeed = message.data.speed;
          }
          break;
      }

      return newState;
    });
  }, [maxRecentTrips]);

  useEffect(() => {
    if (!lastMessage || useMockMode) return;
    handleMessage(lastMessage as SimulatorMessage);
  }, [lastMessage, useMockMode, handleMessage]);

  const updateAnimations = useCallback(() => {
    const now = Date.now();
    
    setState(prevState => {
      const newActiveTrips = new Map<string, AnimatedTrip>();
      
      prevState.activeTrips.forEach((trip, key) => {
        const elapsed = now - trip.animationStartTime;
        const progress = Math.min(elapsed / tripDuration, 1);
        
        if (progress < 1) {
          newActiveTrips.set(key, {
            ...trip,
            progress
          });
        }
      });
      
      return {
        ...prevState,
        activeTrips: newActiveTrips
      };
    });

    const timeSinceLastCount = now - lastTripCountTime.current;
    if (timeSinceLastCount >= 1000) { 
      const tripsPerSecond = (tripCountRef.current / timeSinceLastCount) * 1000;
      setState(prevState => ({
        ...prevState,
        tripsPerSecond: Math.round(tripsPerSecond * 100) / 100
      }));
      
      tripCountRef.current = 0;
      lastTripCountTime.current = now;
    }

    animationFrameRef.current = requestAnimationFrame(updateAnimations);
  }, [tripDuration]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(updateAnimations);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateAnimations]);

  useEffect(() => {
    return () => {
      if (trailCleanupRef.current) {
        clearInterval(trailCleanupRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mockServerRef.current) {
        mockServerRef.current.stop();
      }
    };
  }, []);

  const connect = useCallback(() => {
    wsConnect();
    
    // setTimeout(() => {
    //   if (wsConnectionStatus !== 'Connected' && !useMockMode) {
    //     console.log('🔄 WebSocket failed, switching to mock mode');
    //     setUseMockMode(true);
        
    //     mockServerRef.current = new MockRealtimeServer();
    //     mockServerRef.current.start((message) => {
    //       handleMessage(message);
    //     });
    //   }
    // }, 3000);
  }, [wsConnect/*, wsConnectionStatus, useMockMode, handleMessage*/]);

  const disconnect = useCallback(() => {
    if (useMockMode && mockServerRef.current) {
      mockServerRef.current.stop();
      mockServerRef.current = null;
      setUseMockMode(false);
    } else {
      wsDisconnect();
    }
  }, [wsDisconnect, useMockMode]);

  const startSimulation = useCallback(() => {
    if (useMockMode && mockServerRef.current) {
      mockServerRef.current.startSimulation();
    } else {
      sendMessage({ type: 'start_simulation' });
    }
  }, [sendMessage, useMockMode]);

  const pauseSimulation = useCallback(() => {
    if (useMockMode && mockServerRef.current) {
      mockServerRef.current.pauseSimulation();
    } else {
      sendMessage({ type: 'pause_simulation' });
    }
  }, [sendMessage, useMockMode]);

  const stopSimulation = useCallback(() => {
    if (useMockMode && mockServerRef.current) {
      mockServerRef.current.stopSimulation();
    } else {
      sendMessage({ type: 'stop_simulation' });
    }
  }, [sendMessage, useMockMode]);

  const setSpeed = useCallback((speed: number) => {
    if (useMockMode && mockServerRef.current) {
      mockServerRef.current.setSpeed(speed);
    } else {
      sendMessage({ type: 'set_speed', data: { speed } });
    }
  }, [sendMessage, useMockMode]);

  const getActiveTrips = useCallback((): AnimatedTrip[] => {
    return Array.from(state.activeTrips.values());
  }, [state.activeTrips]);

  const clearTrips = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      recentTrips: [],
      allTrips: [],
      activeTrips: new Map(),
      tripCount: 0,
      tripsPerSecond: 0
    }));
    tripCountRef.current = 0;
    lastTripCountTime.current = Date.now();
  }, []);

  const controls: RealtimeTripsControls = {
    connect,
    disconnect,
    startSimulation,
    pauseSimulation,
    stopSimulation,
    setSpeed,
    getActiveTrips,
    clearTrips
  };

  return [state, controls];
};