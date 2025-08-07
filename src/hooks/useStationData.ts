import {useState, useEffect, useCallback} from 'react';
import type {Station, Flow, SystemStats, StationsResponse, FlowsResponse} from '../types/citibike';
import apiClient from '../lib/api';

interface UseStationDataReturn {
  stations: Station[];
  flows: Flow[];
  stats: SystemStats | null;
  loading: boolean;
  error: string | null;
  fetchStations: (params?: Record<string, string | number>) => Promise<void>;
  fetchFlows: (hour: number, params?: Record<string, string | number>) => Promise<void>;
  fetchStats: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const useStationData = (): UseStationDataReturn => {
  const [stations, setStations] = useState<Station[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStations = useCallback(async (params: Record<string, string | number> = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response: StationsResponse = await apiClient.getStations(params);

      const parsedStations: Station[] = (response.stations || []).map(st => ({
        ...st,
        lat: Number(st.lat),
        lng: Number(st.lng),
      }));  

      setStations(parsedStations || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stations';
      setError(errorMessage);
      console.error('Failed to fetch stations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFlows = useCallback(async (
    hour: number, 
    params: Record<string, string | number> = {}
  ) => {
    try {
      setLoading(true);
      setError(null);
      const response: FlowsResponse = await apiClient.getFlows(hour, params);
      setFlows(response.flows || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch flows';
      setError(errorMessage);
      console.error('Failed to fetch flows:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response: SystemStats = await apiClient.getStats();
      setStats(response);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const refetch = useCallback(async () => {
    await Promise.all([
      fetchStations(),
      fetchStats()
    ]);
  }, [fetchStations, fetchStats]);

  useEffect(() => {
    fetchStations();
    fetchStats();
  }, [fetchStations, fetchStats]);

  return {
    stations,
    flows,
    stats,
    loading,
    error,
    fetchStations,
    fetchFlows,
    fetchStats,
    refetch
  };
};

export default useStationData;