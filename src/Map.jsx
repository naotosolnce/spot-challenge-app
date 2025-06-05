import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Papa from "papaparse";

mapboxgl.accessToken = "pk.eyJ1IjoibnNvdG8iLCJhIjoiY21iaThvYTM0MDNrazJsczg2azNpNHY0MyJ9.lXDqV1BT_xd_FkjlOTFzGg"; // ← あなたのトークンに置き換えてください

const Map = () => {
  const mapRef = useRef(null);
  const [spots, setSpots] = useState([]);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [139.6489, 35.8617], // さいたま市の中心（初期値）
      zoom: 12,
    });

    // CSV読み込み処理
    fetch("/output_with_coords.csv")
      .then((response) => response.text())
      .then((csvText) => {
        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            setSpots(results.data);
            results.data.forEach((spot) => {
              if (spot.longitude && spot.latitude) {
                new mapboxgl.Marker()
                  .setLngLat([parseFloat(spot.longitude), parseFloat(spot.latitude)])
                  .setPopup(new mapboxgl.Popup().setText(spot.name || "スポット"))
                  .addTo(map);
              }
            });
          },
        });
      });

    // 現在地取得
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // 現在地に青いマーカーを立てて、地図を移動
          new mapboxgl.Marker({ color: "blue" })
            .setLngLat([longitude, latitude])
            .setPopup(new mapboxgl.Popup().setText("あなたの現在地"))
            .addTo(map);

          map.flyTo({ center: [longitude, latitude], zoom: 14 });
        },
        (error) => {
          console.error("位置情報取得エラー:", error);
        }
      );
    } else {
      console.warn("このブラウザでは位置情報が使えません");
    }

    return () => map.remove();
  }, []);

  return <div ref={mapRef} style={{ width: "100%", height: "100vh" }} />;
};

export default Map;
