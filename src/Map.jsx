import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'YOUR_MAPBOX_TOKEN'; // ← ここは自分のトークンに置き換えてください

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const userMarkerRef = useRef(null);
  const headingRef = useRef(0); // ← 向き保存用

  const [pins, setPins] = useState([]);
  const [completedSpots, setCompletedSpots] = useState([]);
  const [photos, setPhotos] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [following, setFollowing] = useState(true); // コンパスモード用

  const csvUrl = '/output_with_coords.csv';

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [139.622271, 35.905327],
      zoom: 14,
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

    const el = document.createElement('div');
    el.style.width = '32px';
    el.style.height = '32px';
    el.style.backgroundImage = 'url(/arrow.svg)';
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.transformOrigin = 'center';

    userMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat([139.622271, 35.905327])
      .addTo(map.current);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const loc = [longitude, latitude];
        setUserLocation(loc);

        userMarkerRef.current.setLngLat(loc);

        if (following && map.current) {
          map.current.easeTo({
            center: loc,
            bearing: headingRef.current,
            duration: 500,
          });
        }
      },
      (err) => console.warn('位置取得エラー:', err),
      { enableHighAccuracy: true }
    );

    const handleOrientation = (event) => {
      const alpha = event.alpha;
      headingRef.current = 360 - alpha;

      const el = userMarkerRef.current.getElement();
      el.style.transform = `rotate(${headingRef.current}deg)`;

      if (following && userLocation && map.current) {
        map.current.easeTo({
          center: userLocation,
          bearing: headingRef.current,
          duration: 500,
        });
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation, true);

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
  }, [following]);

  const startNavigation = async (destination) => {
    if (!userLocation) {
      alert('現在地が取得できていません');
      return;
    }

    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${userLocation[0]},${userLocation[1]};${destination[0]},${destination[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (!data.routes.length) {
        alert('ルートが見つかりません');
        return;
      }

      const route = {
        type: 'Feature',
        geometry: data.routes[0].geometry,
      };

      if (map.current.getSource('route')) {
        map.current.getSource('route').setData(route);
      } else {
        map.current.addSource('route', { type: 'geojson', data: route });
        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3b9ddd',
            'line-width': 6,
          },
        });
      }

      const bounds = new mapboxgl.LngLatBounds();
      route.geometry.coordinates.forEach(coord => bounds.extend(coord));
      map.current.fitBounds(bounds, { padding: 50 });

      map.current.getPopup()?.remove(); // ← ポップアップ閉じる

    } catch (err) {
      console.error('ルート取得失敗', err);
    }
  };

  const endNavigation = () => {
    if (map.current.getLayer('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }
  };

  useEffect(() => {
    if (!map.current || pins.length === 0) return;

    document.querySelectorAll('.mapboxgl-marker').forEach(marker => {
      if (marker !== userMarkerRef.current.getElement()) marker.remove();
    });

    pins.forEach(({ lng, lat, address }, index) => {
      const isCompleted = completedSpots.includes(index);

      const popupNode = document.createElement('div');
      popupNode.innerHTML = `
        <div style="font-size:14px;">
          <h3 style="margin: 0 0 8px 0;">${address}</h3>
          ${
            isCompleted
              ? '<p style="color: green;">✅ 達成済み</p>'
              : '<button style="width:100%;background:#ff6b6b;color:white;padding:8px;border:none;border-radius:5px;margin-bottom:5px;">📸 写真を撮る</button>'
          }
          <button style="width:100%;background:#0070f3;color:white;padding:6px;border:none;border-radius:5px;">🧭 ナビ開始</button>
        </div>
      `;

      if (!isCompleted) {
        popupNode.querySelector('button').addEventListener('click', () => {
          window.takePhoto && window.takePhoto(index);
        });
      }

      popupNode.querySelectorAll('button')[isCompleted ? 0 : 1].addEventListener('click', () => {
        startNavigation([lng, lat]);
      });

      new mapboxgl.Marker({ color: isCompleted ? '#ee008c' : '#00cc55' })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupNode))
        .addTo(map.current);
    });
  }, [pins, completedSpots]);

  useEffect(() => {
    const saved = localStorage.getItem('completedSpots');
    if (saved) setCompletedSpots(JSON.parse(saved));
    const savedPhotos = localStorage.getItem('photos');
    if (savedPhotos) setPhotos(JSON.parse(savedPhotos));
  }, []);

  useEffect(() => {
    localStorage.setItem('completedSpots', JSON.stringify(completedSpots));
  }, [completedSpots]);

  useEffect(() => {
    localStorage.setItem('photos', JSON.stringify(photos));
  }, [photos]);

  const handleCurrentLocationClick = () => {
    if (userLocation && map.current) {
      map.current.easeTo({
        center: userLocation,
        bearing: headingRef.current,
        duration: 500,
      });
    }
  };

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />

      {/* 進捗カード */}
      <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg z-50 flex items-center justify-between">
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

      {/* ナビ終了ボタン */}
      <button
        onClick={endNavigation}
        className="absolute top-3 left-3 z-50 bg-red-600 text-white px-4 py-2 rounded shadow"
      >
        ❌ ナビ終了
      </button>

      {/* 現在地ボタン */}
      <button
        onClick={handleCurrentLocationClick}
        className="absolute top-3 right-3 z-50 bg-white text-black px-3 py-2 rounded-full shadow-lg"
        aria-label="現在地へ移動"
      >
        📍
      </button>
    </div>
  );
}
