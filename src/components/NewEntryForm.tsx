import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";

interface NewEntryFormProps {
  onSuccess?: () => void;
  editData?: any;
  isEditing?: boolean;
  hideHeader?: boolean;
  hideFooter?: boolean;
}

const NewEntryForm = ({ onSuccess, editData, isEditing = false, hideHeader = false, hideFooter = false }: NewEntryFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    remarks: "",
    challenges: "",
    status: "pending",
    skills_tools: "",
    tags: "",
    hours: 0,
    minutes: 0
  });

  // Load edit data if provided
  useEffect(() => {
    if (editData && isEditing) {
      const timeSpent = editData.time_spent || 0;
      const hours = Math.floor(timeSpent / 60);
      const minutes = timeSpent % 60;
      
      // Ensure we properly format the date for the input element
      let entryDate = editData.date;
      // If the date is in a display format (e.g., "May 09, 2025"), convert it back to YYYY-MM-DD
      if (editData.date && !editData.date.includes('-')) {
        try {
          const dateObj = new Date(editData.date);
          if (!isNaN(dateObj.getTime())) {
            entryDate = dateObj.toISOString().split('T')[0];
          }
        } catch (err) {
          console.error("Error parsing date:", err);
        }
      }
      
      setNewEntry({
        title: editData.summary || "",
        description: editData.achievements || "",
        date: entryDate || new Date().toISOString().split('T')[0],
        remarks: editData.remarks || "",
        challenges: editData.challenges || "",
        status: editData.status || "pending",
        skills_tools: editData.skills_tools || "",
        tags: editData.tags || "",
        hours,
        minutes
      });
    }
  }, [editData, isEditing]);

  const handleAddEntry = async () => {
    if (!user) return;
    
    if (!newEntry.title) {
      toast({
        title: "Entry title required",
        description: "Please enter a title for your entry",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      if (isEditing && editData) {
        // Update existing entry
        const { error } = await supabase
          .from('reports')
          .update({
            summary: newEntry.title,
            achievements: newEntry.description,
            remarks: newEntry.remarks,
            challenges: newEntry.challenges,
            date: newEntry.date, // Keep the original date
            status: newEntry.status,
            skills_tools: newEntry.skills_tools,
            tags: newEntry.tags,
            time_spent: (newEntry.hours * 60) + newEntry.minutes
          })
          .eq('id', editData.id);
          
        if (error) throw error;
        
        toast({
          title: "Entry updated",
          description: "Your entry has been updated successfully",
        });
      } else {
        // Add new entry
        const { error } = await supabase
          .from('reports')
          .insert({
            user_id: user.id,
            summary: newEntry.title,
            achievements: newEntry.description,
            remarks: newEntry.remarks,
            challenges: newEntry.challenges,
            date: newEntry.date,
            status: newEntry.status,
            skills_tools: newEntry.skills_tools,
            tags: newEntry.tags,
            time_spent: (newEntry.hours * 60) + newEntry.minutes
          });
          
        if (error) throw error;
        
        toast({
          title: "Entry added",
          description: "Your new entry has been added successfully",
        });
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error with entry:', error);
      toast({
        variant: "destructive",
        title: isEditing ? "Failed to update entry" : "Failed to add entry",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none h-full">
      {!hideHeader && (
        <CardHeader className="bg-gradient-to-r from-vibrant-blue/10 to-vibrant-teal/10 p-6 border-b">
          <CardTitle className="text-lg font-bold text-gray-800">
            {isEditing ? "Edit Entry" : "Add New Entry"}
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">
            {isEditing ? "Update your internship activity" : "Record your daily internship activities"}
          </CardDescription>
        </CardHeader>
      )}
      
      <CardContent className="p-6 overflow-y-auto" style={{maxHeight: hideFooter ? "none" : "calc(90vh - 140px)"}}>
        <form 
          id="new-entry-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddEntry();
          }}
          className="grid gap-4" >

          <div className="grid gap-2">
            <Label htmlFor="date" className="text-gray-700">Date</Label>
            <Input 
              id="date" 
              type="date"
              value={newEntry.date}
              onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
              className="border-gray-300 focus:border-vibrant-blue focus:ring-vibrant-blue/20"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-gray-700">Task Title</Label>
            <Input 
              id="title" 
              value={newEntry.title}
              onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
              placeholder="What did you work on?"
              className="border-gray-300 focus:border-vibrant-blue focus:ring-vibrant-blue/20"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description" className="text-gray-700">Description</Label>
            <Textarea 
              id="description"
              value={newEntry.description}
              onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
              placeholder="Describe what you learned or accomplished..."
              className="border-gray-300 focus:border-vibrant-blue focus:ring-vibrant-blue/20 min-h-[80px]"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="skills_tools" className="text-gray-700">Skills/Tools Used</Label>
            <Input 
              id="skills_tools" 
              value={newEntry.skills_tools}
              onChange={(e) => setNewEntry({...newEntry, skills_tools: e.target.value})}
              placeholder="Skills or tools you used for this task"
              className="border-gray-300 focus:border-vibrant-blue focus:ring-vibrant-blue/20"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status" className="text-gray-700">Status</Label>
            <Select
              value={newEntry.status}
              onValueChange={(value) => setNewEntry({...newEntry, status: value})}
            >
              <SelectTrigger className="border-gray-300 focus:border-vibrant-blue focus:ring-vibrant-blue/20">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tags" className="text-gray-700">Tags</Label>
            <Input 
              id="tags" 
              value={newEntry.tags}
              onChange={(e) => setNewEntry({...newEntry, tags: e.target.value})}
              placeholder="e.g. coding, meeting, research (comma separated)"
              className="border-gray-300 focus:border-vibrant-blue focus:ring-vibrant-blue/20"
            />
          </div>
          <div>
            <Label className="text-gray-700">Time Spent</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <Label htmlFor="hours" className="text-xs text-gray-500">Hours</Label>
                <Input 
                  id="hours" 
                  type="number"
                  min="0"
                  value={newEntry.hours}
                  onChange={(e) => setNewEntry({...newEntry, hours: parseInt(e.target.value) || 0})}
                  className="border-gray-300 focus:border-vibrant-blue focus:ring-vibrant-blue/20"
                />
              </div>
              <div>
                <Label htmlFor="minutes" className="text-xs text-gray-500">Minutes</Label>
                <Input 
                  id="minutes" 
                  type="number"
                  min="0"
                  max="59"
                  value={newEntry.minutes}
                  onChange={(e) => setNewEntry({...newEntry, minutes: parseInt(e.target.value) || 0})}
                  className="border-gray-300 focus:border-vibrant-blue focus:ring-vibrant-blue/20"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="challenges" className="text-gray-700">Challenges</Label>
            <Textarea 
              id="challenges"
              value={newEntry.challenges}
              onChange={(e) => setNewEntry({...newEntry, challenges: e.target.value})}
              placeholder="What challenges did you face during this task?"
              className="border-gray-300 focus:border-vibrant-blue focus:ring-vibrant-blue/20 min-h-[80px]"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="remarks" className="text-gray-700">Remarks</Label>
            <Textarea 
              id="remarks"
              value={newEntry.remarks}
              onChange={(e) => setNewEntry({...newEntry, remarks: e.target.value})}
              placeholder="Any additional notes or comments about this entry"
              className="border-gray-300 focus:border-vibrant-blue focus:ring-vibrant-blue/20 min-h-[80px]"
            />
          </div>
        </form>
      </CardContent>
      
      {!hideFooter && (
        <CardFooter className="flex justify-end gap-2 p-4 bg-gray-50 border-t">
          <Button 
            type="submit" 
            onClick={handleAddEntry}
            disabled={loading}
            className="bg-gradient-to-r from-vibrant-blue to-vibrant-indigo hover:opacity-90 text-white"
          >
            {loading ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update Entry' : 'Save Entry')}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default NewEntryForm;
