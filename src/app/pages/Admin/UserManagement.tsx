import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Key,
  Shield,
  ShieldOff,
  Building,
  Mail,
  CheckCircle2,
  XCircle,
  UserCog,
  Users,
  Copy,
  Check,
  BadgeCheck,
  Clock,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from "sonner";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { cn } from "../../components/ui/utils";
import { DEPARTMENTS } from "../../types";

export function UserManagement() {
  const { logout } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  const [modalView, setModalView] = useState<
    "add" | "role" | "dept" | "reset" | "flash" | "delete" | null
  >(null);
  const [activeUser, setActiveUser] = useState<any | null>(null);

  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    department: "",
  });

  const [editData, setEditData] = useState({
    role: "",
    department: "",
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", { credentials: 'include' });
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      toast.error("Failed to load users");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleManualProvision = async () => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) throw new Error("Provisioning failed");

      const data = await response.json();
      setTempPassword(data.tempPassword);
      setModalView("flash");
      toast.success("User account created successfully");
      setFormData({ name: "", email: "", role: "", department: "" });
      fetchUsers();
    } catch (error) {
      toast.error("Failed to create account");
    }
  };

  const handleReset = async () => {
    if (!activeUser) return;
    try {
      const response = await fetch(
        `/api/users/${activeUser.id}/reset-password`,
        {
          method: "POST",
          credentials: 'include'
        },
      );

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) throw new Error("Reset failed");

      const data = await response.json();
      setTempPassword(data.tempPassword);
      setModalView("flash");
      toast.success("Password reset successfully");
    } catch (error) {
      toast.error("Failed to reset password");
    }
  };

  const handleResetMFA = async (user: any) => {
    if (!window.confirm(`Are you sure you want to reset MFA for ${user.name}?`))
      return;

    try {
      const response = await fetch(`/api/users/${user.id}/reset-mfa`, {
        method: "POST",
        credentials: 'include'
      });

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) throw new Error("Reset failed");
      toast.success("MFA reset successfully");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to reset MFA");
    }
  };

  const handleStatusToggle = async (user: any) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)),
    );

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include'
      });

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) throw new Error("Update failed");
      toast.success(`User marked as ${newStatus}`);
    } catch (error) {
      fetchUsers();
      toast.error("Failed to update status");
    }
  };

  const handleAction = async () => {
    if (!activeUser) return;
    try {
      const response = await fetch(`/api/users/${activeUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editData.role,
          department: editData.department,
        }),
        credentials: 'include'
      });

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) throw new Error("Update failed");
      toast.success("User updated successfully");
      setModalView(null);
      setActiveUser(null);
      fetchUsers();
    } catch (error) {
      toast.error("Failed to update user");
    }
  };

  const handleDelete = async () => {
    if (!activeUser) return;

    const expected = (
      (activeUser.name || "").trim().replace(/\s+/g, "_") + "_Delete"
    ).toUpperCase();

    if (deleteConfirmation.trim().toUpperCase() !== expected) {
      toast.error("Confirmation mismatch");
      return;
    }

    try {
      const response = await fetch(`/api/users/${activeUser.id}`, {
        method: "DELETE",
        credentials: 'include'
      });

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) throw new Error("Delete failed");
      toast.success("User deleted successfully");
      setModalView(null);
      setActiveUser(null);
      setDeleteConfirmation("");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700 border-none";
      case "personnel":
        return "bg-blue-100 text-blue-700 border-none";
      case "rider":
        return "bg-amber-100 text-amber-700 border-none";
      default:
        return "bg-slate-100 text-slate-700 border-none";
    }
  };

  return (
    <div className="p-3 md:p-4 space-y-3 bg-slate-50/50 min-h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-black tracking-tight text-slate-900 leading-none">
            User Management
          </h1>
          <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
            Control Terminal
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            className="h-7 rounded-md border-slate-200 font-bold text-[10px] hidden sm:flex px-2"
          >
            <Filter className="w-3 h-3 mr-1" /> Filter
          </Button>
          <Button
            onClick={() => setModalView("add")}
            className="h-7 bg-primary hover:bg-primary/90 text-white rounded-md font-black text-[10px] px-3 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> New User
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-slate-100 rounded-lg overflow-hidden bg-white">
        <div className="p-2 border-b border-slate-100 flex flex-col sm:flex-row gap-2 justify-between items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 rounded-md border-slate-100 bg-slate-50/50 text-[10px] w-full"
            />
          </div>
          <div className="w-full sm:w-auto">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="h-7 rounded-md border-slate-100 w-full sm:w-[120px] font-black text-[9px] uppercase tracking-widest px-2">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                <SelectItem value="all" className="text-[10px]">
                  All Roles
                </SelectItem>
                <SelectItem value="admin" className="text-[10px]">
                  Admin
                </SelectItem>
                <SelectItem value="personnel" className="text-[10px]">
                  Personnel
                </SelectItem>
                <SelectItem value="rider" className="text-[10px]">
                  Rider
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="hover:bg-slate-50 border-slate-50 h-8">
                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[8px] py-0 px-3">
                  User
                </TableHead>
                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[8px] py-0 px-3">
                  Role
                </TableHead>
                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[8px] py-0 px-3">
                  MFA
                </TableHead>
                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[8px] py-0 px-3">
                  Status
                </TableHead>
                <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[8px] py-0 px-3">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className="hover:bg-slate-50/50 border-slate-50 h-9 group"
                >
                  <TableCell className="py-0 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded bg-slate-100 flex items-center justify-center font-black text-[9px] shrink-0`}
                      >
                        {(user.name || "??").substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-[10px] truncate leading-none">
                          {user.name || "Unknown User"}
                        </p>
                        <p className="text-[8px] text-slate-400 font-bold truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <Badge
                      variant="secondary"
                      className={`capitalize font-black text-[7px] px-1 py-0 h-4 ${getRoleBadgeColor(user.role)}`}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    {user.mfa_enabled ? (
                      <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md w-fit">
                        <Shield className="w-2.5 h-2.5" />
                        <span className="text-[7px] font-black uppercase">
                          Active
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded-md w-fit">
                        <ShieldOff className="w-2.5 h-2.5" />
                        <span className="text-[7px] font-black uppercase">
                          Off
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <div className="flex items-center gap-1 scale-[0.65] origin-left">
                      <Switch
                        checked={user.status === "active"}
                        onCheckedChange={() => handleStatusToggle(user)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-0 px-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded text-slate-300"
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-36 rounded-md border-slate-100 shadow-xl p-0.5"
                      >
                        <DropdownMenuItem
                          onSelect={() => {
                            setActiveUser(user);
                            setModalView("reset");
                          }}
                          className="rounded py-1 text-[9px] font-black uppercase tracking-widest"
                        >
                          <Key className="mr-1.5 h-3 w-3 text-slate-400" />{" "}
                          Reset PWD
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            setActiveUser(user);
                            setEditData({
                              role: user.role,
                              department: user.department || "",
                            });
                            setModalView("role");
                          }}
                          className="rounded py-1 text-[9px] font-black uppercase tracking-widest"
                        >
                          <BadgeCheck className="mr-1.5 h-3 w-3 text-slate-400" />{" "}
                          Change Role
                        </DropdownMenuItem>
                        {user.mfa_enabled && (
                          <DropdownMenuItem
                            onSelect={() => handleResetMFA(user)}
                            className="rounded py-1 text-[9px] font-black uppercase tracking-widest text-amber-600"
                          >
                            <ShieldOff className="mr-1.5 h-3 w-3" /> Reset MFA
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-slate-50 my-0.5" />
                        <DropdownMenuItem
                          onSelect={() => {
                            setActiveUser(user);
                            setModalView("delete");
                          }}
                          className="rounded py-1 text-[9px] font-black uppercase tracking-widest text-rose-500"
                        >
                          <Trash2 className="mr-1.5 h-3 w-3" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* MODALS */}
      <Dialog
        open={modalView === "add"}
        onOpenChange={(open) => !open && setModalView(null)}
      >
        <DialogContent className="sm:max-w-[340px] rounded-lg p-4 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xs font-black uppercase tracking-widest">
              Create Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[8px] font-black uppercase text-slate-400">
                FullName
              </Label>
              <Input
                placeholder="Name"
                className="h-7 rounded text-[10px]"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[8px] font-black uppercase text-slate-400">
                Email
              </Label>
              <Input
                placeholder="email@host.com"
                className="h-7 rounded text-[10px]"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[8px] font-black uppercase text-slate-400">
                  Role
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) =>
                    setFormData({ ...formData, role: val })
                  }
                >
                  <SelectTrigger className="h-7 rounded text-[10px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded">
                    <SelectItem value="personnel" className="text-[10px]">
                      Personnel
                    </SelectItem>
                    <SelectItem value="rider" className="text-[10px]">
                      Rider
                    </SelectItem>
                    <SelectItem value="admin" className="text-[10px]">
                      Admin
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[8px] font-black uppercase text-slate-400">
                  Dept
                </Label>
                <Select
                  value={formData.department}
                  onValueChange={(val) =>
                    setFormData({ ...formData, department: val })
                  }
                >
                  <SelectTrigger className="h-7 rounded text-[10px]">
                    <SelectValue placeholder="Dept" />
                  </SelectTrigger>
                  <SelectContent className="rounded">
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept} className="text-[10px]">
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-5">
            <Button
              onClick={handleManualProvision}
              className="w-full h-8 rounded bg-primary text-white text-[10px] font-black uppercase"
            >
              Execute Provision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalView === "role"}
        onOpenChange={(open) => !open && setModalView(null)}
      >
        <DialogContent className="sm:max-w-[340px] rounded-lg p-4 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xs font-black uppercase tracking-widest">
              Update Privileges
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[8px] font-black uppercase text-slate-400">
                System Role
              </Label>
              <Select
                value={editData.role}
                onValueChange={(val) => setEditData({ ...editData, role: val })}
              >
                <SelectTrigger className="h-7 rounded text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded">
                  <SelectItem value="personnel" className="text-[10px]">
                    Personnel
                  </SelectItem>
                  <SelectItem value="rider" className="text-[10px]">
                    Rider
                  </SelectItem>
                  <SelectItem value="admin" className="text-[10px]">
                    Admin
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[8px] font-black uppercase text-slate-400">
                Department
              </Label>
              <Select
                value={editData.department}
                onValueChange={(val) =>
                  setEditData({ ...editData, department: val })
                }
              >
                <SelectTrigger className="h-7 rounded text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded">
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept} className="text-[10px]">
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-5">
            <Button
              onClick={handleAction}
              className="w-full h-8 rounded bg-slate-900 text-white text-[10px] font-black uppercase"
            >
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalView === "reset"}
        onOpenChange={(open) => !open && setModalView(null)}
      >
        <DialogContent className="sm:max-w-[340px] rounded-lg p-4 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xs font-black uppercase tracking-widest">
              Reset Credentials
            </DialogTitle>
          </DialogHeader>
          <p className="text-[10px] font-bold text-slate-500">
            Generate a new temporary password for{" "}
            <span className="text-slate-900">{activeUser?.name}</span>?
          </p>
          <DialogFooter className="mt-5">
            <Button
              onClick={handleReset}
              className="w-full h-8 rounded bg-primary text-white text-[10px] font-black uppercase"
            >
              Confirm Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalView === "flash"}
        onOpenChange={(open) => !open && setModalView(null)}
      >
        <DialogContent className="sm:max-w-[340px] rounded-lg p-4 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xs font-black uppercase text-emerald-600">
              Password Generated
            </DialogTitle>
          </DialogHeader>
          <div className="bg-slate-50 rounded p-4 border border-slate-100 text-center relative group">
            <p className="font-mono text-lg font-black text-slate-900 select-all">
              {tempPassword}
            </p>
            <Button
              onClick={copyToClipboard}
              variant="ghost"
              className="absolute top-1 right-1 h-6 w-6 p-0 hover:bg-white"
            >
              {copied ? (
                <Check size={12} className="text-emerald-500" />
              ) : (
                <Copy size={12} className="text-slate-400" />
              )}
            </Button>
          </div>
          <Button
            onClick={() => setModalView(null)}
            className="w-full h-8 rounded bg-slate-900 text-white text-[10px] font-black uppercase mt-4"
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalView === "delete"}
        onOpenChange={(open) => !open && setModalView(null)}
      >
        <DialogContent className="sm:max-w-[340px] rounded-lg p-4 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xs font-black uppercase text-rose-600">
              Purge Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-500 leading-tight">
              This action is irreversible. All data for{" "}
              <span className="text-slate-900 font-black">
                {activeUser?.name}
              </span>{" "}
              will be removed.
            </p>
            <div className="space-y-1">
              <Label className="text-[8px] font-black uppercase text-slate-400">
                Type "{(activeUser?.name || "").replace(/\s+/g, "_")}_Delete" to confirm
              </Label>
              <Input
                className="h-7 rounded text-[10px] font-bold"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-5">
            <Button
              onClick={handleDelete}
              disabled={
                deleteConfirmation.toUpperCase() !==
                (
                  ((activeUser?.name || "").replace(/\s+/g, "_") + "_Delete")
                ).toUpperCase()
              }
              className="w-full h-8 rounded bg-rose-600 text-white text-[10px] font-black uppercase"
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
