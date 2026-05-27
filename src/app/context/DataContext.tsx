import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  useRef 
} from "react";
import { DeliveryRequest, Notification, DeliveryStatus } from "../types";
import { useAuth } from "./AuthContext";
import { useRealTime } from "./RealTimeContext";
import { toast } from "sonner";
import { WifiOff, Bike } from "lucide-react";

interface DataContextType {
  requests: DeliveryRequest[];
  notifications: Notification[];
  submitRequest: (
    request: Omit<
      DeliveryRequest,
      "request_id" | "requester_id" | "created_at" | "status"
    >,
  ) => Promise<void>;
  resubmitRequest: (
    requestId: string,
    request: Omit<
      DeliveryRequest,
      "request_id" | "requester_id" | "created_at" | "status"
    >,
  ) => Promise<void>;
  approveRequest: (
    requestId: string,
    riderId: string,
    adminRemark?: string,
  ) => Promise<void>;
  disapproveRequest: (requestId: string, adminRemark?: string) => Promise<void>;
  returnForRevision: (requestId: string, adminRemark: string) => Promise<void>;
  updateDeliveryStatus: (
    requestId: string,
    status: DeliveryStatus,
    remark?: string,
    currentLat?: number,
    currentLng?: number,
  ) => Promise<void>;
  cancelRequest: (requestId: string, adminRemark?: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  getRequestById: (requestId: string) => DeliveryRequest | undefined;
  fetchRequestById: (requestId: string) => Promise<DeliveryRequest | null>;
  refreshData: () => Promise<void>;
  fetchWithAuth: (
    url: string,
    options?: RequestInit,
  ) => Promise<Response | null>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);
const API_URL = "/api";

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { socket } = useRealTime();
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const pendingOptimisticIds = useRef<Set<string>>(new Set());
  
  // Enterprise Pattern: Keep a ref of the latest requests for socket event access
  const requestsRef = useRef<DeliveryRequest[]>([]);
  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = {
        ...options.headers,
        "Content-Type": "application/json",
      };

