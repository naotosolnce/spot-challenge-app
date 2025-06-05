import Map from "./Map";
import { Link } from 'react-router-dom';


function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100">
      {/* ヘッダー */}
      <header className="pt-12 pb-8">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h1 className="text-5xl font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-4">
            SPOT RALLY
          </h1>
          <p className="text-gray-600 text-lg">写真を撮って、スポットを制覇しよう</p>
        </div>
      </header>

      {/* 地図セクション */}
<main className="max-w-4xl mx-auto px-8 pb-12">
  <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
    <Map />
    <div className="text-center mt-4">
      <Link to="/gallery">
        <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition">
          📸 ギャラリーを見る
        </button>
      </Link>
    </div>
  </div>

      </main>
    </div>
  );
}

export default App;
