export function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Application Settings</h2>
          <p className="text-base-content/70">
            Configure your application settings here.
          </p>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">About</h2>
          <p className="text-base-content/70">
            Rae Time Tracker - A CRUD application built with Flask and React.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <p><strong>Version:</strong> 0.1.0</p>
            <p><strong>Frontend:</strong> React 19, TypeScript, TailwindCSS, DaisyUI</p>
            <p><strong>Backend:</strong> Flask, PostgreSQL</p>
          </div>
        </div>
      </div>
    </div>
  );
}
