
import { Link, useLocation } from 'react-router-dom';
import { Calendar, FileText, LayoutDashboard, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import NewEntryForm from './NewEntryForm';

const MobileNavbar = () => {
  const location = useLocation();
  const path = location.pathname;
  const [dialogOpen, setDialogOpen] = useState(false);

  const navItems = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/',
    },
    {
      label: 'Entries',
      icon: Calendar,
      path: '/entries',
    },
    {
      label: 'Add',
      icon: Plus,
      path: '#',
      isDialog: true,
      isSpecial: true,
    },
    {
      label: 'Reports',
      icon: FileText,
      path: '/reports',
    },
    {
      label: 'Settings',
      icon: Settings,
      path: '/settings',
    },
  ];

  return (
    <>
      <nav className="mobile-navbar bg-white border-t">
        <div className="max-w-lg mx-auto px-2">
          <div className="flex items-center justify-between">
            {navItems.map((item) => {
              if (item.isDialog) {
                return (
                  <Dialog key={item.label} open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <button
                        className={cn(
                          "flex flex-col items-center py-2 px-4 text-sm font-medium transition-colors",
                          item.isSpecial 
                            ? "text-white bg-blue-500 rounded-lg hover:bg-blue-600" 
                            : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        <item.icon size={20} />
                        <span className="mt-1 text-xs">{item.label}</span>
                      </button>
                    </DialogTrigger>
                    <DialogContent style={{ width: '90%', maxWidth: '480px' }} className="p-0 rounded-xl border-none shadow-lg flex flex-col h-[85vh] overflow-hidden">
                      {/* Single header in dialog content */}
                      <div className="bg-gradient-to-r from-vibrant-blue/10 to-vibrant-teal/10 p-4 border-b flex-shrink-0">
                        <h2 className="text-lg font-bold text-gray-800">Add New Entry</h2>
                        <p className="text-sm text-gray-600">
                          Record your daily internship activities
                        </p>
                      </div>
                      
                      {/* Scrollable content area with adjusted height to account for footer */}
                      <div className="flex-1 overflow-y-auto pb-16">
                        <NewEntryForm 
                          onSuccess={() => setDialogOpen(false)}
                          hideHeader={true}
                          hideFooter={true}
                        />
                      </div>
                      
                      {/* Fixed footer with button */}
                      <div className="bg-gray-50 border-t p-4 flex justify-end gap-2 absolute bottom-0 left-0 right-0">
                        <button 
                          onClick={() => setDialogOpen(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                        <button 
                          form="new-entry-form"
                          type="submit"
                          className="bg-gradient-to-r from-vibrant-blue to-vibrant-indigo hover:opacity-90 text-white px-4 py-2 rounded-md"
                        >
                          Save Entry
                        </button>
                      </div>
                    </DialogContent>
                  </Dialog>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center py-3 px-2 text-sm font-medium transition-colors",
                    path === item.path
                      ? "text-intern-primary"
                      : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <item.icon size={20} />
                  <span className="mt-1 text-xs">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
};

export default MobileNavbar;
