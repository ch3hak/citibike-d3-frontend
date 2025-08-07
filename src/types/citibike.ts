export interface Station {
    station_id: string;
    station_name: string;
    lat: number;
    lng: number;
    total_departures: number;
    total_arrivals: number;
    total_trips: number;
    avg_duration_min: number;
  }
  
  export interface Flow {
    start_station_id: string;
    end_station_id: string;
    start_station_name: string;
    end_station_name: string;
    trip_count: number;
    start_lat: number;
    start_lng: number;
    end_lat: number;
    end_lng: number;
  }
  
  export interface Trip {
    ride_id: string;
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
    rideable_type: 'classic_bike' | 'electric_bike';
    member_casual: 'member' | 'casual';
    trip_duration_min: number;
  }
  
  export interface SystemStats {
    total_trips: number;
    unique_start_stations: number;
    unique_end_stations: number;
    avg_trip_duration_min: number;
    first_trip: string;
    last_trip: string;
    peak_hour: number;
    busiest_station: {
      station_name: string;
      total_trips: number;
    };
  }
  
  export interface ProjectedStation extends Station {
    x: number;
    y: number;
    radius: number;
    fx?: number | null;
    fy?: number | null;
    activityColor: string;
  }
  
  export interface ProjectedFlow extends Flow {
    source: ProjectedStation;
    target: ProjectedStation;
  }
  
  export interface ApiResponse<T> {
    data?: T;
    metadata?: {
      count?: number;
      timestamp?: string;
      [key: string]: any;
    };
    error?: string;
  }
  
  export interface StationsResponse {
    stations: Station[];
    metadata: {
      count: number;
      sort: string;
      limit: number;
      timestamp: string;
    };
  }
  
  export interface FlowsResponse {
    hour: number;
    flows: Flow[];
    metadata: {
      count: number;
      min_trips: number;
      limit: number;
      timestamp: string;
    };
  }
  
  export interface NetworkVisualizationProps {
    stations: Station[];
    flows: Flow[];
    selectedHour: number;
    onStationSelect?: (station: Station) => void;
    width?: number;
    height?: number;
  }
  
  export interface TimeControlsProps {
    selectedHour: number;
    onHourChange: (hour: number) => void;
    isLoading?: boolean;
    availableHours?: number[];
  }
  
  export interface StationDetailsProps {
    station?: Station | null;
    maxTrips: number;
    onClose?: () => void;
  }