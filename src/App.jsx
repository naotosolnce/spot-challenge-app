import Map from "./Map";

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
        </div>

        {/* 使い方カード */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: '📍', title: 'スポット発見', desc: '地図上のピンをタップ', color: 'bg-pink-500' },
            { icon: '📸', title: '写真撮影', desc: '現地で記念撮影', color: 'bg-orange-500' },
            { icon: '🏆', title: 'コンプリート', desc: '全制覇を目指そう', color: 'bg-purple-500' },
          ].map(({ icon, title, desc, color }, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 text-center shadow-lg">
              <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                <span className="text-white text-sm">{icon}</span>
              </div>
              <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
