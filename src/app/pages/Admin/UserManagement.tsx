import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Filter, MoreHorizontal, Key, Shield, ShieldOff, Building, Mail, CheckCircle2, XCircle, UserCog, Users, Copy, Check, BadgeCheck, Clock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  
  const [modalView, setModalView] = useState<'add' | 'role' | 'dept' | 'reset' | 'flash' | null>(null);
  const [activeUser, setActiveUser] = useState<any | null>(null);
  
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    department: ''
  });

  const [editData, setEditData] = useState({
    role: '',
    department: ''
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) {
      toast.error('Failed to load users');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleManualProvision = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Provisioning failed');

      const data = await response.json();
      setTempPassword(data.tempPassword);
      setModalView('flash');
      toast.success('User account created successfully');
      setFormData({ name: '', email: '', role: '', department: '' });
      fetchUsers();
    } catch (error) {
      toast.error('Failed to create account');
    }
  };

  const handleReset = async () => {
    if (!activeUser) return;
    try {
      const response = await fetch(`/api/users/${activeUser.id}/reset-password`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Reset failed');

      const data = await response.json();
      setTempPassword(data.tempPassword);
      setModalView('flash');
      toast.success('Password reset successfully');
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  const handleResetMFA = async (user: any) => {
    if (!window.confirm(`Are you sure you want to reset MFA for ${user.name}? They will need to set up Google Authenticator again on their next login.`)) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/reset-mfa`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Reset failed');
      toast.success('MFA reset successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to reset MFA');
    }
  };

  const handleStatusToggle = async (user: any) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    
    setUsers((prevUsers) => (Array.isArray(prevUsers) ? prevUsers : []).map(u => u.id === user.id ? { ...u, status: newStatus } : u));

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error('Update failed');
      toast.success(`User marked as ${newStatus}`);
    } catch (error) {
      setUsers((prevUsers) => (Array.isArray(prevUsers) ? prevUsers : []).map(u => u.id === user.id ? { ...u, status: user.status } : u));
      toast.error('Failed to update status');
    }
  };

  const handleAction = async () => {
    if (!activeUser) return;
    try {
      const response = await fetch(`/api/users/${activeUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editData.role, department: editData.department })
      });
      if (!response.ok) throw new Error('Update failed');
      toast.success('User updated successfully');
      setModalView(null);
      setActiveUser(null);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredUsers = (Array.isArray(users) ? users : []).filter(user => {
    const matchesSearch = (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 hover:bg-purple-100 border-none';
      case 'personnel': return 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-none';
      case 'rider': return 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-none';
      default: return 'bg-slate-100 text-slate-700 border-none';
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50/50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">User Management</h1>
          <p className="text-slate-500 font-medium">Manage system access, roles, and personnel credentials.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-11 rounded-xl border-slate-200 font-bold hidden sm:flex">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
          <Button onClick={() => setModalView('add')} className="h-11 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold px-6 shadow-lg shadow-primary/20">
            <Plus className="w-5 h-5 mr-2" /> Add New User
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search users by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-primary focus-visible:border-primary w-full"
            />
          </div>
          <div className="w-full sm:w-auto">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 w-full sm:w-[180px] font-medium">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Administrators</SelectItem>
                <SelectItem value="personnel">Personnel</SelectItem>
                <SelectItem value="rider">Riders</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-slate-50 border-slate-100">
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">User Details</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Access Role</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] hidden md:table-cell">Department</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] hidden lg:table-cell">Joined</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] hidden xl:table-cell">Security</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] hidden xl:table-cell">MFA Status</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status</TableHead>
                <TableHead className="text-right font-bold text-slate-500 uppercase tracking-wider text-[10px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Search className="h-8 w-8 mb-3 opacity-20" />
                      <p className="font-medium">No users found matching your criteria.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50/80 transition-colors border-slate-100 group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${user.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`capitalize font-bold text-[10px] tracking-widest px-2.5 py-1 ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm font-medium text-slate-600">{user.department || 'N/A'}</p>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-slate-500 text-sm font-medium">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-slate-500 text-sm font-medium">
                      {user.require_password_reset ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 font-bold text-[9px] uppercase tracking-tighter">
                          Pending Reset
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 font-bold text-[9px] uppercase tracking-tighter">
                          Verified
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-slate-500 text-sm font-medium">
                      {user.mfa_enabled ? (
                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 font-bold text-[9px] uppercase tracking-tighter">
                          MFA Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-200 bg-slate-50 font-bold text-[9px] uppercase tracking-tighter">
                          MFA Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={user.status === 'active'}
                          onCheckedChange={() => handleStatusToggle(user)}
                        />
                        <span className={`text-xs font-bold uppercase tracking-widest ${user.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {user.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 data-[state=open]:bg-slate-100 data-[state=open]:text-slate-900 transition-colors focus:outline-none">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-2xl border-slate-100 shadow-xl p-2">
                          <DropdownMenuItem 
                            onSelect={(e) => {
                              e.preventDefault();
                              setTimeout(() => {
                                setActiveUser(user);
                                setModalView('reset');
                              }, 100);
                            }}
                            className="rounded-xl py-2.5 font-semibold cursor-pointer focus:bg-slate-50"
                          >
                            <Key className="mr-2 h-4 w-4 text-slate-500" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onSelect={(e) => {
                              e.preventDefault();
                              setTimeout(() => {
                                setActiveUser(user);
                                setEditData({ role: user.role, department: user.department || '' });
                                setModalView('role');
                              }, 100);
                            }} 
                            className="rounded-xl py-2.5 font-semibold cursor-pointer focus:bg-slate-50"
                          >
                            <BadgeCheck className="mr-2 h-4 w-4 text-slate-500" /> Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onSelect={(e) => {
                              e.preventDefault();
                              setTimeout(() => {
                                setActiveUser(user);
                                setEditData({ role: user.role, department: user.department || '' });
                                setModalView('dept');
                              }, 100);
                            }} 
                            className="rounded-xl py-2.5 font-semibold cursor-pointer focus:bg-slate-50"
                          >
                            <Building className="mr-2 h-4 w-4 text-slate-500" /> Change Dept
                          </DropdownMenuItem>
                          {user.mfa_enabled && (
                            <DropdownMenuItem 
                              onSelect={() => handleResetMFA(user)}
                              className="rounded-xl py-2.5 font-semibold cursor-pointer focus:bg-rose-50 text-rose-600 focus:text-rose-700"
                            >
                              <ShieldOff className="mr-2 h-4 w-4" /> Reset MFA
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500 font-medium">
          <p>Showing {filteredUsers.length} entries</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled className="rounded-lg h-8 border-slate-200 font-bold">Previous</Button>
            <Button variant="outline" size="sm" disabled className="rounded-lg h-8 border-slate-200 font-bold">Next</Button>
          </div>
        </div>
      </Card>

      <Dialog open={modalView === 'add'} onOpenChange={(open) => !open && setModalView(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <UserCog className="w-6 h-6" />
              </div>
              Create User Account
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium pt-2">
              Add a new member to the system and configure their access role.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</Label>
              <div className="relative">
                <Input 
                  id="name" 
                  placeholder="e.g. Jane Doe" 
                  className="pl-10 h-12 rounded-xl border-slate-200 font-medium" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
                <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</Label>
              <div className="relative">
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="jane@company.com" 
                  className="pl-10 h-12 rounded-xl border-slate-200 font-medium" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role" className="text-xs font-bold text-slate-500 uppercase tracking-widest">System Role</Label>
                <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                  <SelectTrigger id="role" className="h-12 rounded-xl border-slate-200 font-medium">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="personnel">Personnel</SelectItem>
                    <SelectItem value="rider">Rider</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Department</Label>
                <Select value={formData.department} onValueChange={(val) => setFormData({...formData, department: val})}>
                  <SelectTrigger id="department" className="h-12 rounded-xl border-slate-200 font-medium">
                    <SelectValue placeholder="Select Dept" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Human Resources">Human Resources</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Logistics">Logistics</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-8 gap-3 sm:gap-0">
            <Button variant="ghost" onClick={() => setModalView(null)} className="h-12 rounded-xl font-bold hover:bg-slate-100">
              Cancel
            </Button>
            <Button 
              onClick={handleManualProvision} 
              disabled={!formData.name || !formData.email || !formData.role}
              className="h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold px-8 shadow-lg shadow-primary/20"
            >
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalView === 'role'} onOpenChange={(open) => !open && setModalView(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-500">
                <BadgeCheck className="w-6 h-6" />
              </div>
              Change Role
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium pt-2">
              Update role access for {activeUser?.name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">System Role</Label>
              <Select value={editData.role} onValueChange={(val) => setEditData({...editData, role: val})}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 font-medium">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="personnel">Personnel</SelectItem>
                  <SelectItem value="rider">Rider</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-8 gap-3 sm:gap-0">
            <Button variant="ghost" onClick={() => setModalView(null)} className="h-12 rounded-xl font-bold hover:bg-slate-100">
              Cancel
            </Button>
            <Button 
              onClick={handleAction} 
              className="h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-bold px-8 shadow-lg"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalView === 'dept'} onOpenChange={(open) => !open && setModalView(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500">
                <Building className="w-6 h-6" />
              </div>
              Change Department
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium pt-2">
              Update department for {activeUser?.name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Department</Label>
              <Select value={editData.department} onValueChange={(val) => setEditData({...editData, department: val})}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 font-medium">
                  <SelectValue placeholder="Select Dept" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Human Resources">Human Resources</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Logistics">Logistics</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-8 gap-3 sm:gap-0">
            <Button variant="ghost" onClick={() => setModalView(null)} className="h-12 rounded-xl font-bold hover:bg-slate-100">
              Cancel
            </Button>
            <Button 
              onClick={handleAction} 
              className="h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-bold px-8 shadow-lg"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalView === 'reset'} onOpenChange={(open) => !open && setModalView(null)}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-3 mb-2 text-rose-500">
              <Key size={24} />
              <DialogTitle className="text-xl font-black text-slate-900">Reset Password</DialogTitle>
            </div>
            <DialogDescription className="font-bold text-slate-500">
              Are you sure you want to reset the password for {activeUser?.name}?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-8">
            <Button variant="ghost" onClick={() => setModalView(null)} className="h-14 rounded-2xl font-black hover:bg-slate-100">
              Cancel
            </Button>
            <Button 
              onClick={handleReset} 
              className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black"
            >
              Confirm Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalView === 'flash'} onOpenChange={(open) => !open && setModalView(null)}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-3 mb-2 text-emerald-500">
              <Shield size={24} />
              <DialogTitle className="text-xl font-black text-slate-900">One-Time Password</DialogTitle>
            </div>
            <DialogDescription className="font-bold text-emerald-600">
              Please copy this password immediately. It will not be shown again. The user will be required to change it upon first login.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50 rounded-[1.5rem] p-6 border border-slate-100 mt-4 relative group">
            <p className="text-center font-mono text-2xl tracking-widest font-black text-slate-900 break-all select-all">
              {tempPassword}
            </p>
            <Button 
              onClick={copyToClipboard}
              variant="outline" 
              className="absolute top-2 right-2 h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-500" />}
            </Button>
          </div>

          <DialogFooter className="mt-8">
            <Button 
              onClick={() => setModalView(null)} 
              className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black"
            >
              I have copied the password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
