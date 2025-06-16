export default function TestCSS() {
  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <h1 className="text-4xl font-bold text-cyan-500 mb-8">CSS Test Page</h1>
      
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-red-500 h-32 rounded-lg flex items-center justify-center text-white">
          Red Box
        </div>
        <div className="bg-green-500 h-32 rounded-lg flex items-center justify-center text-white">
          Green Box
        </div>
        <div className="bg-blue-500 h-32 rounded-lg flex items-center justify-center text-white">
          Blue Box
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-cyan-500 to-purple-500 p-6 rounded-lg">
        <p className="text-white text-lg">
          If you can see colored boxes above and this gradient background, Tailwind CSS is working!
        </p>
      </div>
      
      <div className="mt-8 p-4 border-2 border-cyan-500 rounded">
        <p className="text-cyan-200">
          Border test: This should have a cyan border
        </p>
      </div>
    </div>
  );
}