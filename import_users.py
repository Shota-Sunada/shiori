import firebase_admin
from firebase_admin import credentials, auth
import pandas as pd

# Firebase Admin SDK の初期化
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

# CSVファイルの読み込み
df = pd.read_csv("users.csv")

success_count = 0
error_count = 0

for _, row in df.iterrows():
    email = row["email"].strip()
    password = row["password"].strip()

    try:
        user = auth.create_user(
            email=email,
            password=password
        )
        print(f"✅ 登録成功: {email}")
        success_count += 1
    except Exception as e:
        print(f"❌ 登録失敗: {email} → {e}")
        error_count += 1

print(f"\n📊 登録結果: 成功 {success_count} 件 / 失敗 {error_count} 件")