      // Using credentials: 'include' for secure HttpOnly cookies
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });

      if (response.status === 401) {
        logout();
        return null;
      }
      return response;
    },
    [logout],
  );

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/requests?limit=100`);
      if (res && res.ok) {
        const json = await res.json();
        let data: DeliveryRequest[] = Array.isArray(json)
          ? json
          : json.data || [];

        setRequests((prev) => {
          const existingStates = new Map<string, Partial<DeliveryRequest>>();
          (prev || []).forEach((r) => {
            if (r.exceptions || r.is_optimistic) {
              existingStates.set(r.request_id, {
                exceptions: r.exceptions,
                exception_severity: r.exception_severity,
                is_optimistic: r.is_optimistic,
                status: r.is_optimistic ? r.status : undefined,
                delivery_status: r.is_optimistic
                  ? r.delivery_status
                  : undefined,
                assigned_rider_id: r.is_optimistic
                  ? r.assigned_rider_id
                  : undefined,
              });
            }
          });

          const merged = data.map((newItem) => {
            const state = existingStates.get(newItem.request_id);
            if (!state) return newItem;
            if (state.is_optimistic) {
              const isSyncComplete = newItem.status === state.status;
              if (!isSyncComplete) {
                return { ...newItem, ...state, is_optimistic: true };
              }
            }
            return {
              ...newItem,
              exceptions: newItem.exceptions || state.exceptions,
              exception_severity:
                newItem.exception_severity || state.exception_severity,
              is_optimistic: false,
            };
          });

          prev.forEach((p) => {
            if (
              p.is_optimistic &&
              pendingOptimisticIds.current.has(p.request_id) &&
              !merged.find((m) => m.request_id === p.request_id)
            ) {
              merged.unshift(p);
            }
          });
          return merged;
        });
      }
    } catch (err) {
      console.error("Failed to fetch requests", err);
    }
  }, [fetchWithAuth, user]);

  const fetchRequestById = useCallback(
    async (id: string) => {
      try {
        const res = await fetchWithAuth(`${API_URL}/requests/${id}`);
        if (res && res.ok) {
          const data = await res.json();
          setRequests((prev) => {
            const arr = prev || [];
            const exists = arr.find((r) => r.request_id === id);
            if (exists) {
              return arr.map((r) => (r.request_id === id ? data : r));
            }
            return [...arr, data];
          });
          return data;
        }
      } catch (error) {
        console.error(`Failed to fetch request ${id}:`, error);
      }
      return null;
    },
    [fetchWithAuth],
  );

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/notifications`);
      if (res && res.ok) {
        const data = await res.json();
        let notifArray: any[] = Array.isArray(data) ? data : data.data || [];
        setNotifications(
          notifArray.map((n: any) => ({ ...n, read: Boolean(n.is_read) })),
        );
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  }, [user?.id, fetchWithAuth]);

  const refreshData = useCallback(async () => {
    await Promise.all([fetchRequests(), fetchNotifications()]);
  }, [fetchRequests, fetchNotifications]);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user, refreshData]);

  useEffect(() => {
    if (!socket) return;

    socket.on(
      "presence-sync",
      (data: { exceptions: any[] }) => {
        if (data.exceptions && data.exceptions.length > 0) {
          setRequests((prev) => {
            const updated = [...(prev || [])];
            data.exceptions.forEach((item) => {
              const idx = updated.findIndex(
                (r) => r.request_id === item.requestId,
              );
              if (idx !== -1) {
                updated[idx] = {
                  ...updated[idx],
                  exceptions: item.exceptions,
                  exception_severity: item.severity,
                };
              }
            });
            return updated;
          });
        }
      },
    );

    socket.on("delivery-status-updated", (data: { request_id: string; status: string; remark?: string }) => {
      const msg = `Delivery #${data.request_id.slice(-6).toUpperCase()} is now ${data.status.replace("_", " ").toUpperCase()}`;
      if (data.status === 'completed') toast.success(msg);
      else if (data.status === 'failed') toast.error(msg);
      else toast.info(msg);
      
      // Enterprise Fix: Instant UI update for status changes
      setRequests((prev) => 
        prev.map((req) => 
          req.request_id === data.request_id 
            ? { ...req, delivery_status: data.status as any, rider_remark: data.remark || req.rider_remark } 
            : req
        )
      );

      fetchRequests();
    });

    socket.on(
      "exception-detected",
      (data: {
        requestId: string;
        exceptions: string[];
        severity: "warning" | "critical";
      }) => {
        const reqDetails = requestsRef.current.find(r => r.request_id === data.requestId);
        const requesterPart = reqDetails ? ` by ${reqDetails.on_behalf_of || reqDetails.requester_name}` : "";

        const friendlyExceptions = data.exceptions.map(ex => {
          if (ex === 'signal_lost') return 'Signal Lost';
          return ex.replace('_', ' ').toUpperCase();
        });

        toast.error(`${friendlyExceptions.join(", ")} | Request #${data.requestId.slice(-6).toUpperCase()}${requesterPart}`, {
          duration: 8000,
          icon: (
            <div className="flex items-center gap-2 text-rose-500 mr-2">
              <Bike size={16} strokeWidth={2.5} />
              <WifiOff size={16} strokeWidth={2.5} />
            </div>
          ),
          description: "Rider has stopped transmitting GPS data.",
        });
        
        setRequests((prev) =>
          (prev || []).map((req) =>
            req.request_id === data.requestId
              ? {
                  ...req,
                  exceptions: data.exceptions,
                  exception_severity: data.severity,
                }
              : req,
          ),
        );
      },
    );

    socket.on("exception-cleared", (data: { requestId: string }) => {
      const id = data.requestId.slice(-6).toUpperCase();
      const reqDetails = requestsRef.current.find(r => r.request_id === data.requestId);
      const requesterPart = reqDetails ? ` by ${reqDetails.on_behalf_of || reqDetails.requester_name}` : "";

      toast.success(`Signal Recovered | Request #${id}${requesterPart}`, {
        duration: 5000,
        icon: (
          <div className="text-emerald-500 mr-2">
            <Bike size={16} strokeWidth={2.5} />
          </div>
        ),
        description: "Rider is transmitting GPS data again.",
      });

      setRequests((prev) =>
        (prev || []).map((req) =>
          req.request_id === data.requestId
            ? { ...req, exceptions: undefined, exception_severity: undefined }
            : req,
        ),
      );
    });

    socket.on("request-updated", (data: { request_id: string; status: string; delivery_status?: string }) => {
      // Toast message based on status
      const id = data.request_id.slice(-6).toUpperCase();
      switch (data.status) {
        case 'pending':
          toast.success(`Request #${id} is now under Review.`);
          break;
        case 'approved':
          toast.success(`Request #${id} has been Approved!`);
          break;
        case 'disapproved':
          toast.error(`Request #${id} was declined.`);
          break;
        case 'returned_for_revision':
          toast.warning(`Action Required: Request #${id} needs revision.`, { duration: 6000 });
          break;
        case 'cancelled':
          toast.info(`Request #${id} has been cancelled.`);
          break;
      }

      setRequests((prev) => 
        prev.map((req) => 
          req.request_id === data.request_id 
            ? { ...req, ...data, is_optimistic: false } 
            : req
        )
      );
      // Background fetch to ensure full data consistency
      fetchRequests();
    });

    socket.on("new_assignment", () => {
      refreshData();
    });

    socket.on("notification-added", () => {
      fetchNotifications();
    });

    socket.on("connect", () => {
      console.log("Socket reconnected, refreshing state...");
      refreshData();
    });

    return () => {
      socket.off("presence-sync");
      socket.off("delivery-status-updated");
      socket.off("exception-detected");
      socket.off("exception-cleared");
      socket.off("request-updated");
      socket.off("new_assignment");
      socket.off("notification-added");
      socket.off("connect");
    };
  }, [socket, fetchRequests, fetchNotifications, refreshData]);

  const submitRequest = async (
    requestData: Omit<
      DeliveryRequest,
      "request_id" | "requester_id" | "created_at" | "status"
    >,
  ) => {
    if (!user) return;
    const tempId = `temp-${Date.now()}`;
    const optimisticRequest: DeliveryRequest = {
      ...requestData,
      request_id: tempId,
      requester_id: user.id,
      requester_name: user.name,
      requester_department: user.department,
      created_at: new Date().toISOString(),
      status: "submitted_waiting",
      is_optimistic: true,
    };
    pendingOptimisticIds.current.add(tempId);
    setRequests((prev) => [optimisticRequest, ...prev]);
    try {
      const response = await fetchWithAuth(`${API_URL}/requests`, {
        method: "POST",
        body: JSON.stringify({
          ...requestData,
          requester_id: user.id,
          requester_name: user.name,
          requester_department: user.department,
        }),
      });
      
      if (response && response.ok) {
        const realRequest = await response.json();
        pendingOptimisticIds.current.delete(tempId);
        
        // ENTERPRISE FIX: Direct Injection (No disappearances)
        setRequests((prev) => 
          prev.map((r) => r.request_id === tempId ? realRequest : r)
        );
      } else {
        pendingOptimisticIds.current.delete(tempId);
        setRequests((prev) => prev.filter((r) => r.request_id !== tempId));
      }
    } catch (error) {
      pendingOptimisticIds.current.delete(tempId);
      setRequests((prev) => prev.filter((r) => r.request_id !== tempId));
    }
  };

  const resubmitRequest = async (
    requestId: string,
    requestData: Omit<
      DeliveryRequest,
      "request_id" | "requester_id" | "created_at" | "status"
    >,
  ) => {
    if (!user) return;
    const previousRequests = [...requests];
    pendingOptimisticIds.current.add(requestId);
    setRequests((prev) =>
      prev.map((req) =>
        req.request_id === requestId
          ? {
              ...req,
              ...requestData,
              status: "pending",
              delivery_status: "pending",
              assigned_rider_id: undefined,
              assigned_rider_name: undefined,
              is_optimistic: true,
            }
          : req,
      ),
    );
    try {
      const response = await fetchWithAuth(
        `${API_URL}/requests/${requestId}/resubmit`,
        {
          method: "PUT",
          body: JSON.stringify({ ...requestData, requester_id: user.id }),
        },
      );
      if (response && response.ok) {
        pendingOptimisticIds.current.delete(requestId);
        // ENTERPRISE FIX: Direct State Confirmation (No re-fetch flicker)
        setRequests((prev) => 
          prev.map((r) => r.request_id === requestId ? { ...r, is_optimistic: false } : r)
        );
      } else {
        pendingOptimisticIds.current.delete(requestId);
        setRequests(previousRequests);
      }
    } catch (error) {
      pendingOptimisticIds.current.delete(requestId);
      setRequests(previousRequests);
    }
  };

  const approveRequest = async (
    requestId: string,
    riderId: string,
    adminRemark?: string,
  ) => {
    const previousRequests = [...requests];
    pendingOptimisticIds.current.add(requestId);
    setRequests((prev) =>
      prev.map((req) =>
        req.request_id === requestId
          ? {
              ...req,
              status: "approved",
              assigned_rider_id: riderId,
              admin_remark: adminRemark,
              is_optimistic: true,
            }
          : req,
      ),
    );
    try {
      const response = await fetchWithAuth(
        `${API_URL}/requests/${requestId}/approve`,
        {
          method: "PUT",
          body: JSON.stringify({
            rider_id: riderId,
            admin_remark: adminRemark,
          }),
        },
      );
      if (response && response.ok) {
        pendingOptimisticIds.current.delete(requestId);
        // ENTERPRISE FIX: Direct State Confirmation (No re-fetch flicker)
        setRequests((prev) => 
          prev.map((r) => r.request_id === requestId ? { ...r, is_optimistic: false } : r)
        );
      } else {
        pendingOptimisticIds.current.delete(requestId);
        setRequests(previousRequests);
      }
    } catch (error) {
      pendingOptimisticIds.current.delete(requestId);
      setRequests(previousRequests);
    }
  };

  const disapproveRequest = async (requestId: string, adminRemark?: string) => {
    const previousRequests = [...requests];
    pendingOptimisticIds.current.add(requestId);
    setRequests((prev) =>
      prev.map((req) =>
        req.request_id === requestId
          ? {
              ...req,
              status: "disapproved",
              admin_remark: adminRemark,
              is_optimistic: true,
            }
          : req,
      ),
    );
    try {
      const response = await fetchWithAuth(
        `${API_URL}/requests/${requestId}/disapprove`,
        {
          method: "PUT",
          body: JSON.stringify({ admin_remark: adminRemark }),
        },
      );
      if (response && response.ok) {
        pendingOptimisticIds.current.delete(requestId);
        // ENTERPRISE FIX: Direct State Confirmation (No re-fetch flicker)
        setRequests((prev) => 
          prev.map((r) => r.request_id === requestId ? { ...r, is_optimistic: false } : r)
        );
      } else {
        pendingOptimisticIds.current.delete(requestId);
        setRequests(previousRequests);
      }
    } catch (error) {
      pendingOptimisticIds.current.delete(requestId);
      setRequests(previousRequests);
    }
  };

  const returnForRevision = async (requestId: string, adminRemark: string) => {
    const previousRequests = [...requests];
    pendingOptimisticIds.current.add(requestId);
    setRequests((prev) =>
      prev.map((req) =>
        req.request_id === requestId
          ? {
              ...req,
              status: "returned_for_revision",
              admin_remark: adminRemark,
              is_optimistic: true,
            }
          : req,
      ),
    );
    try {
      const response = await fetchWithAuth(
        `${API_URL}/requests/${requestId}/return`,
        {
          method: "PUT",
          body: JSON.stringify({ admin_remark: adminRemark }),
        },
      );
      if (response && response.ok) {
        pendingOptimisticIds.current.delete(requestId);
        // ENTERPRISE FIX: Direct State Confirmation (No re-fetch flicker)
        setRequests((prev) => 
          prev.map((r) => r.request_id === requestId ? { ...r, is_optimistic: false } : r)
        );
      } else {
        pendingOptimisticIds.current.delete(requestId);
        setRequests(previousRequests);
      }
    } catch (error) {
      pendingOptimisticIds.current.delete(requestId);
      setRequests(previousRequests);
    }
  };

  const updateDeliveryStatus = async (
    requestId: string,
    status: DeliveryStatus,
    remark?: string,
    currentLat?: number,
    currentLng?: number,
  ) => {
    const previousRequests = [...requests];
    pendingOptimisticIds.current.add(requestId);
    setRequests((prev) =>
      prev.map((req) =>
        req.request_id === requestId
          ? {
              ...req,
              delivery_status: status,
              rider_remark: remark,
              is_optimistic: true,
            }
          : req,
      ),
    );
    try {
      const response = await fetchWithAuth(
        `${API_URL}/requests/${requestId}/status`,
        {
          method: "PUT",
          body: JSON.stringify({
            status,
            remark,
            current_lat: currentLat,
            current_lng: currentLng,
          }),
        },
      );
      if (response && response.ok) {
        pendingOptimisticIds.current.delete(requestId);
        // ENTERPRISE FIX: Direct State Confirmation (No re-fetch flicker)
        setRequests((prev) => 
          prev.map((r) => r.request_id === requestId ? { ...r, is_optimistic: false } : r)
        );
      } else {
        pendingOptimisticIds.current.delete(requestId);
        setRequests(previousRequests);
      }
    } catch (error) {
      pendingOptimisticIds.current.delete(requestId);
      setRequests(previousRequests);
    }
  };

  const cancelRequest = async (requestId: string, adminRemark?: string) => {
    const previousRequests = [...requests];
    pendingOptimisticIds.current.add(requestId);
    setRequests((prev) => prev.filter((r) => r.request_id !== requestId));
    try {
      const response = await fetchWithAuth(
        `${API_URL}/requests/${requestId}/cancel`,
        {
          method: "PUT",
          body: JSON.stringify({ admin_remark: adminRemark }),
        },
      );
      if (response && response.ok) {
        pendingOptimisticIds.current.delete(requestId);
        // ENTERPRISE FIX: Direct State Confirmation (No re-fetch flicker)
        setRequests((prev) => 
          prev.map((r) => r.request_id === requestId ? { ...r, is_optimistic: false } : r)
        );
      } else {
        pendingOptimisticIds.current.delete(requestId);
        setRequests(previousRequests);
      }
    } catch (error) {
      pendingOptimisticIds.current.delete(requestId);
      setRequests(previousRequests);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      await fetchWithAuth(`${API_URL}/notifications/${notificationId}/read`, {
        method: "PUT",
      });
      await fetchNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!user) return;
    try {
      setNotifications((prev) =>
        (prev || []).map((n) =>
          n.user_id === user.id ? { ...n, read: true } : n,
        ),
      );
      await fetchWithAuth(`${API_URL}/notifications/read-all/${user.id}`, {
        method: "PUT",
      });
      await fetchNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const getRequestById = (requestId: string) =>
    requests.find((req) => req.request_id === requestId);

  return (
    <DataContext.Provider
      value={{
        requests,
        notifications,
        submitRequest,
        resubmitRequest,
        approveRequest,
        disapproveRequest,
        returnForRevision,
        updateDeliveryStatus,
        cancelRequest,
        markNotificationRead,
        markAllNotificationsRead,
        getRequestById,
        fetchRequestById,
        refreshData,
        fetchWithAuth,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
