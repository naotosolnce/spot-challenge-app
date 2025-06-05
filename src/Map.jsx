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
import { app } from './firebase'; // Firebase 初期化ファイル

// ── ここが抜けると地図が真っ白になるので、必ず書いてください ──
mapboxgl.accessToken = 'pk.eyJ1IjoibnNvdG8iLCJhIjoiY21iaThvYTM0MDNrazJsczg2azNpNHY0MyJ9.lXDqV1BT_xd_FkjlOTFzGg';

const db = getFirestore(app);
const auth = getAuth(app);

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const userMarkerRef = useRef(null);
  const [pins, setPins] = useState([]); // CSV から読み込むスポット情報
  const [completedSpots, setCompletedSpots] = useState([]); // Firestore の達成状態
  const [photos, setPhotos] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const fileInputRef = useRef(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(null);

  const csvUrl = '/output_with_coords.csv';

  // ── Firestore の「achievements」コレクションをリアルタイム購読 ──
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'achievements'),
      (snapshot) => {
        // ドキュメントID が spotIndex の文字列なので、数値に変換して配列化
        const achievedIndices = snapshot.docs.map((docSnap) => Number(docSnap.id));
        setCompletedSpots(achievedIndices);
      },
      (error) => {
        console.error('achievements の購読エラー:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // ── 写真選択ハンドラー：base64 保存＋Firestore に達成データを保存 ──
  const handlePhotoSelected = async (event) => {
    const file = event.target.files[0];
    if (!file || currentPhotoIndex === null) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      setPhotos((prev) => ({ ...prev, [currentPhotoIndex]: base64 }));

      // まだ未達成なら Firestore に書き込む
      if (!completedSpots.includes(currentPhotoIndex)) {
        const user = auth.currentUser;
        if (!user) {
          alert('ログインしてください');
          return;
        }
        try {
          // ドキュメント ID を spotIndex の文字列にすることで一意に管理
          await setDoc(doc(db, 'achievements', String(currentPhotoIndex)), {
            achieved: true,
            userId: user.uid,
            nickname: user.displayName || '名無し',
            address: pins[currentPhotoIndex].address,
            timestamp: Timestamp.fromDate(new Date()),
          });
          console.log('Firestore に達成データを保存:', currentPhotoIndex);
        } catch (error) {
          console.error('Firestore 保存エラー:', error);
        }
      }
    };
    reader.readAsDataURL(file);

    // 同じ index で再度写真を撮れるように value をクリア
    event.target.value = '';
  };

  // ── 地図初期化 + 現在地取得 + CSV 読み込み ──
  useEffect(() => {
    if (map.current) return; // 一度だけ初期化

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [139.622271, 35.905327], // さいたま市付近
      zoom: 12,
    });

    // 地図のスタイルがロードされたら日本語ラベル優先表示
    map.current.on('style.load', () => {
      map.current.getStyle().layers?.forEach((layer) => {
        if (layer.type === 'symbol' && layer.layout?.['text-field']) {
          map.current.setLayoutProperty(layer.id, 'text-field', [
            'coalesce',
            ['get', 'name_ja'],
            ['get', 'name'],
          ]);
        }
      });
    });

    // 現在地を示すマーカー（矢印アイコン）
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

    // ピン位置に向けて現在地を更新（watchPosition）
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([longitude, latitude]);
        userMarkerRef.current?.setLngLat([longitude, latitude]);
      },
      (err) => console.warn('位置取得エラー:', err),
      { enableHighAccuracy: true }
    );

    // 端末の向き取得（コンパス代わり）
    const handleOrientation = (event) => {
      if (!event.alpha || !userMarkerRef.current) return;
      const iconEl = userMarkerRef.current.getElement();
      iconEl.style.transform = `rotate(${360 - event.alpha}deg)`;
    };
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    }

    // CSV をフェッチして pins（スポット情報）を読み込む
    fetch(csvUrl)
      .then((res) => res.text())
      .then((text) => {
        // 1行目をヘッダーとして読み飛ばす場合は slice(1) を使う、
        // ヘッダーがない場合は slice(1) を除いてください。
        const data = text
          .trim()
          .split('\n')
          .slice(1)
          .map((line) => {
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

  // ── あるピンをタップしてナビを開始する ──
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
      if (!data.routes?.length) {
        return alert('ルートが見つかりませんでした。');
      }

      const routeGeoJSON = {
        type: 'Feature',
        properties: {},
        geometry: data.routes[0].geometry,
      };

      if (map.current.getSource('route')) {
        map.current.getSource('route').setData(routeGeoJSON);
      } else {
        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: { type: 'geojson', data: routeGeoJSON },
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#3b9ddd', 'line-width': 6, 'line-opacity': 0.8 },
        });
      }

      const bounds = new mapboxgl.LngLatBounds();
      routeGeoJSON.geometry.coordinates.forEach((coord) => bounds.extend(coord));
      map.current.fitBounds(bounds, { padding: 50 });

      // すべてのポップアップを閉じる
      document
        .querySelectorAll('.mapboxgl-popup-close-button')
        .forEach((btn) => btn.click());
    } catch (err) {
      console.error('ルート取得エラー:', err);
      alert('ルート取得に失敗しました。');
    }
  };

  // ── pins または completedSpots が更新されるたびにマーカーを再描画 ──
  useEffect(() => {
    if (!map.current || pins.length === 0) return;

    // 現在地マーカー（userMarkerRef）の要素は残しつつ、他の全マーカーを削除
    document.querySelectorAll('.mapboxgl-marker').forEach((marker) => {
      if (marker !== userMarkerRef.current?.getElement()) marker.remove();
    });

    pins.forEach(({ lng, lat, address }, index) => {
      const isCompleted = completedSpots.includes(index);

      // ポップアップの中身をHTMLで作成
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

      // 達成済みなら「取り消し」ボタンのクリックで Firestore からドキュメントを削除
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
        // 未達成なら「写真を撮る」ボタンのクリックでカメラ起動
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

      // マーカーを追加（未達成＝緑 / 達成済み＝ピンク）
      new mapboxgl.Marker({ color: isCompleted ? '#ee008c' : '#00cc55' })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupNode))
        .addTo(map.current);
    });
  }, [pins, completedSpots]);

  // ── 写真撮影トリガー用にグローバル関数を設定 ──
  useEffect(() => {
    window.takePhoto = (index) => {
      setCurrentPhotoIndex(index);
      fileInputRef.current?.click();
    };
    return () => delete window.takePhoto;
  }, []);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      {/* 地図自体のコンテナ（親コンテナが flex-1 なので、h-full で画面残り全部を埋める） */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* 進捗バーを地図上に重ねて表示 */}
      <div
        className="
          absolute bottom-3 left-3 right-3
          bg-white/90 backdrop-blur-sm
          p-3 rounded-lg shadow-lg
          z-50 flex items-center justify-between
        "
      >
        <div className="flex items-center space-x-3">
          <div className="text-2xl">📸</div>
          <div>
            <div className="text-sm font-semibold text-gray-800">
              {completedSpots.length} / {pins.length} 箇所達成
            </div>
            <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{
                  width: `${
                    pins.length
                      ? (completedSpots.length / pins.length) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
        <div className="text-sm font-bold text-green-600">
          {pins.length
            ? Math.round((completedSpots.length / pins.length) * 100)
            : 0}
          %
        </div>
      </div>

      {/* 隠しファイル入力（写真撮影用） */}
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
