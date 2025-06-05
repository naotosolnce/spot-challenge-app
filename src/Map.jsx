import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'pk.eyJ1IjoibnNvdG8iLCJhIjoiY21iaThvYTM0MDNrazJsczg2azNpNHY0MyJ9.lXDqV1BT_xd_FkjlOTFzGg';

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const userMarkerRef = useRef(null);

  const [pins, setPins] = useState([]);
  const [completedSpots, setCompletedSpots] = useState([]);
  const [photos, setPhotos] = useState({});
  const [userLocation, setUserLocation] = useState(null); // ← 追加

  const csvUrl = '/output_with_coords.csv';

  useEffect(() => {
    if (map.current) return;

    // マップ初期化
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [139.622271, 35.905327],
      zoom: 12,
    });

    map.current.on('style.load', () => {
      map.current.getStyle().layers.forEach(layer => {
        if (layer.type === 'symbol' && layer.layout?.['text-field']) {
          map.current.setLayoutProperty(layer.id, 'text-field', [
            'coalesce',
            ['get', 'name_ja'],
            ['get', 'name'],
          ]);
        }
      });
    });

    // ユーザーマーカーの初期作成
    const el = document.createElement('div');
    el.style.width = '32px';
    el.style.height = '32px';
    el.style.backgroundImage = 'url(/arrow.svg)';
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.transformOrigin = 'center';

    userMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat([139.622271, 35.905327])
      .setPopup(new mapboxgl.Popup().setText('あなたの現在地'))
      .addTo(map.current);

    // 位置情報監視
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([longitude, latitude]); // 追加

        if (!userMarkerRef.current) {
          const el = document.createElement('div');
          el.style.width = '32px';
          el.style.height = '32px';
          el.style.backgroundImage = 'url(/arrow.svg)';
          el.style.backgroundSize = 'contain';
          el.style.backgroundRepeat = 'no-repeat';
          el.style.transformOrigin = 'center';

          userMarkerRef.current = new mapboxgl.Marker(el)
            .setPopup(new mapboxgl.Popup().setText('あなたの現在地'))
            .addTo(map.current);
        }
        userMarkerRef.current.setLngLat([longitude, latitude]);
      },
      (err) => console.warn('位置取得エラー:', err),
      { enableHighAccuracy: true }
    );

    // 端末の向きで矢印回転
    const handleOrientation = (event) => {
      const alpha = event.alpha;
      if (userMarkerRef.current) {
        const el = userMarkerRef.current.getElement();
        el.style.transform = `rotate(${360 - alpha}deg)`;
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    }

    // CSVからピン読み込み
    fetch(csvUrl)
      .then(res => res.text())
      .then(text => {
        const lines = text.trim().split('\n');
        const data = lines.slice(1).map(line => {
          const [address, lng, lat] = line.split(',');
          return { address, lng: parseFloat(lng), lat: parseFloat(lat) };
        });
        setPins(data);
      });

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
    };
  }, []);

  // ルート描画用関数をuseRefで保持（mapインスタンスを使うので）
  const startNavigation = async (destination) => {
    if (!userLocation) {
      alert('現在地が取得できていません。少し待ってからもう一度試してください。');
      return;
    }

    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${userLocation[0]},${userLocation[1]};${destination[0]},${destination[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (!data.routes || data.routes.length === 0) {
        alert('ルートが見つかりませんでした。');
        return;
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
          source: {
            type: 'geojson',
            data: routeGeoJSON,
          },
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3b9ddd',
            'line-width': 6,
            'line-opacity': 0.8,
          },
        });
      }

      const bounds = new mapboxgl.LngLatBounds();
      routeGeoJSON.geometry.coordinates.forEach(coord => bounds.extend(coord));
      map.current.fitBounds(bounds, { padding: 50 });

    } catch (error) {
      console.error('ルート取得エラー', error);
      alert('ルート取得に失敗しました。');
    }
  };

  // ピン描画（ユーザーマーカーは消さない）
  useEffect(() => {
    if (!map.current || pins.length === 0) return;

    // ユーザーマーカー以外を削除
    document.querySelectorAll('.mapboxgl-marker').forEach(marker => {
      if (marker !== userMarkerRef.current?.getElement()) {
        marker.remove();
      }
    });

    pins.forEach(({ lng, lat, address }, index) => {
      const isCompleted = completedSpots.includes(index);

      const popupNode = document.createElement('div');
      popupNode.innerHTML = `
        <div style="font-size: 14px; line-height: 1.4;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px;">${address}</h3>
          ${
            isCompleted
              ? '<p style="color: green; margin: 0;">✅ 達成済み</p>'
              : `<button
                  style="
                    background: #ff6b6b;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    width: 100%;
                    cursor: pointer;
                  ">📸 写真を撮る</button>`
          }
          <button
            style="
              margin-top: 8px;
              background: #0070f3;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 14px;
              width: 100%;
              cursor: pointer;
            "
          >🧭 ナビ開始</button>
        </div>
      `;

      if (!isCompleted) {
        popupNode.querySelector('button').addEventListener('click', () => {
          window.takePhoto && window.takePhoto(index);
        });
      }

      // ナビ開始ボタンは常に2つ目のbuttonになるのでこちらにイベントを登録
      popupNode.querySelectorAll('button')[isCompleted ? 0 : 1].addEventListener('click', () => {
        startNavigation([lng, lat]);
      });

      new mapboxgl.Marker({ color: isCompleted ? '#ee008c' : '#00cc55' })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupNode))
        .addTo(map.current);
    });
  }, [pins, completedSpots]);

  // 完了済みスポットと写真のローカル保存読み込み
  useEffect(() => {
    const savedCompleted = localStorage.getItem('completedSpots');
    if (savedCompleted) setCompletedSpots(JSON.parse(savedCompleted));

    const savedPhotos = localStorage.getItem('photos');
    if (savedPhotos) setPhotos(JSON.parse(savedPhotos));
  }, []);

  // ローカル保存の更新
  useEffect(() => {
    localStorage.setItem('completedSpots', JSON.stringify(completedSpots));
  }, [completedSpots]);

  useEffect(() => {
    localStorage.setItem('photos', JSON.stringify(photos));
  }, [photos]);

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />

      {/* コンパクトな進捗カード */}
      <div className="
        absolute bottom-3 left-3 right-3
        bg-white/90 backdrop-blur-sm
        p-3 rounded-lg shadow-lg
        z-50 flex items-center justify-between
      ">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">📸</div>
          <div>
            <div className="text-sm font-semibold text-gray-800">
              {completedSpots.length} / {pins.length} 箇所達成
            </div>
            <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${pins.length > 0 ? (completedSpots.length / pins.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
        <div className="text-sm font-bold text-green-600">
          {pins.length > 0 ? Math.round((completedSpots.length / pins.length) * 100) : 0}%
        </div>
      </div>
    </div>
  );
}
