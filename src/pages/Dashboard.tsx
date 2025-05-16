
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart as BarChartIcon, Calendar, CheckCircle, Clock, FileText, Flame, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardData {
  fullName: string;
  companyName: string;
  completedEntries: number;
  pendingEntries: number;
  totalHours: number;
  dayStreak: number;
  weeklyEntries: { day: string; hours: number; date: Date }[];
  recentEntries: {
    id: string;
    title: string;
    description: string;
    date: string;
    status: string;
  }[];
}

const COLORS = ['#8B5CF6', '#0EA5E9', '#F97316', '#10B981', '#D946EF', '#FBBF24', '#EF4444', '#14B8A6', '#6366F1'];

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    fullName: "",
    companyName: "",
    completedEntries: 0,
    pendingEntries: 0,
    totalHours: 0,
    dayStreak: 0,
    weeklyEntries: [],
    recentEntries: [],
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) throw profileError;
        
        const { data: entriesData, error: entriesError } = await supabase
          .from('reports')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });
          
        if (entriesError) throw entriesError;
        if (!entriesData) return;

        const completedEntries = entriesData.filter(entry => entry.status === 'completed').length;
        const pendingEntries = entriesData.filter(entry => entry.status === 'pending' || entry.status === 'in progress').length;
        
        // Get unique days with entries
        const uniqueDates = [...new Set(entriesData.map(entry => new Date(entry.date).toISOString().split('T')[0]))];
        const daysWithEntries = uniqueDates.length;

        const totalHours = entriesData.reduce((total, entry) => {
          return total + ((entry.time_spent || 0) / 60);
        }, 0);
        
        // Generate dates for current week only
        const today = new Date();
        const startWeek = startOfWeek(today, { weekStartsOn: 1 });
        const endWeek = endOfWeek(today, { weekStartsOn: 1 });
        
        // Create array of days for current week
        const weekDays = eachDayOfInterval({ start: startWeek, end: endWeek });
        const weeklyHours = weekDays.map(date => ({
          day: format(date, 'EEE'),
          date: date,
          hours: 0
        }));
        
        // Fill in the hours data for each day this week
        entriesData.forEach(entry => {
          const entryDate = new Date(entry.date);
          
          // Update weekly data
          const weekDayIndex = weeklyHours.findIndex(
            day => format(day.date, 'yyyy-MM-dd') === format(entryDate, 'yyyy-MM-dd')
          );
          if (weekDayIndex !== -1) {
            weeklyHours[weekDayIndex].hours += (entry.time_spent || 0) / 60;
          }
        });

        const recentEntries = entriesData.slice(0, 3).map(entry => ({
          id: entry.id,
          title: entry.summary || "",
          description: entry.achievements || "",
          date: format(new Date(entry.date), 'MMM dd, yyyy'),
          status: entry.status || "pending"
        }));

        setDashboardData({
          fullName: profileData?.full_name || 'Intern',
          companyName: profileData?.company_name || 'Your Company',
          completedEntries,
          pendingEntries,
          totalHours,
          dayStreak: daysWithEntries,
          weeklyEntries: weeklyHours,
          recentEntries,
        });
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        toast({
          variant: "destructive",
          title: "Failed to load dashboard data",
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-vibrant-purple"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Track your internship progress</p>
        </div>
        <div className="bg-gradient-to-br from-vibrant-purple to-vibrant-blue rounded-full w-10 h-10 flex items-center justify-center">
          <Users size={20} className="text-white" />
        </div>
      </div>

      {/* Welcome Card */}
      <Card className="p-4 mb-4 border-none shadow-md bg-white hover:shadow-lg transition-shadow duration-300">
        <h2 className="text-lg font-medium mb-1">Hi, {dashboardData.fullName}!</h2>
        <h4 className="text-lg font-medium mb-1">At {dashboardData.companyName}</h4>
        <p className="text-sm text-gray-500 mb-2">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        <div className="text-xs text-gray-400 border-t pt-2 mt-2 text-right">
          {"Developed by Harshad Dhokane"}
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="stat-card p-4 border-t-4 border-t-vibrant-indigo">
          <div className="flex flex-col items-center">
            <div className="stat-card-icon bg-gradient-to-br from-vibrant-indigo/20 to-vibrant-purple/20">
              <CheckCircle size={16} className="text-vibrant-indigo" />
            </div>
            <span className="text-xs text-gray-500">Completed Entries</span>
            <span className="text-2xl font-bold">{dashboardData.completedEntries}</span>
          </div>
        </Card>

        <Card className="stat-card p-4 border-t-4 border-t-vibrant-yellow">
          <div className="flex flex-col items-center">
            <div className="stat-card-icon bg-gradient-to-br from-vibrant-yellow/20 to-vibrant-orange/20">
              <Clock size={16} className="text-vibrant-yellow" />
            </div>
            <span className="text-xs text-gray-500">Pending/ In-progress</span>
            <span className="text-2xl font-bold">{dashboardData.pendingEntries}</span>
          </div>
        </Card>

        <Card className="stat-card p-4 border-t-4 border-t-vibrant-blue">
          <div className="flex flex-col items-center">
            <div className="stat-card-icon bg-gradient-to-br from-vibrant-blue/20 to-vibrant-indigo/20">
              <Clock size={16} className="text-vibrant-blue" />
            </div>
            <span className="text-xs text-gray-500">Total Hours</span>
            <span className="text-2xl font-bold">{dashboardData.totalHours.toFixed(1)}</span>
          </div>
        </Card>

        <Card className="stat-card p-4 border-t-4 border-t-vibrant-orange">
          <div className="flex flex-col items-center">
            <div className="stat-card-icon bg-gradient-to-br from-vibrant-orange/20 to-vibrant-yellow/20">
              <Flame size={16} className="text-vibrant-orange" />
            </div>
            <span className="text-xs text-gray-500">Days with Entries</span>
            <span className="text-2xl font-bold">{dashboardData.dayStreak}</span>
          </div>
        </Card>
      </div>

      {/* Weekly Activity Card */}
      <div className="mb-6">
        <Card className="chart-card overflow-hidden border-none">
          <div className="p-4 border-b bg-gradient-to-r from-vibrant-blue/10 to-vibrant-indigo/10">
            <h3 className="font-semibold text-gray-700">This Week's Activity</h3>
            <p className="text-xs text-gray-500">
              {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="p-4">
            {dashboardData.weeklyEntries.map((day, index) => (
              <div key={index} className="mb-3 last:mb-0">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{day.day}, {format(day.date, 'MMM d')}</span>
                  <span className="text-gray-600">{day.hours.toFixed(1)}h</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full"
                    style={{ 
                      width: `${Math.min(day.hours * 10, 100)}%`,
                      background: `linear-gradient(to right, ${COLORS[index % COLORS.length]}aa, ${COLORS[(index + 2) % COLORS.length]}aa)`
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Entries */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-700">Recent Entries</h3>
        <a href="/entries" className="text-sm text-vibrant-purple">View All</a>
      </div>
      <Card className="chart-card overflow-hidden border-none mb-4">
        {dashboardData.recentEntries.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No entries yet. Add your first entry!
          </div>
        ) : (
          dashboardData.recentEntries.map((entry, i) => (
            <div 
              key={entry.id}
              className={`p-4 flex justify-between items-center ${
                i < dashboardData.recentEntries.length - 1 ? "border-b" : ""
              } hover:bg-gray-50 transition-colors duration-200`}
            >
              <div>
                <p className="font-medium">{entry.title}</p>
                <p className="text-xs text-gray-500">{entry.date}</p>
              </div>
              <span 
                className={`text-xs px-2 py-1 rounded-full ${
                  entry.status === "completed" 
                    ? "bg-green-100 text-green-700"
                    : entry.status === "in progress"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {entry.status === "in progress" ? "In Progress" : 
                 entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
              </span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
