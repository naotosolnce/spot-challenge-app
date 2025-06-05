import pandas as pd
import requests
import time

# ✅ OpenCage APIキーをここに入力してください（文字列で）
API_KEY = '5db53f4e36a941258cb9e6b7cc23c612'  # ← 必ず自分のAPIキーに書き換えてください

# 入出力ファイル名
input_file = '住所のみ - Table 1.csv'
output_file = 'geocoded_output.csv'

# CSV読み込み（BOM付きCSVにも対応）
df = pd.read_csv(input_file, encoding='utf-8-sig')

results = []

for address in df['住所']:
    print(f"\n📍 住所変換中: {address}")

    params = {
        'q': address,
        'key': API_KEY,
        'language': 'ja',
        'limit': 1
    }

    try:
        response = requests.get('https://api.opencagedata.com/geocode/v1/json', params=params)
        data = response.json()

        # ✅ OpenCage APIのレスポンス全体を表示（デバッグ用）
        print("📦 OpenCageレスポンス ↓↓↓")
        print(data)

        if data['results']:
            lat = data['results'][0]['geometry']['lat']
            lng = data['results'][0]['geometry']['lng']
            print(f"✅ 緯度: {lat}, 経度: {lng}")
        else:
            lat, lng = None, None
            print("⚠️ ジオコード結果なし")

    except Exception as e:
        print(f"❌ 通信エラー: {e}")
        lat, lng = None, None

    results.append({'住所': address, '緯度': lat, '経度': lng})
    time.sleep(1)  # 無料プランでは1秒待機

# 出力ファイルに保存
pd.DataFrame(results).to_csv(output_file, index=False, encoding='utf-8-sig')
print(f"\n✅ 出力完了 → {output_file}")
