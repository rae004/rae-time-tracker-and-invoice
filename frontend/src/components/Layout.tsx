import { useEffect } from "react";
import { Outlet } from "react-router";
import { Navbar } from "./Navbar";
import { ToastContainer } from "./Toast";
import { useActiveTimer } from "../hooks/useActiveTimer";

const BASE_TITLE = "Rae Time Tracker";

export function Layout() {
  const { activeEntry } = useActiveTimer();
  const isRunning = activeEntry?.is_running ?? false;
  const startTime = activeEntry?.start_time;

  useEffect(() => {
    if (!isRunning || !startTime) {
      document.title = BASE_TITLE;
      return;
    }

    const start = new Date(startTime).getTime();
    const update = () => {
      const totalSeconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      const pad = (n: number) => n.toString().padStart(2, "0");
      const time =
        hours > 0
          ? `${hours}:${pad(minutes)}:${pad(secs)}`
          : `${minutes}:${pad(secs)}`;
      document.title = `${time} · ${BASE_TITLE}`;
    };

    update();
    const interval = setInterval(update, 1000);
    return () => {
      clearInterval(interval);
      document.title = BASE_TITLE;
    };
  }, [isRunning, startTime]);

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}
