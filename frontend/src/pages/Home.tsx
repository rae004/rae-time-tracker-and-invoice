export function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome to Rae Time Tracker</h1>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Getting Started</h2>
          <p className="text-base-content/70">
            This is your new CRUD application scaffold. Start building by:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-base-content/70">
            <li>Adding models in <code className="bg-base-200 px-1 rounded">backend/app/models/</code></li>
            <li>Creating routes in <code className="bg-base-200 px-1 rounded">backend/app/routes/</code></li>
            <li>Defining schemas in <code className="bg-base-200 px-1 rounded">backend/app/schemas/</code></li>
            <li>Building React components in <code className="bg-base-200 px-1 rounded">frontend/src/components/</code></li>
            <li>Adding hooks for data fetching in <code className="bg-base-200 px-1 rounded">frontend/src/hooks/</code></li>
          </ul>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Tech Stack</h2>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <h3 className="font-semibold">Backend</h3>
              <ul className="text-sm text-base-content/70 mt-2 space-y-1">
                <li>Python 3.13</li>
                <li>Flask 3.x</li>
                <li>SQLAlchemy 2.x</li>
                <li>Pydantic 2.x</li>
                <li>PostgreSQL 17</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Frontend</h3>
              <ul className="text-sm text-base-content/70 mt-2 space-y-1">
                <li>React 19</li>
                <li>TypeScript 5.6</li>
                <li>TailwindCSS 4</li>
                <li>DaisyUI 5</li>
                <li>React Query 5</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
