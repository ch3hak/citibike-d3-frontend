import type { 
    Station, 
    // Flow, 
    Trip, 
    SystemStats, 
    StationsResponse, 
    FlowsResponse,
    // ApiResponse 
  } from '@/types/citibike';
  
  const API_BASE_URL = 'http://localhost:3000/api';
  
  class ApiClient {
    private baseURL: string;
  
    constructor(baseURL: string = API_BASE_URL) {
      this.baseURL = baseURL;
    }
  
    private async request<T>(
      endpoint: string, 
      options: RequestInit = {}
    ): Promise<T> {
      const url = `${this.baseURL}${endpoint}`;
      const config: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      };
  
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json() as T;
      } catch (error) {
        console.error(`API request failed: ${endpoint}`, error);
        throw error;
      }
    }
  
    async getStations(params: Record<string, string | number> = {}): Promise<StationsResponse> {
      const queryString = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString();
      return this.request<StationsResponse>(`/stations${queryString ? `?${queryString}` : ''}`);
    }
  
    async getStation(id: string): Promise<{ station: Station; timestamp: string }> {
      return this.request<{ station: Station; timestamp: string }>(`/stations/${id}`);
    }
  
    async getFlows(
      hour: number, 
      params: Record<string, string | number> = {}
    ): Promise<FlowsResponse> {
      const queryString = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString();
      return this.request<FlowsResponse>(`/flows/${hour}${queryString ? `?${queryString}` : ''}`);
    }
  
    async getFlowsSummary(): Promise<{
      hourly_summary: Array<{
        hour: number;
        unique_flows: number;
        total_trips: number;
        avg_trips_per_flow: number;
        max_trips_in_flow: number;
      }>;
      metadata: { total_hours: number; timestamp: string };
    }> {
      return this.request('/flows');
    }

    async getStats(): Promise<SystemStats> {
      return this.request<SystemStats>('/stats');
    }
  
    async getStreamTrips(
      hour: number, 
      params: Record<string, string | number> = {}
    ): Promise<{
      hour: number;
      trips: Trip[];
      metadata: { count: number; timestamp: string };
    }> {
      const queryString = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString();
      return this.request(`/stream/trips/${hour}${queryString ? `?${queryString}` : ''}`);
    }
  }
  
  export const apiClient = new ApiClient();
  export default apiClient;
  