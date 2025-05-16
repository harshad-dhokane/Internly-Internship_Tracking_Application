
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Clock, FileText, Bell, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [settings, setSettings] = useState({
    fullName: "",
    email: "",
    companyName: "",
    startDate: "",
    endDate: "",
    notifications: true,
    weeklyReport: true,
    darkMode: false,
    workHoursPerDay: 8,
  });

  useEffect(() => {
    const getProfile = async () => {
      if (!user) return;
      
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          variant: "destructive",
          title: "Failed to load profile",
          description: error.message,
        });
      } else if (data) {
        setProfile(data);
        setSettings(prev => ({
          ...prev,
          fullName: data.full_name || "",
          email: user.email || "",
          companyName: data.company_name || "",
          startDate: data.start_date || "",
          endDate: data.end_date || "",
        }));
      }
      
      setLoading(false);
    };
    
    if (user) {
      getProfile();
    }
  }, [user, toast]);

  const saveSettings = async () => {
    if (!user) return;
    
    // Update profile in Supabase
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: settings.fullName,
        company_name: settings.companyName,
        start_date: settings.startDate || null,
        end_date: settings.endDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to save settings",
        description: error.message,
      });
    } else {
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully",
      });
    }
  };

  const handleChange = (key: string, value: any) => {
    setSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    handleChange(name, value);
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to log out",
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-intern-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your app preferences</p>
      </div>

      <Card className="p-4 mb-4">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <FileText size={18} className="text-intern-primary" />
          <span>General Settings</span>
        </h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Your Name</Label>
            <Input 
              id="fullName"
              name="fullName"
              value={settings.fullName}
              onChange={handleInputChange}
              placeholder="Enter your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email"
              name="email"
              type="email"
              value={settings.email}
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input 
              id="companyName"
              name="companyName"
              value={settings.companyName}
              onChange={handleInputChange}
              placeholder="Enter company name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input 
                id="startDate"
                name="startDate"
                type="date"
                value={settings.startDate}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input 
                id="endDate"
                name="endDate"
                type="date"
                value={settings.endDate}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 mb-4">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Bell size={18} className="text-intern-primary" />
          <span>Notifications</span>
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Daily Reminders</p>
              <p className="text-sm text-gray-500">Receive daily reminders to add your entries</p>
            </div>
            <Switch 
              checked={settings.notifications} 
              onCheckedChange={(value) => handleChange("notifications", value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Summary</p>
              <p className="text-sm text-gray-500">Get weekly summary emails</p>
            </div>
            <Switch 
              checked={settings.weeklyReport} 
              onCheckedChange={(value) => handleChange("weeklyReport", value)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 mb-4">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Clock size={18} className="text-intern-primary" />
          <span>Work Hours</span>
        </h2>
        <div className="space-y-2">
          <Label htmlFor="workHoursPerDay">Hours per day</Label>
          <Input 
            id="workHoursPerDay"
            name="workHoursPerDay"
            type="number"
            min="1"
            max="24"
            value={settings.workHoursPerDay}
            onChange={handleInputChange}
          />
          <p className="text-xs text-gray-500 mt-1">
            Standard working hours per day (used for calculations)
          </p>
        </div>
      </Card>

      <Card className="p-4 mb-4">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <FileText size={18} className="text-intern-primary" />
          <span>Data Management</span>
        </h2>
        <div className="space-y-4">
          <div>
            <p className="font-medium text-destructive">Clear Data</p>
            <p className="text-xs text-gray-500 mt-1">Warning: This will permanently delete all your data</p>
            <Button className="mt-2 w-full" variant="destructive">
              Clear All Data
            </Button>
          </div>
        </div>
      </Card>

      <Button className="w-full mb-4" onClick={saveSettings}>
        Save Settings
      </Button>

      <Button 
        variant="destructive" 
        className="w-full flex items-center justify-center gap-2"
        onClick={handleLogout}
      >
        <LogOut size={16} />
        <span>Logout</span>
      </Button>
    </div>
  );
};

export default Settings;
