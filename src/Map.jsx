import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'pk.eyJ1IjoiY25jb25uZWN0IiwiYSI6ImNseDdvNmF3ZTBjcHMzZXJzMnpkd2JxNGkifQ._DU8yr4U3C9kVpAWFNGelQ';

const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [spots, setSpots] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [navigationRoute, setNavigationRoute] = useState(null);

  useEffect(() => {
    fetch('/output_with_coords.csv')
      .then(res => res.text())
      .then(text => {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',');
        const rows = lines.slice(1).map(line => {
          const values = line.split(',');
          const row = {};
          headers.forEach((header, i) => {
            row[header] = values[i];
          });
          return row;
        });
        setSpots(rows);
      });
  }, []);

  useEffect(() => {
    if (map.current || spots.length === 0) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [139.6455, 35.8617],
      zoom: 12,
    });

    map.current.on('load', () => {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([longitude, latitude]);

        new mapboxgl.Marker({ color: 'blue' })
          .setLngLat([longitude, latitude])
          .addTo(map.current);
      });

      spots.forEach((spot, index) => {
        const lng = parseFloat(spot['経度']);
        const lat = parseFloat(spot['緯度']);
        const isCompleted = completed.includes(index);

        const el = document.createElement('div');
        el.className = 'marker';
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = isCompleted ? 'green' : 'red';

        const popupContent = document.createElement('div');
        popupContent.innerHTML = `
          <h3 style="margin: 0; font-size: 16px;">${spot['スポット名']}</h3>
          <p style="margin: 4px 0; font-size: 14px;">${spot['説明文']}</p>
          <button style="margin: 4px;" onclick="window.takePhoto(${index})">📸 写真を撮る</button>
          <button style="margin: 4px;" onclick="(${startNavigation.toString()})(${lat}, ${lng})">📍 ナビ</button>
        `;

        new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .setPopup(new mapboxgl.Popup().setDOMContent(popupContent))
          .addTo(map.current);
      });
    });
  }, [spots]);

  useEffect(() => {
    window.takePhoto = (index) => {
      if (!completed.includes(index)) {
        setCompleted([...completed, index]);
      }
    };
  }, [completed]);

  function startNavigation(lat, lng) {
    if (!userLocation) {
      alert('現在地が取得できていません');
      return;
    }

    fetch(`https://api.mapbox.com/directions/v5/mapbox/walking/${userLocation[0]},${userLocation[1]};${lng},${lat}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`)
      .then(res => res.json())
      .then(data => {
        const route = data.routes[0].geometry;

        if (navigationRoute) {
          map.current.removeLayer('route');
          map.current.removeSource('route');
        }

        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: route
          },
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#4264fb',
            'line-width': 6,
          },
        });

        setNavigationRoute(route);
      });
  }

  return (
    <div>
      <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />
    </div>
  );
};

export default Map;
