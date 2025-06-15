import PlayAreaClientContent from './play-area-client';

export default function PlayAreaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <PlayAreaClientContent />
      </div>
    </div>
  );
}
