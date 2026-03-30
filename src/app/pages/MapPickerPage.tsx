import { useEffect } from "react";
import { useLocation } from "react-router";
import { MapPickerContent } from "../components/MapPicker";
import { type Location as MapLocation } from "../types";

export function MapPickerPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  const type = searchParams.get("type") || "pickup";
  const title = searchParams.get("title") || "Select Location";
  
  // Try to get initial location from session storage or URL
  const initialLocationRaw = searchParams.get("initial");
  let initialLocation: MapLocation | undefined;
  
  if (initialLocationRaw) {
    try {
      initialLocation = JSON.parse(decodeURIComponent(initialLocationRaw));
    } catch (e) {
      console.error("Failed to parse initial location", e);
    }
  }

  const handleLocationSelect = (selectedLocation: MapLocation) => {
    // Send message back to opener tab
    if (window.opener) {
      window.opener.postMessage({
        type: "MAP_LOCATION_SELECTED",
        payload: {
          location: selectedLocation,
          pickerType: type
        }
      }, window.location.origin);
      
      // Close this tab
      window.close();
    } else {
      // Fallback if not opened as a popup/new tab properly
      alert("Selection confirmed: " + selectedLocation.address + ". Please close this tab.");
    }
  };

  return (
    <div className="w-screen h-screen">
      <MapPickerContent 
        title={title}
        initialLocation={initialLocation}
        onLocationSelect={handleLocationSelect}
        isStandalone={true}
      />
    </div>
  );
}
