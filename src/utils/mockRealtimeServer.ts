import type { Trip } from '@/utils/TripSimulator';

export class MockRealtimeServer {
  private intervalId: NodeJS.Timeout | null = null;
  private tripCount = 0;
  private isRunning = false;
  private speed = 1;
  private callback: ((message: any) => void) | null = null;

  private generateMockTrip(): Trip {
    const stations = [
      { id: '001', name: '8th Ave & W 31st St', lat: 40.750020, lng: -73.994436 },
      { id: '002', name: '1 Ave & E 15th St', lat: 40.732219, lng: -73.981656 },
      { id: '003', name: 'W 21st St & 6th Ave', lat: 40.741740, lng: -73.994084 },
      { id: '004', name: 'Broadway & E 22nd St', lat: 40.740343, lng: -73.989551 },
    ];
    
    const startStation = stations[Math.floor(Math.random() * stations.length)];
    const endStation = stations[Math.floor(Math.random() * stations.length)];
    
    return {
      trip_id: `mock_${Date.now()}_${Math.random()}`,
      started_at: new Date().toISOString(),
      ended_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      start_station_id: startStation.id,
      end_station_id: endStation.id,
      start_station_name: startStation.name,
      end_station_name: endStation.name,
      start_lat: startStation.lat,
      start_lng: startStation.lng,
      end_lat: endStation.lat,
      end_lng: endStation.lng,
      member_casual: Math.random() > 0.7 ? 'casual' : 'member'
    };
  }

  private sendTrips() {
    if (!this.isRunning || !this.callback) return;

    const batchSize = Math.floor(Math.random() * 3) + 1; // 1-3 trips
    const trips = Array.from({ length: batchSize }, () => this.generateMockTrip());
    
    this.tripCount += batchSize;
    
    this.callback({
      type: 'new_trips',
      data: trips,
      progress: {
        current: this.tripCount,
        total: 1000,
        percentage: Math.min((this.tripCount / 1000) * 100, 100)
      },
      timestamp: new Date().toISOString()
    });
  }

  start(callback: (message: any) => void) {
    console.log('🚀 Mock server started');
    this.callback = callback;
    
    callback({
      type: 'simulation_started',
      data: { totalTrips: 1000 },
      timestamp: new Date().toISOString()
    });
  }

  startSimulation() {
    if (this.isRunning) return;
    
    console.log('▶️ Mock simulation started');
    this.isRunning = true;
    
    if (this.callback) {
      this.callback({
        type: 'simulation_started',
        data: { totalTrips: 1000 },
        timestamp: new Date().toISOString()
      });
    }

    this.intervalId = setInterval(() => {
      this.sendTrips();
    }, Math.max(500, 2000 / this.speed)); 
  }

  pauseSimulation() {
    if (!this.isRunning) return;
    
    console.log('⏸️ Mock simulation paused');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.callback) {
      this.callback({
        type: 'simulation_paused',
        timestamp: new Date().toISOString()
      });
    }
  }

  stopSimulation() {
    console.log('⏹️ Mock simulation stopped');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.callback) {
      this.callback({
        type: 'simulation_stopped',
        timestamp: new Date().toISOString()
      });
    }
  }

  setSpeed(newSpeed: number) {
    console.log(`🏃 Mock speed changed to ${newSpeed}x`);
    this.speed = Math.max(0.1, Math.min(50, newSpeed));
    
    if (this.callback) {
      this.callback({
        type: 'speed_changed',
        data: { speed: this.speed },
        timestamp: new Date().toISOString()
      });
    }

    if (this.isRunning && this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = setInterval(() => {
        this.sendTrips();
      }, Math.max(500, 2000 / this.speed));
    }
  }

  resetSimulation() {
    console.log('🔄 Mock simulation reset');
    this.stopSimulation();
    this.tripCount = 0;
    
    if (this.callback) {
      this.callback({
        type: 'simulation_stopped', 
        timestamp: new Date().toISOString()
      });
    }
  }

  stop() {
    this.stopSimulation();
    this.callback = null;
    console.log('🛑 Mock server stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      speed: this.speed,
      tripCount: this.tripCount,
      progress: Math.min((this.tripCount / 1000) * 100, 100)
    };
  }
}
