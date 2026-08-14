"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import BookingNotifier from "@/components/BookingNotifier";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      {/* Live booking: browser push + bell + popup for Admin/Staff */}
      <BookingNotifier />
    </SessionProvider>
  );
}
