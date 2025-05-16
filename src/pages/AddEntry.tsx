
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { FileText } from 'lucide-react';
import NewEntryForm from '@/components/NewEntryForm';
import { useState } from 'react';

const AddEntry = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Add Entry</h1>
          <p className="page-subtitle">Record your daily internship activities</p>
        </div>
        <div className="bg-gradient-to-br from-vibrant-green to-vibrant-teal rounded-full w-10 h-10 flex items-center justify-center">
          <FileText size={20} className="text-white" />
        </div>
      </div>

      <Card className="vibrant-form-card border-none shadow-md mb-6 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-vibrant-blue/10 to-vibrant-teal/10 p-6 pb-3 border-b">
          <CardTitle className="text-base text-gray-700">Create New Entry</CardTitle>
        </CardHeader>
        <CardContent className="p-0 bg-white overflow-y-auto pb-16" style={{ maxHeight: "calc(100vh - 220px)" }}>
          <div className="p-6 pt-4">
            <NewEntryForm 
              onSuccess={() => {
                toast({
                  title: "Success!",
                  description: "Entry added successfully.",
                });
              }} 
              hideHeader={true}
              hideFooter={true}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 p-4 bg-gray-50 border-t sticky bottom-0 left-0 right-0">
          <Button 
            form="new-entry-form"
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-vibrant-blue to-vibrant-indigo hover:opacity-90 text-white"
          >
            {loading ? 'Saving...' : 'Save Entry'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AddEntry;
