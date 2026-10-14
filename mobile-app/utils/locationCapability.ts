export const shouldStartBackgroundLocation = ({
  taskManagerAvailable,
  permissionGranted,
  taskRegistered,
}: {
  taskManagerAvailable: boolean;
  permissionGranted: boolean;
  taskRegistered: boolean;
}) => taskManagerAvailable && permissionGranted && !taskRegistered;
