export const getAuthRedirect = ({
  isLoading,
  user,
  firstSegment,
  navigationReady,
}: {
  isLoading: boolean;
  user: unknown;
  firstSegment?: string;
  navigationReady: boolean;
}): '/login' | '/(tabs)' | null => {
  if (isLoading || !navigationReady) return null;

  const inAuthGroup = firstSegment === 'login';
  if (!user && !inAuthGroup) return '/login';
  if (user && inAuthGroup) return '/(tabs)';
  return null;
};
