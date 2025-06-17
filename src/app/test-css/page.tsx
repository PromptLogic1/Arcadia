export default function TestCSS() {
  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <h1 className="mb-8 text-4xl font-bold text-cyan-500">CSS Test Page</h1>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="flex h-32 items-center justify-center rounded-lg bg-red-500 text-white">
          Red Box
        </div>
        <div className="flex h-32 items-center justify-center rounded-lg bg-green-500 text-white">
          Green Box
        </div>
        <div className="flex h-32 items-center justify-center rounded-lg bg-blue-500 text-white">
          Blue Box
        </div>
      </div>

      <div className="rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 p-6">
        <p className="text-lg text-white">
          If you can see colored boxes above and this gradient background,
          Tailwind CSS is working!
        </p>
      </div>

      <div className="mt-8 rounded border-2 border-cyan-500 p-4">
        <p className="text-cyan-200">
          Border test: This should have a cyan border
        </p>
      </div>
    </div>
  );
}
