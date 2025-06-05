import React, { useState } from 'react';
import { db } from './firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

function UploadPins() {
  const [status, setStatus] = useState('準備完了');

  const handleUpload = async () => {
    setStatus('CSV読み込み中...');
    try {
      // CSVファイルをfetchで取得
      const res = await fetch('/output_with_coords.csv');
      const csvText = await res.text();

      // CSVを行ごとに分割してパース（簡易的にカンマ区切り）
      const lines = csvText.trim().split('\n');
      setStatus(`CSV行数: ${lines.length}`);

      // Firestore pinsコレクションへの参照
      const pinsCollection = collection(db, 'pins');

      let count = 0;
      for (const [index, line] of lines.entries()) {
        const [address, longitude, latitude] = line.split(',');

        // FirestoreにドキュメントID pin1, pin2, ...で登録
        await setDoc(doc(pinsCollection, `pin${index + 1}`), {
          name: address,
          longitude: parseFloat(longitude),
          latitude: parseFloat(latitude),
          achievedBy: null,
          achievedAt: null,
        });

        count++;
        setStatus(`登録中... ${count} / ${lines.length}`);
      }

      setStatus(`アップロード完了！合計 ${count} 件登録`);
    } catch (error) {
      console.error(error);
      setStatus('アップロード失敗: ' + error.message);
    }
  };

  return (
    <div style={{ padding: 20, background: '#eee', marginBottom: 20 }}>
      <p>FirestoreにCSVピン情報をアップロードします。</p>
      <button onClick={handleUpload}>アップロード実行</button>
      <p>{status}</p>
    </div>
  );
}

export default UploadPins;
