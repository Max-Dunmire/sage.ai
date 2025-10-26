import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Mail, Phone, User, Package, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const CALENDAR_SERVICES = [
  'Apple Calendar (macOS/iOS)',
  'Thunderbird (Lightning)',
  'Android (DAVx⁵)',
  'Evolution (GNOME)',
  'KOrganizer',
  'Outlook (Windows desktop)',
  'Outlook (macOS)',
  'Outlook.com',
  'Microsoft 365',
  'Google Calendar',
  'iCloud Calendar',
  'Nextcloud Calendar',
  'Fastmail Calendar',
  'Zoho Calendar',
  'Proton Calendar',
  'Yahoo Calendar',
  'Windows Calendar app',
  'BusyCal',
  'Emacs Org Mode',
  'generic CalDAV/WebDAV clients',
];

const Settings = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    calendarService: user?.calendarService || '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCalendarServiceChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      calendarService: value,
    }));
  };

  const handleSaveChanges = async () => {
    try {
      // Update local user context
      if (user) {
        updateUser({
          ...user,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          calendarService: formData.calendarService,
        });
      }

      toast.success('Changes saved', {
        description: 'Your profile has been updated successfully',
      });
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to save changes', {
        description: 'An error occurred while saving your profile',
      });
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out', {
      description: 'You have been successfully logged out',
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-12 animate-fade-in">
            <h1 className="text-4xl font-bold mb-2">Account Settings</h1>
            <p className="text-muted-foreground">
              Manage your profile information and preferences
            </p>
          </div>

          {/* Profile Section */}
          <div className="bg-gradient-card rounded-2xl p-8 shadow-soft mb-8">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center space-x-6">
                {/* Profile Image */}
                <div className="w-24 h-24 rounded-full bg-gradient-sage flex items-center justify-center flex-shrink-0">
                  <User className="w-12 h-12 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-1">{user?.fullName}</h2>
                  <p className="text-muted-foreground mb-3">{user?.email}</p>
                  <div className="flex items-center space-x-2 bg-secondary text-secondary-foreground px-3 py-1 rounded-full w-fit">
                    <Package className="w-4 h-4" />
                    <span className="text-sm font-medium">{user?.plan} Plan</span>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
                className="text-sm"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </div>

            {/* Account Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Account Information</h3>

              {/* Full Name Field */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-2">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Calendar Service Field */}
              <div>
                <label htmlFor="calendarService" className="block text-sm font-medium mb-2">
                  Calendar Service
                </label>
                {isEditing ? (
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                    <Select
                      value={formData.calendarService}
                      onValueChange={handleCalendarServiceChange}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select a calendar service" />
                      </SelectTrigger>
                      <SelectContent>
                        {CALENDAR_SERVICES.map((service) => (
                          <SelectItem key={service} value={service}>
                            {service}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <div className="pl-10 py-2 text-sm text-muted-foreground bg-secondary/30 rounded-md">
                      {formData.calendarService || 'No calendar service selected'}
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              {isEditing && (
                <Button
                  className="w-full bg-gradient-sage hover:opacity-90"
                  onClick={handleSaveChanges}
                >
                  Save Changes
                </Button>
              )}
            </div>
          </div>

          {/* Subscription Section */}
          <div className="bg-gradient-card rounded-2xl p-8 shadow-soft mb-8">
            <h3 className="text-lg font-semibold mb-6">Subscription Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                <p className="text-2xl font-bold">{user?.plan}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Account Status</p>
                <p className="text-2xl font-bold text-primary">
                  {user?.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>

            <Button variant="outline" className="w-full">
              Manage Subscription
            </Button>
          </div>

          {/* Account Actions */}
          <div className="bg-gradient-card rounded-2xl p-8 shadow-soft">
            <h3 className="text-lg font-semibold mb-6">Account Actions</h3>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
              <Button
                variant="destructive"
                className="w-full justify-start"
              >
                Delete Account
              </Button>
            </div>
          </div>

          {/* Account Created */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Account created on{' '}
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
