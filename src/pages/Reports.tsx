import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Clock, Download, Flame, CalendarDays } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  LineChart, Line, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  format, parseISO, differenceInWeeks, differenceInMonths, startOfMonth, 
  endOfMonth, isWithinInterval, startOfWeek, endOfWeek, eachDayOfInterval,
  addWeeks, subWeeks, subMonths, getMonth, getYear, isSameMonth, isAfter,
  isBefore, min, addMonths
} from 'date-fns';

interface ReportStats {
  totalEntries: number;
  completed: number;
  pending: number;
  inProgress: number;
  totalHours: number;
  dayStreak: number;
  tags: { [key: string]: number };
  tools: { [key: string]: number };
  weeklyData: WeeklyHoursData[];
  monthlyData: { month: string; totalHours: number; completionRate: number }[];
  statusDistribution: { name: string; value: number; color: string }[];
}

interface WeeklyHoursData {
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  completionRate: number;
  days: { day: string; hours: number; date: Date }[];
}

const COLORS = ['#8B5CF6', '#0EA5E9', '#F97316', '#10B981', '#D946EF', '#FBBF24', '#EF4444', '#14B8A6', '#6366F1'];

const Reports = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [internshipPeriod, setInternshipPeriod] = useState<{start: Date | null, end: Date | null}>({
    start: null,
    end: null
  });
  const [stats, setStats] = useState<ReportStats>({
    totalEntries: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    totalHours: 0,
    dayStreak: 0,
    tags: {},
    tools: {},
    weeklyData: [],
    monthlyData: [],
    statusDistribution: []
  });

  useEffect(() => {
    fetchReportStats();
  }, []);

  // Count total days with entries
  const calculateDayStreak = (reports: any[]) => {
    if (!reports.length) return 0;
    const uniqueDates = [...new Set(reports.map(r => new Date(r.date).toISOString().split('T')[0]))];
    return uniqueDates.length;
  };

  const fetchReportStats = async () => {
    if (!user) return;

    try {
      // First get user profile to determine internship period
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('start_date, end_date')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      
      const startDate = profile?.start_date ? new Date(profile.start_date) : new Date();
      // Always use current date for end date if analyzing in real-time
      const currentDate = new Date();
      const endDate = profile?.end_date ? new Date(profile.end_date) : new Date();
      const analysisEndDate = isAfter(endDate, currentDate) ? currentDate : endDate;
      
      setInternshipPeriod({
        start: startDate,
        end: endDate
      });

      const { data: reports, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const totalHours = reports.reduce((sum, report) => sum + (report.time_spent / 60), 0);
      
      const completed = reports.filter(r => r.status === 'completed').length;
      const pending = reports.filter(r => r.status === 'pending').length;
      const inProgress = reports.filter(r => r.status === 'in progress' || r.status === 'in_progress' || r.status === 'inprogress').length;
      
      const newStats: ReportStats = {
        totalEntries: reports.length,
        completed,
        pending,
        inProgress,
        totalHours: parseFloat(totalHours.toFixed(1)),
        dayStreak: calculateDayStreak(reports),
        tags: {},
        tools: {},
        weeklyData: [],
        monthlyData: [],
        statusDistribution: [
          { name: 'Completed', value: completed, color: '#10B981' },
          { name: 'Pending', value: pending, color: '#FBBF24' },
          { name: 'In Progress', value: inProgress, color: '#0EA5E9' }
        ]
      };

      // Process tags and tools
      reports.forEach(report => {
        if (report.tags) {
          const tagList = report.tags.split(',').map((t: string) => t.trim());
          tagList.forEach((tag: string) => {
            newStats.tags[tag] = (newStats.tags[tag] || 0) + 1;
          });
        }
        if (report.skills_tools) {
          const toolsList = report.skills_tools.split(',').map((t: string) => t.trim());
          toolsList.forEach((tool: string) => {
            newStats.tools[tool] = (newStats.tools[tool] || 0) + 1;
          });
        }
      });

      // Create weekly data for reports during internship period
      // We're ensuring we include all weeks up to the current date
      const today = new Date();
      const endDateToUse = min([today, endDate]);
      const numWeeks = Math.max(1, differenceInWeeks(endDateToUse, startDate) + 1);
      
      const weeks = [];
      
      for (let i = 0; i < numWeeks; i++) {
        const weekStartDate = addWeeks(startDate, i);
        if (weekStartDate > endDateToUse) break;
        
        const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
        
        // Ensure we don't go beyond the end date
        const adjustedWeekEnd = isBefore(weekEnd, endDateToUse) ? weekEnd : endDateToUse;
        
        const weekDays = eachDayOfInterval({ 
          start: weekStart, 
          end: adjustedWeekEnd
        });
        
        const daysData = weekDays.map(date => ({
          day: format(date, 'EEE'),
          date: date,
          hours: 0
        }));
        
        // Calculate hours and completion rate for this week
        let weekTotalHours = 0;
        let weekCompleted = 0;
        let weekTotal = 0;
        
        reports.forEach(report => {
          const reportDate = new Date(report.date);
          
          if (isWithinInterval(reportDate, { start: weekStart, end: adjustedWeekEnd })) {
            const dayIndex = daysData.findIndex(day => 
              format(day.date, 'yyyy-MM-dd') === format(reportDate, 'yyyy-MM-dd')
            );
            
            if (dayIndex !== -1) {
              daysData[dayIndex].hours += (report.time_spent || 0) / 60;
              weekTotalHours += (report.time_spent || 0) / 60;
            }
            
            if (report.status === 'completed') weekCompleted++;
            weekTotal++;
          }
        });
        
        const completionRate = weekTotal > 0 ? (weekCompleted / weekTotal) * 100 : 0;
        
        weeks.push({
          weekStart: format(weekStart, 'MMM dd'),
          weekEnd: format(adjustedWeekEnd, 'MMM dd'),
          totalHours: parseFloat(weekTotalHours.toFixed(1)),
          completionRate: parseFloat(completionRate.toFixed(0)),
          days: daysData
        });
      }
      
      newStats.weeklyData = weeks;
      
      // Create monthly data - ensuring to include all months through the current date
      const months = [];
      // Calculate difference in months between start date and analysis end date
      const numMonths = Math.max(1, differenceInMonths(analysisEndDate, startDate) + 1);
      
      for (let i = 0; i < numMonths; i++) {
        const monthDate = addMonths(startDate, i);
        
        // Skip if this month is after our analysis end date
        if (isAfter(monthDate, analysisEndDate)) break;
        
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        
        // Ensure we don't go beyond the actual end date
        const actualMonthEnd = isBefore(monthEnd, analysisEndDate) ? monthEnd : analysisEndDate;
        
        // Calculate monthly metrics
        let monthlyHours = 0;
        let monthCompleted = 0;
        let monthTotal = 0;
        
        reports.forEach(report => {
          const reportDate = new Date(report.date);
          if (isWithinInterval(reportDate, { 
            start: monthStart, 
            end: actualMonthEnd 
          })) {
            monthlyHours += (report.time_spent || 0) / 60;
            if (report.status === 'completed') monthCompleted++;
            monthTotal++;
          }
        });
        
        const completionRate = monthTotal > 0 ? (monthCompleted / monthTotal) * 100 : 0;
        
        months.push({
          month: format(monthStart, 'MMM yyyy'),
          totalHours: parseFloat(monthlyHours.toFixed(1)),
          completionRate: parseFloat(completionRate.toFixed(0))
        });
      }
      
      newStats.monthlyData = months;
      
      setStats(newStats);
      setLoading(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching reports",
        description: error.message
      });
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!user) return;

    try {
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (reportsError) throw reportsError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!reports || reports.length === 0) {
        toast({
          variant: "destructive",
          title: "No data",
          description: "No reports found to export"
        });
        return;
      }

      const excelData = reports.map(report => ({
        'Date': new Date(report.date).toLocaleDateString(),
        'Status': report.status,
        'Time Spent (hours)': (report.time_spent / 60).toFixed(2),
        'Summary': report.summary,
        'Challenges': report.challenges,
        'Remarks': report.remarks,
        'Achievements': report.achievements,
        'Skills & Tools': report.skills_tools,
        'Tags': report.tags,
        'Created At': new Date(report.created_at).toLocaleString(),
        'Updated At': new Date(report.updated_at).toLocaleString()
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reports');
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(data, `intern-reports-${profile.full_name}-${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: "Export successful",
        description: "Your reports have been exported to Excel"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error.message
      });
    }
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'completionRate') return `${value}%`;
    return `${value}h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-vibrant-purple"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Overview of your internship progress</p>
        </div>
        <Button
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-white hover:bg-gray-100 shadow-sm"
          variant="outline"
        >
          <Download size={16} />
          Export to Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="stat-card p-4 border-t-4 border-t-vibrant-indigo">
          <div className="flex flex-col items-center text-center">
            <div className="stat-card-icon bg-gradient-to-br from-vibrant-indigo/20 to-vibrant-purple/20">
              <CheckCircle className="h-5 w-5 text-vibrant-indigo" />
            </div>
            <span className="text-xs text-gray-600 mb-1">Total Entries</span>
            <span className="text-xl font-bold text-gray-900">{stats.totalEntries}</span>
          </div>
        </Card>

        <Card className="stat-card p-4 border-t-4 border-t-vibrant-green">
          <div className="flex flex-col items-center text-center">
            <div className="stat-card-icon bg-gradient-to-br from-vibrant-green/20 to-vibrant-teal/20">
              <CheckCircle className="h-5 w-5 text-vibrant-green" />
            </div>
            <span className="text-xs text-gray-600 mb-1">Completed</span>
            <span className="text-xl font-bold text-gray-900">{stats.completed}</span>
          </div>
        </Card>

        <Card className="stat-card p-4 border-t-4 border-t-vibrant-blue">
          <div className="flex flex-col items-center text-center">
            <div className="stat-card-icon bg-gradient-to-br from-vibrant-blue/20 to-vibrant-indigo/20">
              <Clock className="h-5 w-5 text-vibrant-blue" />
            </div>
            <span className="text-xs text-gray-600 mb-1">Total Hours</span>
            <span className="text-xl font-bold text-gray-900">{stats.totalHours}h</span>
          </div>
        </Card>

        <Card className="stat-card p-4 border-t-4 border-t-vibrant-orange">
          <div className="flex flex-col items-center text-center">
            <div className="stat-card-icon bg-gradient-to-br from-vibrant-orange/20 to-vibrant-yellow/20">
              <Flame className="h-5 w-5 text-vibrant-orange" />
            </div>
            <span className="text-xs text-gray-600 mb-1">Days with Entries</span>
            <span className="text-xl font-bold text-gray-900">{stats.dayStreak}</span>
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="mb-4 bg-white shadow-sm">
          <TabsTrigger value="overview" className="data-[state=active]:bg-vibrant-purple/20 data-[state=active]:text-vibrant-purple">Overview</TabsTrigger>
          <TabsTrigger value="weekly" className="data-[state=active]:bg-vibrant-blue/20 data-[state=active]:text-vibrant-blue">Weekly Progress</TabsTrigger>
          <TabsTrigger value="monthly" className="data-[state=active]:bg-vibrant-green/20 data-[state=active]:text-vibrant-green">Monthly Progress</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="animate-slide-in">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Status Distribution Chart */}
            <Card className="chart-card overflow-hidden border-none">
              <CardHeader className="bg-gradient-to-r from-vibrant-indigo/10 to-vibrant-purple/10 border-b">
                <CardTitle className="text-base">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, entry) => {
                          const item = entry.payload;
                          return [`${value} entries (${((value as number) / stats.totalEntries * 100).toFixed(0)}%)`, item.name];
                        }}
                        contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', border: 'none' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Popular Skills Chart */}
            <Card className="chart-card overflow-hidden border-none">
              <CardHeader className="bg-gradient-to-r from-vibrant-blue/10 to-vibrant-teal/10 border-b">
                <CardTitle className="text-base">Popular Skills & Tools</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[240px] mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(stats.tools)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([name, value]) => ({ name, value }))}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', border: 'none' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {Object.entries(stats.tools)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 5)
                          .map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Weekly Progress Tab */}
        <TabsContent value="weekly" className="animate-slide-in">
          <Card className="chart-card overflow-hidden border-none">
            <CardHeader className="bg-gradient-to-r from-vibrant-blue/10 to-vibrant-indigo/10 border-b">
              <CardTitle className="text-base">Weekly Hours Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.weeklyData}
                    margin={{ top: 5, right: 30, left: 0, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis 
                      dataKey="weekStart" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value, index) => `W${index + 1}`}
                      label={{ 
                        value: 'Weeks', 
                        position: 'insideBottom', 
                        offset: -15,
                        fontSize: 12
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      label={{ 
                        value: 'Hours', 
                        angle: -90, 
                        position: 'insideLeft',
                        fontSize: 12
                      }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [`${value} hours`, 'Total Hours']}
                      labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                          const item = payload[0].payload;
                          return `Week ${item.weekStart} - ${item.weekEnd}`;
                        }
                        return label;
                      }}
                      contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', border: 'none' }}
                    />
                    <Bar 
                      dataKey="totalHours" 
                      name="Hours" 
                      radius={[4, 4, 0, 0]}
                    >
                      {stats.weeklyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 space-y-4">
                {stats.weeklyData.map((week, index) => (
                  <Card key={index} className="p-4 hover:shadow transition-shadow duration-200 bg-white">
                    <div className="flex justify-between mb-2">
                      <div>
                        <span className="font-medium">Week {index + 1}</span>
                        <span className="text-xs text-gray-500 ml-2">({week.weekStart} - {week.weekEnd})</span>
                      </div>
                      <div className="text-sm font-medium text-vibrant-blue">{week.totalHours}h</div>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1">
                      {week.days.map((day, i) => (
                        <div key={i} className="text-center">
                          <div className="text-xs text-gray-500 mb-1">{day.day}</div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full ${day.hours > 0 
                                ? `bg-gradient-to-r from-${COLORS[index % COLORS.length]}/70 to-${COLORS[(index + 2) % COLORS.length]}/70` 
                                : "bg-gray-200"}`}
                              style={{ width: `${Math.min(day.hours * 10, 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs mt-1 font-medium">{day.hours > 0 ? `${day.hours}h` : "-"}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Monthly Progress Tab */}
        <TabsContent value="monthly" className="animate-slide-in">
          <Card className="chart-card overflow-hidden border-none">
            <CardHeader className="bg-gradient-to-r from-vibrant-green/10 to-vibrant-teal/10 border-b">
              <CardTitle className="text-base">Monthly Hours</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={stats.monthlyData}
                    margin={{ top: 5, right: 30, left: 0, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis 
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      label={{ 
                        value: 'Months', 
                        position: 'insideBottom', 
                        offset: -15,
                        fontSize: 12
                      }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ 
                        value: 'Hours', 
                        angle: -90, 
                        position: 'insideLeft',
                        fontSize: 12
                      }}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value} hours`, 'Total Hours']} 
                      contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', border: 'none' }}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Line
                      type="monotone"
                      dataKey="totalHours"
                      name="Monthly Hours"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#8B5CF6' }}
                      activeDot={{ r: 6, fill: '#8B5CF6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6">
                <div className="grid gap-2">
                  {stats.monthlyData.map((month, index) => (
                    <Card key={index} className="p-4 hover:shadow-md transition-all duration-200 bg-white">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{month.month}</span>
                        <div className="flex items-center">
                          <span className="text-vibrant-blue font-medium">{month.totalHours} hours</span>
                          <div className="ml-4 bg-green-100 text-green-800 text-xs rounded-full px-2 py-0.5">
                            {month.completionRate}% completed
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-vibrant-purple to-vibrant-blue h-full"
                          style={{ 
                            width: `${Math.min((month.totalHours / (Math.max(...stats.monthlyData.map(m => m.totalHours)) * 1.2)) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="p-6 bg-gradient-to-r from-white to-gray-50 rounded-xl shadow-sm mt-6">
        <h2 className="text-lg font-medium mb-4 text-gray-900">Popular Tags</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.tags)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 12)
            .map(([tag, count], index) => (
              <div
                key={tag}
                className="px-3 py-1 rounded-full text-sm transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: `${COLORS[index % COLORS.length]}20`,
                  color: COLORS[index % COLORS.length],
                  border: `1px solid ${COLORS[index % COLORS.length]}40`
                }}
              >
                {tag} ({count})
              </div>
            ))
          }
        </div>
      </Card>
    </div>
  );
};

export default Reports;
