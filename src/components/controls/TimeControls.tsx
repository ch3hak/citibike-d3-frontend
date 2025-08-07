import React from 'react';
import { motion } from 'framer-motion';
import { Clock, /*Calendar*/ } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { TimeControlsProps } from '@/types/citibike';
import { getHourLabel, cn } from '@/lib/utils';

const TimeControls: React.FC<TimeControlsProps> = ({ 
  selectedHour, 
  onHourChange, 
  isLoading = false,
  availableHours = [7, 8, 9, 17, 18, 19] 
}) => {
  const morningHours = availableHours.filter(h => h < 12);
  const eveningHours = availableHours.filter(h => h >= 17);

  const getRushPeriodType = (hour: number): 'morning' | 'evening' => {
    return hour < 12 ? 'morning' : 'evening';
  };

  const getCurrentPeriodLabel = (): string => {
    return getRushPeriodType(selectedHour) === 'morning' ? 'Morning Rush' : 'Evening Rush';
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Clock className="h-5 w-5" />
          Time Period
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {getCurrentPeriodLabel()}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {getHourLabel(selectedHour)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Select Hour
          </label>
          <Select 
            value={selectedHour.toString()} 
            onValueChange={(value) => onHourChange(parseInt(value))}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose time period" />
            </SelectTrigger>
            <SelectContent>
              {availableHours.map(hour => (
                <SelectItem key={hour} value={hour.toString()}>
                  <div className="flex items-center justify-between w-full">
                    <span>{getHourLabel(hour)}</span>
                    <Badge variant="outline" /*size="sm"*/ className="ml-2">
                      {getRushPeriodType(hour) === 'morning' ? 'AM Rush' : 'PM Rush'}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-400 rounded-full" />
            <span className="text-sm font-medium">Morning Rush</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {morningHours.map(hour => (
              <motion.div
                key={hour}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant={selectedHour === hour ? "default" : "outline"}
                  size="sm"
                  onClick={() => onHourChange(hour)}
                  disabled={isLoading}
                  className={cn(
                    "w-full text-xs transition-all",
                    selectedHour === hour && "shadow-lg"
                  )}
                >
                  {hour}:00
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Evening Rush Buttons */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-400 rounded-full" />
            <span className="text-sm font-medium">Evening Rush</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {eveningHours.map(hour => (
              <motion.div
                key={hour}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant={selectedHour === hour ? "default" : "outline"}
                  size="sm"
                  onClick={() => onHourChange(hour)}
                  disabled={isLoading}
                  className={cn(
                    "w-full text-xs transition-all",
                    selectedHour === hour && "shadow-lg"
                  )}
                >
                  {hour > 12 ? hour - 12 : hour}:00
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-4"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Loading data...
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimeControls;