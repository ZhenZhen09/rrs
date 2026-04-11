import { Redirect } from 'expo-router';
import React from 'react';

export default function Index() {
  // This is the root index. It redirects to the login screen by default.
  return <Redirect href="/login" />;
}
