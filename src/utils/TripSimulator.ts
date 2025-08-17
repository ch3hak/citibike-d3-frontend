import type { Station, Flow } from '@/types/citibike';

export interface Trip {
  trip_id?: string;
  started_at: string;
  ended_at: string;
  start_station_id: string;
  end_station_id: string;
  start_station_name: string;
  end_station_name: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  member_casual?: string;
}

export interface SimulatorOptions {
  speed?: number;
  batchSize?: number;
}

export interface SimulatorProgress {
  current: number;
  total: number;
  percentage: number;
}

export interface SimulatorMessage {
  type: 'new_trips' | 'simulation_started' | 'simulation_stopped' | 'simulation_paused' | 'simulation_resumed' | 'speed_changed' | 'simulation_complete';
  data?: Trip[] | any;
  progress?: SimulatorProgress;
  timestamp: string;
}

type SubscriberCallback = (message: SimulatorMessage) => void;

export class TripSimulator {
  private trips: Trip[];
  private speed: number;
  private batchSize: number;
  private currentIndex: number;
  private isRunning: boolean;
  private subscribers: Set<SubscriberCallback>;
  private startTime: Date | null;
  private simulationStartTime: Date | null;
  private intervalId: NodeJS.Timeout | null;

  constructor(trips: Trip[], options: SimulatorOptions = {}) {
    this.trips = [...trips].sort((a, b) => 
      new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    );
    
    this.speed = options.speed || 1;
    this.batchSize = options.batchSize || 5;
    this.currentIndex = 0;
    this.isRunning = false;
    this.subscribers = new Set();
    
    this.startTime = null;
    this.simulationStartTime = null;
    this.intervalId = null;
  }

  subscribe(callback: SubscriberCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private broadcast(message: Omit<SimulatorMessage, 'timestamp'>): void {
    const fullMessage: SimulatorMessage = {
      ...message,
      timestamp: new Date().toISOString()
    };

    this.subscribers.forEach(callback => {
      try {
        callback(fullMessage);
      } catch (error) {
        console.error('Subscriber callback error:', error);
      }
    });
  }

  private getNextBatch(): Trip[] {
    if (this.currentIndex >= this.trips.length) {
      this.stop();
      this.broadcast({ type: 'simulation_complete' });
      return [];
    }

    const currentTime = new Date();
    const batch: Trip[] = [];
    
    if (!this.startTime) {
      this.startTime = new Date(this.trips[0].started_at);
      this.simulationStartTime = currentTime;
    }

    const elapsedRealTime = currentTime.getTime() - this.simulationStartTime!.getTime();
    const elapsedSimulationTime = elapsedRealTime * this.speed;
    const targetSimulationTime = new Date(this.startTime.getTime() + elapsedSimulationTime);

    while (
      this.currentIndex < this.trips.length && 
      new Date(this.trips[this.currentIndex].started_at) <= targetSimulationTime
    ) {
      batch.push(this.trips[this.currentIndex]);
      this.currentIndex++;
      
      if (batch.length >= this.batchSize) break;
    }

    return batch;
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.broadcast({ 
      type: 'simulation_started', 
      data: { totalTrips: this.trips.length } 
    });
    
    this.intervalId = setInterval(() => {
      const batch = this.getNextBatch();
      
      if (batch.length > 0) {
        this.broadcast({ 
          type: 'new_trips', 
          data: batch,
          progress: {
            current: this.currentIndex,
            total: this.trips.length,
            percentage: Math.round((this.currentIndex / this.trips.length) * 100)
          }
        });
      }
    }, Math.max(50, 100 / this.speed));
  }

  pause(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.broadcast({ type: 'simulation_paused' });
  }

  resume(): void {
    if (this.isRunning) return;
    
    const now = new Date();
    if (this.simulationStartTime) {
      const pausedDuration = now.getTime() - this.simulationStartTime.getTime();
      this.simulationStartTime = new Date(now.getTime() - (pausedDuration / this.speed));
    }
    
    this.start();
    this.broadcast({ type: 'simulation_resumed' });
  }

  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.broadcast({ type: 'simulation_stopped' });
  }

  reset(): void {
    this.stop();
    this.currentIndex = 0;
    this.startTime = null;
    this.simulationStartTime = null;
    this.broadcast({ type: 'simulation_stopped' }); // Use existing type
  }

  setSpeed(newSpeed: number): void {
    const wasRunning = this.isRunning;
    if (wasRunning) this.pause();
    
    this.speed = Math.max(0.1, Math.min(50, newSpeed)); // Clamp between 0.1x and 50x
    
    if (wasRunning) this.resume();
    this.broadcast({ type: 'speed_changed', data: { speed: this.speed } });
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      currentIndex: this.currentIndex,
      totalTrips: this.trips.length,
      speed: this.speed,
      progress: this.trips.length > 0 ? (this.currentIndex / this.trips.length) * 100 : 0
    };
  }

  destroy(): void {
    this.stop();
    this.subscribers.clear();
  }
}
