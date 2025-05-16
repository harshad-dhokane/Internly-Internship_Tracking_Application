import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { FileText, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NewEntryForm from "@/components/NewEntryForm";

interface Entry {
  id: string;
  summary: string;
  achievements: string | null;
  challenges: string | null;
  remarks: string | null;
  date: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  status: string;
  skills_tools: string | null;
  tags: string | null;
  time_spent: number;
}

interface NewEntry {
  title: string;
  description: string;
  date: string;
  remarks: string;
  challenges: string;
  status: string;
  skills_tools: string;
  tags: string;
  hours: number;
  minutes: number;
}

const Entries = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const [newEntry, setNewEntry] = useState<NewEntry>({
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
      const { data, error } = await supabase
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
        })
        .select();
        
      if (error) throw error;
      
      setNewEntry({
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
      
      setOpen(false);
      fetchEntries();
      
      toast({
        title: "Entry added",
        description: "Your new entry has been added successfully",
      });
    } catch (error: any) {
      console.error('Error adding entry:', error);
      toast({
        variant: "destructive",
        title: "Failed to add entry",
        description: error.message,
      });
    }
  };

  const handleEditEntry = async () => {
    if (!user || !editingEntry) return;
    
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          summary: newEntry.title,
          achievements: newEntry.description,
          remarks: newEntry.remarks,
          challenges: newEntry.challenges,
          date: newEntry.date, // Keeping the date from the form
          status: newEntry.status,
          skills_tools: newEntry.skills_tools,
          tags: newEntry.tags,
          time_spent: (newEntry.hours * 60) + newEntry.minutes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingEntry.id);
        
      if (error) throw error;
      
      setEditingEntry(null);
      setOpen(false);
      fetchEntries();
      
      toast({
        title: "Entry updated",
        description: "Your entry has been updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating entry:', error);
      toast({
        variant: "destructive",
        title: "Failed to update entry",
        description: error.message,
      });
    }
  };

  const startEditing = (entry: Entry) => {
    // Format the date properly for the input element
    let formattedDate = "";
    
    try {
      // Convert the display date format back to YYYY-MM-DD for the input
      const dateObj = new Date(entry.date);
      formattedDate = dateObj.toISOString().split('T')[0];
    } catch (err) {
      console.error("Error parsing date:", err);
      formattedDate = new Date().toISOString().split('T')[0];
    }
    
    const hours = Math.floor(entry.time_spent / 60);
    const minutes = entry.time_spent % 60;
    
    setNewEntry({
      title: entry.summary,
      description: entry.achievements || "",
      date: formattedDate, // Use correctly formatted date
      remarks: entry.remarks || "",
      challenges: entry.challenges || "",
      status: entry.status,
      skills_tools: entry.skills_tools || "",
      tags: entry.tags || "",
      hours,
      minutes
    });
    
    setEditingEntry(entry);
    setOpen(true);
  };

  const viewEntryDetails = (entry: Entry) => {
    setSelectedEntry(entry);
    setDetailsOpen(true);
  };

  const handleDeleteEntry = async () => {
    if (!user || !entryToDelete) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', entryToDelete);
        
      if (error) throw error;
      
      // Update the local state to remove the deleted entry
      setEntries(entries.filter(entry => entry.id !== entryToDelete));
      
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
      
      toast({
        title: "Entry deleted",
        description: "Your entry has been deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      toast({
        variant: "destructive",
        title: "Failed to delete entry",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [user]);
  
  const fetchEntries = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        const formattedEntries = data.map(entry => {
          try {
            const dateObj = new Date(entry.date);
            if (isNaN(dateObj.getTime())) {
              throw new Error('Invalid date');
            }
            return {
              ...entry,
              date: format(dateObj, 'MMM dd, yyyy')
            };
          } catch (dateError) {
            console.error('Error formatting date:', dateError);
            return {
              ...entry,
              date: new Date(entry.date).toLocaleDateString() || entry.date
            };
          }
        });
        
        setEntries(formattedEntries);
      }
    } catch (error: any) {
      console.error('Error fetching entries:', error);
      toast({
        variant: "destructive",
        title: "Failed to load entries",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEntryStatus = async (id: string, currentStatus: string) => {
    try {
      let newStatus: string = currentStatus;
      
      switch(currentStatus.toLowerCase()) {
        case "completed":
          newStatus = "completed";
          break;
        case "in progress":
          newStatus = "in progress";
          break;
        case "pending":
          newStatus = "pending";
          break;
        default:
          newStatus = "pending";
      }
      
      const { error } = await supabase
        .from('reports')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (error) throw error;
      
      setEntries(entries.map(entry => 
        entry.id === id 
          ? { 
              ...entry, 
              status: newStatus,
              updated_at: new Date().toISOString()
            } 
          : entry
      ));
      
      toast({
        title: "Status updated",
        description: `Entry marked as ${newStatus}`,
      });
    } catch (error: any) {
      console.error('Error updating entry status:', error);
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description: error.message,
      });
    }
  };
  
  const filteredEntries = entries.filter(entry => 
    entry.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (entry.achievements?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (entry.remarks?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (entry.challenges?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Entries</h1>
          <p className="page-subtitle">Record your daily internship activities</p>
        </div>
        <div className="bg-gradient-to-br from-vibrant-blue to-vibrant-purple rounded-full w-10 h-10 flex items-center justify-center">
          <FileText size={20} className="text-white" />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent 
            className="max-w-4xl max-h-[90vh] p-0 overflow-hidden rounded-xl border-none shadow-lg"
          >
            {editingEntry ? (
              <Card className="border-none h-full">
                <CardHeader className="bg-gradient-to-r from-vibrant-purple/10 to-vibrant-blue/10 p-6 border-b">
                  <CardTitle>Edit Entry</CardTitle>
                </CardHeader>
                <CardContent className="p-6 overflow-y-auto" style={{maxHeight: "calc(90vh - 140px)"}}>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="date">Date</Label>
                      <Input 
                        id="date" 
                        type="date"
                        value={newEntry.date}
                        onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="title">Task Title</Label>
                      <Input 
                        id="title" 
                        value={newEntry.title}
                        onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
                        placeholder="What did you work on?"
                        className="border-vibrant-blue/20 focus:border-vibrant-blue"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description"
                        value={newEntry.description}
                        onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                        placeholder="Describe what you learned or accomplished..."
                        className="border-vibrant-blue/20 focus:border-vibrant-blue"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="skills_tools">Skills/Tools Used</Label>
                      <Input 
                        id="skills_tools" 
                        value={newEntry.skills_tools}
                        onChange={(e) => setNewEntry({...newEntry, skills_tools: e.target.value})}
                        placeholder="Skills or tools you used for this task"
                        className="border-vibrant-blue/20 focus:border-vibrant-blue"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={newEntry.status}
                        onValueChange={(value) => setNewEntry({...newEntry, status: value})}
                      >
                        <SelectTrigger className="border-vibrant-blue/20 focus:border-vibrant-blue">
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
                      <Label htmlFor="tags">Tags</Label>
                      <Input 
                        id="tags" 
                        value={newEntry.tags}
                        onChange={(e) => setNewEntry({...newEntry, tags: e.target.value})}
                        placeholder="e.g. coding, meeting, research (comma separated)"
                        className="border-vibrant-blue/20 focus:border-vibrant-blue"
                      />
                    </div>
                    <div>
                      <Label>Time Spent</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <Label htmlFor="hours" className="text-xs text-gray-500">Hours</Label>
                          <Input 
                            id="hours" 
                            type="number"
                            min="0"
                            value={newEntry.hours}
                            onChange={(e) => setNewEntry({...newEntry, hours: parseInt(e.target.value) || 0})}
                            className="border-vibrant-blue/20 focus:border-vibrant-blue"
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
                            className="border-vibrant-blue/20 focus:border-vibrant-blue"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="challenges">Challenges</Label>
                      <Textarea 
                        id="challenges"
                        value={newEntry.challenges}
                        onChange={(e) => setNewEntry({...newEntry, challenges: e.target.value})}
                        placeholder="What challenges did you face during this task?"
                        className="border-vibrant-blue/20 focus:border-vibrant-blue"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="remarks">Remarks</Label>
                      <Textarea 
                        id="remarks"
                        value={newEntry.remarks}
                        onChange={(e) => setNewEntry({...newEntry, remarks: e.target.value})}
                        placeholder="Any additional notes or comments about this entry"
                        className="border-vibrant-blue/20 focus:border-vibrant-blue"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 p-4 bg-gray-50 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setOpen(false);
                      setEditingEntry(null);
                      setNewEntry({
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
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    onClick={handleEditEntry}
                    className="bg-gradient-to-r from-vibrant-blue to-vibrant-purple hover:opacity-90"
                  >
                    Update Entry
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <NewEntryForm onSuccess={() => {
                setOpen(false);
                fetchEntries();
              }} />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <Input 
          className="pl-10 border-vibrant-blue/20 focus:border-vibrant-blue" 
          placeholder="Search entries..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-vibrant-purple"></div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <Card className="p-6 text-center border-none shadow-md">
            <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-gray-500">No entries found. Add your first entry!</p>
          </Card>
        ) : (
          filteredEntries.map((entry) => (
            <Card 
              key={entry.id} 
              className="entry-card cursor-pointer"
              onClick={() => viewEntryDetails(entry)}
            >
              <div className="flex flex-col">
                <h3 className="font-medium text-gray-800">
                  {entry.summary}
                </h3>
              
                {entry.achievements && (
                  <p className="text-sm mt-1 text-gray-600">
                    {entry.achievements}
                  </p>
                )}
              
                {entry.remarks && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-gray-500">Remarks:</span>
                    <span className="text-xs ml-1 text-gray-600">{entry.remarks}</span>
                  </div>
                )}
              
                <div className="flex mt-3 text-xs text-gray-500 space-x-4">
                  <div className="flex items-center">
                    <span>{entry.date}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  <Select
                    value={entry.status}
                    onValueChange={(value) => {
                      // Stop propagation to prevent the card click handler from firing
                      event?.stopPropagation();
                      toggleEntryStatus(entry.id, value);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[130px] bg-white border-vibrant-blue/20" onClick={(e) => e.stopPropagation()}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="in progress">In Progress</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(entry);
                    }}
                    className="border-vibrant-indigo/20 hover:bg-vibrant-indigo/10"
                  >
                    Edit
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEntryToDelete(entry.id);
                      setDeleteDialogOpen(true);
                    }}
                    className="bg-vibrant-red hover:bg-vibrant-red/80"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-xl border-none shadow-lg overflow-hidden p-0">
          <Card className="border-none">
            <CardHeader className="bg-gradient-to-r from-vibrant-red/10 to-vibrant-orange/10 p-6 border-b">
              <CardTitle>Delete Entry</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p>Are you sure you want to delete this entry? This action cannot be undone.</p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 p-4 bg-gray-50 border-t">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteEntry}
                disabled={loading}
                className="bg-vibrant-red hover:bg-vibrant-red/80"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </Button>
            </CardFooter>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Entry Details Dialog - Changed to single column format with fixed footer */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden rounded-xl border-none shadow-lg">
          <Card className="border-none h-full">
            <CardHeader className="bg-gradient-to-r from-vibrant-purple/10 to-vibrant-blue/10 p-6 border-b">
              <CardTitle>Entry Details</CardTitle>
            </CardHeader>
            {selectedEntry && (
              <>
                <CardContent className="p-6 overflow-y-auto" style={{maxHeight: "calc(90vh - 140px)"}}>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedEntry.summary}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <span>{selectedEntry.date}</span>
                      <span>•</span>
                      <span 
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          selectedEntry.status === "completed" 
                            ? "bg-green-100 text-green-700"
                            : selectedEntry.status === "in progress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {selectedEntry.status === "in progress" ? "In Progress" : 
                        selectedEntry.status.charAt(0).toUpperCase() + selectedEntry.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <div className="space-y-5">
                      {selectedEntry.achievements && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-1">Description</h4>
                          <p className="text-sm text-gray-600">{selectedEntry.achievements}</p>
                        </div>
                      )}
                      
                      {selectedEntry.challenges && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-1">Challenges</h4>
                          <p className="text-sm text-gray-600">{selectedEntry.challenges}</p>
                        </div>
                      )}
                      
                      {selectedEntry.remarks && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-1">Remarks</h4>
                          <p className="text-sm text-gray-600">{selectedEntry.remarks}</p>
                        </div>
                      )}
                      
                      {selectedEntry.time_spent && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-1">Time Spent</h4>
                          <p className="text-sm text-gray-600">
                            {Math.floor(selectedEntry.time_spent / 60)} hours {selectedEntry.time_spent % 60} minutes
                          </p>
                        </div>
                      )}
                      
                      {selectedEntry.skills_tools && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-1">Skills & Tools</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedEntry.skills_tools.split(',').map((tool, i) => (
                              <span key={i} className="text-xs bg-vibrant-blue/10 text-vibrant-blue px-2 py-1 rounded-full">
                                {tool.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedEntry.tags && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-1">Tags</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedEntry.tags.split(',').map((tag, i) => (
                              <span key={i} className="text-xs bg-vibrant-purple/10 text-vibrant-purple px-2 py-1 rounded-full">
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 p-4 bg-gray-50 border-t">
                  <Button 
                    onClick={() => {
                      setDetailsOpen(false);
                      if (selectedEntry) {
                        startEditing(selectedEntry);
                      }
                    }}
                    variant="outline"
                    className="border-vibrant-indigo/20 hover:bg-vibrant-indigo/10"
                  >
                    Edit
                  </Button>
                  <Button onClick={() => setDetailsOpen(false)} 
                    className="bg-gradient-to-r from-vibrant-blue to-vibrant-purple hover:opacity-90">
                    Close
                  </Button>
                </CardFooter>
              </>
            )}
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Entries;
