'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Download, Filter, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import Spinner from '@/components/ui/Spinner';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Define type for the data
type DeliveryReportData = {
  performance?: {
    totalConsignments: number;
    onTimeDeliveries: number;
    lateDeliveries: number;
    onTimeRate: number;
    avgDeliveryTime: number;
    statusCounts: {
      pending: number;
      inTransit: number;
      delivered: number;
      cancelled: number;
    };
  };
  monthly?: {
    month: number;
    year: number;
    totalConsignments: number;
    onTimeDeliveries: number;
    lateDeliveries: number;
    onTimeRate: number;
    avgDeliveryTime: number;
  }[];
  routes?: {
    route: string;
    sourceOffice: string;
    destinationOffice: string;
    totalConsignments: number;
    onTimeDeliveries: number;
    lateDeliveries: number;
    onTimeRate: number;
    avgDeliveryTime: number;
  }[];
};

type Office = {
  _id: string;
  name: string;
};

export default function DeliveryReports() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State management
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const [sourceOffice, setSourceOffice] = useState<string>('all');
  const [destinationOffice, setDestinationOffice] = useState<string>('all');
  const [reportType, setReportType] = useState<string>(
    searchParams.get('reportType') || 'performance'
  );
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<DeliveryReportData | null>(null);

  // Fetch offices on mount
  useEffect(() => {
    const fetchOffices = async () => {
      try {
        const response = await fetch('/api/offices');
        const data = await response.json();
        setOffices(data);
      } catch (err) {
        console.error('Error fetching offices:', err);
        setError('Failed to load office data');
      }
    };

    fetchOffices();
  }, []);

  // Fetch report data based on filters
  useEffect(() => {
    const fetchReportData = async () => {
      if (!dateRange?.from || !dateRange?.to) return;

      setLoading(true);
      setError(null);

      try {
        // Build query params
        const params = new URLSearchParams();
        params.append('startDate', dateRange.from.toISOString());
        params.append('endDate', dateRange.to.toISOString());
        params.append('reportType', reportType);
        
        if (sourceOffice !== 'all') {
          params.append('sourceOffice', sourceOffice);
        }
        
        if (destinationOffice !== 'all') {
          params.append('destinationOffice', destinationOffice);
        }

        const response = await fetch(`/api/reports/deliveries?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch report data');
        }
        
        const data = await response.json();
        setReportData(data.reportData);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Failed to load report data');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [dateRange, sourceOffice, destinationOffice, reportType]);

  // Handle filter application
  const applyFilters = () => {
    // Update URL with filters
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('startDate', dateRange.from.toISOString());
    if (dateRange?.to) params.append('endDate', dateRange.to.toISOString());
    params.append('reportType', reportType);
    if (sourceOffice !== 'all') params.append('sourceOffice', sourceOffice);
    if (destinationOffice !== 'all') params.append('destinationOffice', destinationOffice);
    
    router.push(`/reports/deliveries?${params.toString()}`);
  };

  const renderPerformanceReport = () => {
    if (!reportData?.performance) return null;
    
    const { totalConsignments, onTimeDeliveries, lateDeliveries, onTimeRate, avgDeliveryTime, statusCounts } = reportData.performance;
    
    // Prepare chart data for status
    const statusData = {
      labels: ['Pending', 'In Transit', 'Delivered', 'Cancelled'],
      datasets: [
        {
          label: 'Consignments by Status',
          data: [
            statusCounts.pending,
            statusCounts.inTransit,
            statusCounts.delivered,
            statusCounts.cancelled
          ],
          backgroundColor: [
            'rgba(255, 206, 86, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 99, 132, 0.6)',
          ],
        },
      ],
    };
    
    // Prepare chart data for delivery performance
    const performanceData = {
      labels: ['On-Time', 'Late'],
      datasets: [
        {
          label: 'Delivery Performance',
          data: [onTimeDeliveries, lateDeliveries],
          backgroundColor: [
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 99, 132, 0.6)',
          ],
        },
      ],
    };
    
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">Total Consignments</CardTitle>
              <CardDescription>All statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalConsignments}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">On-Time Rate</CardTitle>
              <CardDescription>Delivered consignments</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{(onTimeRate * 100).toFixed(1)}%</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">Avg. Delivery Time</CardTitle>
              <CardDescription>In hours</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{avgDeliveryTime.toFixed(1)} hrs</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Consignments by Status</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <Pie 
                data={statusData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Delivery Performance</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <Pie 
                data={performanceData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg">
                <span className="text-yellow-500 text-lg font-semibold">{statusCounts.pending}</span>
                <span className="text-sm text-gray-500">Pending</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg">
                <span className="text-blue-500 text-lg font-semibold">{statusCounts.inTransit}</span>
                <span className="text-sm text-gray-500">In Transit</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg">
                <span className="text-green-500 text-lg font-semibold">{statusCounts.delivered}</span>
                <span className="text-sm text-gray-500">Delivered</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-red-50 rounded-lg">
                <span className="text-red-500 text-lg font-semibold">{statusCounts.cancelled}</span>
                <span className="text-sm text-gray-500">Cancelled</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  const renderMonthlyReport = () => {
    if (!reportData?.monthly || reportData.monthly.length === 0) return null;
    
    // Prepare chart data for monthly performance
    const months = reportData.monthly.map(m => `${m.year}-${m.month.toString().padStart(2, '0')}`);
    const onTimeRates = reportData.monthly.map(m => m.onTimeRate * 100);
    const avgDeliveryTimes = reportData.monthly.map(m => m.avgDeliveryTime);
    
    const monthlyPerformanceData = {
      labels: months,
      datasets: [
        {
          label: 'On-Time Rate (%)',
          data: onTimeRates,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          yAxisID: 'y',
        },
        {
          label: 'Avg. Delivery Time (hrs)',
          data: avgDeliveryTimes,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          yAxisID: 'y1',
        },
      ],
    };
    
    return (
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Delivery Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-96">
            <Line 
              data={monthlyPerformanceData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    position: 'left',
                    title: {
                      display: true,
                      text: 'On-Time Rate (%)'
                    }
                  },
                  y1: {
                    beginAtZero: true,
                    position: 'right',
                    grid: {
                      drawOnChartArea: false,
                    },
                    title: {
                      display: true,
                      text: 'Avg. Delivery Time (hrs)'
                    }
                  },
                },
              }}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Monthly Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Month</th>
                    <th className="text-right py-3 px-4">Consignments</th>
                    <th className="text-right py-3 px-4">On-Time</th>
                    <th className="text-right py-3 px-4">Late</th>
                    <th className="text-right py-3 px-4">On-Time Rate</th>
                    <th className="text-right py-3 px-4">Avg. Delivery Time</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.monthly.map((month) => (
                    <tr key={`${month.year}-${month.month}`} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{`${month.year}-${month.month.toString().padStart(2, '0')}`}</td>
                      <td className="py-3 px-4 text-right">{month.totalConsignments}</td>
                      <td className="py-3 px-4 text-right">{month.onTimeDeliveries}</td>
                      <td className="py-3 px-4 text-right">{month.lateDeliveries}</td>
                      <td className="py-3 px-4 text-right font-medium">{(month.onTimeRate * 100).toFixed(1)}%</td>
                      <td className="py-3 px-4 text-right">{month.avgDeliveryTime.toFixed(1)} hrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  const renderRoutesReport = () => {
    if (!reportData?.routes || reportData.routes.length === 0) return null;
    
    // Prepare chart data for top routes by on-time rate
    const topRoutesByOnTime = [...reportData.routes]
      .sort((a, b) => b.onTimeRate - a.onTimeRate)
      .slice(0, 10);
    
    const routesOnTimeData = {
      labels: topRoutesByOnTime.map(r => r.route),
      datasets: [
        {
          label: 'On-Time Rate (%)',
          data: topRoutesByOnTime.map(r => r.onTimeRate * 100),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
        },
      ],
    };
    
    // Prepare chart data for top routes by volume
    const topRoutesByVolume = [...reportData.routes]
      .sort((a, b) => b.totalConsignments - a.totalConsignments)
      .slice(0, 10);
    
    const routesVolumeData = {
      labels: topRoutesByVolume.map(r => r.route),
      datasets: [
        {
          label: 'Consignments',
          data: topRoutesByVolume.map(r => r.totalConsignments),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
        },
      ],
    };
    
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Routes by On-Time Rate</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <Bar 
                data={routesOnTimeData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      title: {
                        display: true,
                        text: 'On-Time Rate (%)'
                      }
                    },
                  },
                }}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Top Routes by Volume</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <Bar 
                data={routesVolumeData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Total Consignments'
                      }
                    },
                  },
                }}
              />
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Route Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Route</th>
                    <th className="text-left py-3 px-4">Source</th>
                    <th className="text-left py-3 px-4">Destination</th>
                    <th className="text-right py-3 px-4">Consignments</th>
                    <th className="text-right py-3 px-4">On-Time Rate</th>
                    <th className="text-right py-3 px-4">Avg. Delivery Time</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.routes.map((route) => (
                    <tr key={route.route} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{route.route}</td>
                      <td className="py-3 px-4">{route.sourceOffice}</td>
                      <td className="py-3 px-4">{route.destinationOffice}</td>
                      <td className="py-3 px-4 text-right">{route.totalConsignments}</td>
                      <td className="py-3 px-4 text-right font-medium">{(route.onTimeRate * 100).toFixed(1)}%</td>
                      <td className="py-3 px-4 text-right">{route.avgDeliveryTime.toFixed(1)} hrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Delivery Reports</h1>
            <p className="text-muted-foreground">
              Analyze delivery performance and statistics
            </p>
          </div>
        </div>
        
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm font-medium mb-2">Date Range</p>
              <DateRangePicker 
                dateRange={dateRange} 
                setDateRange={setDateRange} 
                className="w-full"
              />
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">Source Office</p>
              <Select value={sourceOffice} onValueChange={setSourceOffice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Offices</SelectItem>
                  {offices.map((office) => (
                    <SelectItem key={office._id} value={office._id}>
                      {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">Destination Office</p>
              <Select value={destinationOffice} onValueChange={setDestinationOffice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Offices</SelectItem>
                  {offices.map((office) => (
                    <SelectItem 
                      key={office._id} 
                      value={office._id}
                      disabled={office._id === sourceOffice && sourceOffice !== 'all'}
                    >
                      {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button className="w-full" onClick={applyFilters}>
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs value={reportType} onValueChange={setReportType} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="performance">
            <CheckCircle className="mr-2 h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="monthly">
            <Clock className="mr-2 h-4 w-4" />
            Monthly Trends
          </TabsTrigger>
          <TabsTrigger value="routes">
            <XCircle className="mr-2 h-4 w-4" />
            Routes Analysis
          </TabsTrigger>
        </TabsList>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-500">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={applyFilters}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            <TabsContent value="performance">
              {renderPerformanceReport()}
            </TabsContent>
            
            <TabsContent value="monthly">
              {renderMonthlyReport()}
            </TabsContent>
            
            <TabsContent value="routes">
              {renderRoutesReport()}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
} 