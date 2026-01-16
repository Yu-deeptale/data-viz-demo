import pandas as pd

# サンプルデータ（10行×5列）
data = {
    'ID': [f"id_{i}" for i in range(1, 11)],
    '年齢': [22, 34, 28, 45, 38, 26, 31, 29, 41, 36],
    '身長cm': [165, 170, 158, 175, 180, 168, 169, 172, 174, 171],
    '体重kg': [58, 72, 53, 80, 76, 60, 67, 65, 78, 70],
    '点数':    [80, 92, 85, 70, 88, 90, 75, 83, 77, 95],
}

df = pd.DataFrame(data)
df.to_excel("sample_data.xlsx", index=False)