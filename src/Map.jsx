// src/Map.jsx
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  getFirestore,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from './firebase';

// ── ここが必須です！地図が真っ白になる原因の大半はトークンがないため ──
mapboxgl.accessToken = 'pk.eyJ1IjoibnNvdG8iLCJhIjoiY21iaThvYTM0MDNrazJsczg2azNpNHY0MyJ9.lXDqV1BT_xd_FkjlOTFzGg';

const db = getFirestore(app);
const auth = getAuth(app);

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const userMarkerRef = useRef(null);
  const [pins, setPins] = useState([]);               // CSV から読み込まれたスポット情報
  const [completedSpots, setCompletedSpots] = useState([]); // Firestore 上の達成状態（spotIndex の配列）
  const [photos, setPhotos] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const fileInputRef = useRef(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(null);

  const csvUrl = '/output_with_coords.csv';

  // ── Firestore の達成コレクションをリアルタイム監視 ──
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'achievements'),
      (snapshot) => {
        const achievedIndices = snapshot.docs.map((docSnap) => Number(docSnap.id));
        setCompletedSpots(achievedIndices);
      },
      (error) => {
        console.error('achievements の購読エラー:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // ── 写真が選択されたときに Firestore に「達成データ」を保存 ──
  const handlePhotoSelected = async (event) => {
    const file = event.target.files[0];
    if (!file || currentPhotoIndex === null) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      setPhotos((prev) => ({ ...prev, [currentPhotoIndex]: base64 }));

      if (!completedSpots.includes(currentPhotoIndex)) {
        const user = auth.currentUser;
        if (!user) {
          alert('ログインしてください');
          return;
        }
        try {
          await setDoc(doc(db, 'achievements', String(currentPhotoIndex)), {
            achieved: true,
            userId: user.uid,
            nickname: user.displayName || '名無し',
            address: pins[currentPhotoIndex].address,
            timestamp: Timestamp.fromDate(new Date())
          });
          console.log('Firestore に達成データを保存:', currentPhotoIndex);
        } catch (error) {
          console.error('Firestore 保存エラー:', error);
        }
      }
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // 同じスポットを連続で撮るときに必要
  };

  // ── 地図初期化＋現在地取得＋CSV 読み込み ──
  useEffect(() => {
    if (map.current) return;

    // ① Mapbox 地図を初期化
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [139.622271, 35.905327],
      zoom: 12
    });

    // ② 日本語ラベルを優先表示
    map.current.on('style.load', () => {
      map.current.getStyle().layers?.forEach((layer) => {
        if (layer.type === 'symbol' && layer.layout?.['text-field']) {
          map.current.setLayoutProperty(layer.id, 'text-field', [
            'coalesce',
            ['get', 'name_ja'],
            ['get', 'name']
          ]);
        }
      });
    });

    // ③ 現在地を示すカスタムマーカー（矢印アイコン）
    const el = document.createElement('div');
    el.style.cssText = `
      width: 32px;
      height: 32px;
      background-image: url(/arrow.svg);
      background-size: contain;
      background-repeat: no-repeat;
      transform-origin: center;
    `;
    userMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat([139.622271, 35.905327])
      .setPopup(new mapboxgl.Popup().setText('あなたの現在地'))
      .addTo(map.current);

    // ④ 位置情報ウォッチ（現在地マーカーを更新）
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([longitude, latitude]);
        userMarkerRef.current?.setLngLat([longitude, latitude]);
      },
      (err) => console.warn('位置取得エラー:', err),
      { enableHighAccuracy: true }
    );

    // ⑤ 端末向き取得（コンパス代わり）
    const handleOrientation = (event) => {
      if (!event.alpha || !userMarkerRef.current) return;
      const iconEl = userMarkerRef.current.getElement();
      iconEl.style.transform = `rotate(${360 - event.alpha}deg)`;
    };
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    }

    // ⑥ CSV を fetch して pins (スポット配列) を読み込む
    fetch(csvUrl)
      .then((res) => res.text())
      .then((text) => {
        // ヘッダー行がある場合は slice(1) を使う。ないなら slice(1) を外す
        const data = text.trim().split('\n').slice(1).map((line) => {
          const [address, lng, lat] = line.split(',');
          return { address, lng: parseFloat(lng), lat: parseFloat(lat) };
        });
        setPins(data);
      })
      .catch((err) => console.error('CSV 読み込みエラー:', err));

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
    };
  }, []);

  // ── ピンをタップしてナビを開始 ──
  const startNavigation = async (destination) => {
    if (!userLocation || !map.current) {
      alert('現在地が取得できていません。');
      return;
    }
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${
      userLocation[0]
    },${userLocation[1]};${destination[0]},${destination[1]}?geometries=geojson&access_token=${
      mapboxgl.accessToken
    }`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!data.routes?.length) return alert('ルートが見つかりませんでした。');

      const routeGeoJSON = {
        type: 'Feature',
        properties: {},
        geometry: data.routes[0].geometry
      };

      if (map.current.getSource('route')) {
        map.current.getSource('route').setData(routeGeoJSON);
      } else {
        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: { type: 'geojson', data: routeGeoJSON },
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#3b9ddd', 'line-width': 6, 'line-opacity': 0.8 }
        });
      }

      const bounds = new mapboxgl.LngLatBounds();
      routeGeoJSON.geometry.coordinates.forEach((coord) => bounds.extend(coord));
      map.current.fitBounds(bounds, { padding: 50 });

      // ポップアップをすべて閉じる
      document
        .querySelectorAll('.mapboxgl-popup-close-button')
        .forEach((btn) => btn.click());
    } catch (err) {
      console.error('ルート取得エラー:', err);
      alert('ルート取得に失敗しました。');
    }
  };

  // ── pins or completedSpots が変わるたびにマーカーを再描画 ──
  useEffect(() => {
    if (!map.current || pins.length === 0) return;

    // 自分の現在地マーカー以外をすべて削除
    document.querySelectorAll('.mapboxgl-marker').forEach((marker) => {
      if (marker !== userMarkerRef.current?.getElement()) marker.remove();
    });

    pins.forEach(({ lng, lat, address }, index) => {
      const isCompleted = completedSpots.includes(index);

      // ポップアップ用の DOM を生成
      const popupNode = document.createElement('div');
      popupNode.innerHTML = `
        <div style="font-size: 14px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px;">${address}</h3>
          ${
            isCompleted
              ? `<p style="color: green; margin: 0;">✅ 達成済み</p>
                 <button id="cancel-btn" style="margin-top: 8px; background: #ccc; color: black; border: none; padding: 6px 12px; border-radius: 6px; font-size: 14px; width: 100%; cursor: pointer;">❌ 達成を取り消す</button>`
              : `<button id="photo-btn" style="background: #ff6b6b; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 14px; width: 100%; cursor: pointer;">📸 写真を撮る</button>`
          }
          <button id="nav-btn" style="margin-top: 8px; background: #0070f3; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 14px; width: 100%; cursor: pointer;">🧭 ナビ開始</button>
        </div>
      `;

      // 達成済みなら「取り消し」ボタンを有効化
      if (isCompleted) {
        const cancelButton = popupNode.querySelector('#cancel-btn');
        cancelButton?.addEventListener('click', async () => {
          try {
            await deleteDoc(doc(db, 'achievements', String(index)));
          } catch (e) {
            console.error('達成取り消しエラー:', e);
          }
        });
      } else {
        // 未達成なら写真撮影ボタンを有効化
        const photoButton = popupNode.querySelector('#photo-btn');
        photoButton?.addEventListener('click', () => {
          window.takePhoto?.(index);
        });
      }

      // ナビ開始ボタン
      const navButton = popupNode.querySelector('#nav-btn');
      navButton?.addEventListener('click', () => {
        startNavigation([lng, lat]);
      });

      // マーカーを地図に追加（色：緑＝未達成 / ピンク＝達成済み）
      new mapboxgl.Marker({ color: isCompleted ? '#ee008c' : '#00cc55' })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupNode))
        .addTo(map.current);
    });
  }, [pins, completedSpots]);

  // ── ルートを消す関数（ナビ終了ボタン用） ──
  const clearNavigation = () => {
    if (!map.current) return;
    if (map.current.getLayer("route")) {
      map.current.removeLayer("route");
    }
    if (map.current.getSource("route")) {
      map.current.removeSource("route");
    }
  };

  // ── 写真撮影トリガー用のグローバル関数を設定 ──
  useEffect(() => {
    window.takePhoto = (index) => {
      setCurrentPhotoIndex(index);
      fileInputRef.current?.click();
    };
    return () => delete window.takePhoto;
  }, []);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      {/* 地図コンテナ：Flex コンテナの下部に配置され、h-full で残り画面を埋めます */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* 進捗バー＋ナビ終了ボタンを画面上部に配置 */}
      <div
        className="
          absolute top-3 left-3 right-3
          bg-white/90 backdrop-blur-sm
          p-2 rounded-lg shadow-lg
          z-50 flex items-center justify-between
        "
      >
        <div className="flex items-center space-x-3">
          <div className="text-xl">📸</div>
          <div>
            <div className="text-sm font-semibold text-gray-800">
              {completedSpots.length} / {pins.length} 箇所達成
            </div>
            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{
                  width: `${
                    pins.length
                      ? (completedSpots.length / pins.length) * 100
                      : 0
                  }%`
                }}
              />
            </div>
          </div>
        </div>

        {/* ナビ終了ボタン */}
        <button
          onClick={clearNavigation}
          className="
            ml-4 px-2 py-1 
            bg-red-400 text-white rounded 
            text-xs hover:bg-red-500 transition
          "
          aria-label="ナビ終了"
        >
          ナビ終了
        </button>
      </div>

      {/* 隠しファイル入力：写真撮影用 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handlePhotoSelected}
      />
    </div>
  );
}
