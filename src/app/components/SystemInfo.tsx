import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

export function SystemInfo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Info className="h-4 w-4 mr-2" />
          System Info
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rider Scheduling & Delivery System</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="demo" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="demo">Demo Accounts</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
          </TabsList>

          <TabsContent value="demo" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Administrator Account</h3>
              <div className="bg-muted p-3 rounded-lg space-y-1 font-mono text-sm">
                <p>Email: admin@company.com</p>
                <p>Password: (any value)</p>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Full system access • Approve requests • Assign riders • View all schedules
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Department Personnel Accounts</h3>
              <div className="space-y-2">
                <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                  <p>Email: john.hr@company.com</p>
                  <p className="text-xs text-muted-foreground">Human Resources Department</p>
                </div>
                <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                  <p>Email: jane.finance@company.com</p>
                  <p className="text-xs text-muted-foreground">Finance Department</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Submit delivery requests • Track status • View assigned riders
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Rider Accounts</h3>
              <div className="space-y-2">
                <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                  <p>Email: rider1@company.com</p>
                  <p className="text-xs text-muted-foreground">Mike Rider</p>
                </div>
                <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                  <p>Email: rider2@company.com</p>
                  <p className="text-xs text-muted-foreground">Anna Transport</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                View assigned deliveries • Update status • Add delivery notes
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> You can also create a new account using the Sign Up tab. Your name and department will be auto-fetched from the database.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge>Personnel</Badge> Submit Delivery Requests
              </h3>
              <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                <li>Calendar-based date selection (prevents past dates)</li>
                <li>Hourly time slots (8:00 AM - 6:00 PM)</li>
                <li>Interactive map for pickup location</li>
                <li>Interactive map for drop-off location</li>
                <li>Recipient details and contact</li>
                <li>Auto-linked to your account</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge>Admin</Badge> Approval & Assignment
              </h3>
              <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                <li>Review all pending requests</li>
                <li>Approve or disapprove with remarks</li>
                <li>Assign riders to approved deliveries</li>
                <li>Calendar view of all schedules</li>
                <li>Filter by date, department, rider</li>
                <li>Real-time statistics dashboard</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge>Rider</Badge> Delivery Management
              </h3>
              <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                <li>View today's deliveries</li>
                <li>View tomorrow's deliveries</li>
                <li>See all upcoming assignments</li>
                <li>Full delivery details with coordinates</li>
                <li>Update delivery status (Assigned, In Progress, Completed, Failed)</li>
                <li>Add delivery notes and remarks</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Real-time Notifications</h3>
              <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                <li>Admins notified when requests submitted</li>
                <li>Personnel notified on approval/disapproval</li>
                <li>Riders notified when assigned</li>
                <li>Unread badge counter</li>
                <li>In-app notification center</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="workflow" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Delivery Request Workflow</h3>
              
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Personnel Submits Request</p>
                    <p className="text-sm text-muted-foreground">
                      Uses calendar to select date, chooses time window, picks locations on map, enters recipient details
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Admin Receives Notification</p>
                    <p className="text-sm text-muted-foreground">
                      Request appears in "Pending" tab with full details
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Admin Reviews & Decides</p>
                    <p className="text-sm text-muted-foreground">
                      Either approves (assigns rider) or disapproves (with reason)
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Notifications Sent</p>
                    <p className="text-sm text-muted-foreground">
                      Personnel notified of decision • Rider notified if approved
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                    5
                  </div>
                  <div>
                    <p className="font-medium">Rider Executes Delivery</p>
                    <p className="text-sm text-muted-foreground">
                      Views delivery details, updates status, adds notes
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                    6
                  </div>
                  <div>
                    <p className="font-medium">Completion & Audit</p>
                    <p className="text-sm text-muted-foreground">
                      All actions logged • Status visible to all authorized parties
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
              <p className="font-medium text-green-900 mb-1">Key Security Features</p>
              <ul className="text-sm space-y-1 text-green-800 list-disc ml-4">
                <li>Backend-only fields never exposed in UI</li>
                <li>Role-based access control enforced</li>
                <li>Auto-generated IDs and timestamps</li>
                <li>Name/department fetched from database (not user input)</li>
                <li>Map-based location prevents invalid addresses</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
