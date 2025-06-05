// geocode-csv.cjs
const fs = require('fs');
const Papa = require('papaparse');

const inputPath = 'input.csv';
const outputPath = 'output_with_coords.csv';

async function geocode(address) {
  const query = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=pk.eyJ1IjoibnNvdG8iLCJhIjoiY21iaThvYTM0MDNrazJsczg2azNpNHY0MyJ9.lXDqV1BT_xd_FkjlOTFzGg&language=ja&limit=1`;

  const res = await fetch(url); // ← グローバル fetch 使用（node-fetch不要）
  const data = await res.json();
  return data.features?.[0]?.geometry?.coordinates || [];
}

(async () => {
  const csvText = fs.readFileSync(inputPath, 'utf8');
  const { data } = Papa.parse(csvText, { header: true });

  const output = [];
  for (const row of data) {
    const address = row['住所'];
    if (!address) continue;

    const coords = await geocode(address);
    output.push({
      ...row,
      経度: coords[0] || '',
      緯度: coords[1] || '',
    });
  }

  const csv = Papa.unparse(output);
  fs.writeFileSync(outputPath, csv, 'utf8');
  console.log('✅ 出力完了: output_with_coords.csv');
})();
