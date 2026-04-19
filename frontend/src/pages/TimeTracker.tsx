import { TimerControls } from "../components/TimerControls";
import { WeeklyView } from "../components/WeeklyView";

export function TimeTracker() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Time Tracker</h1>
        <p className="text-base-content/70">
          Track your work hours and view weekly summaries
        </p>
      </div>

      {/* Timer controls */}
      <TimerControls />

      {/* Weekly view */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <WeeklyView />
        </div>
      </div>
    </div>
  );
}
