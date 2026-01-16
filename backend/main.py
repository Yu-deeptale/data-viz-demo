from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import json

app = FastAPI()

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "API is running"}

@app.post("/parse")
async def parse_data(file: UploadFile = File(None), text: str = Form(None)):
    df = None
    
    try:
        if file:
            contents = await file.read()
            filename = file.filename.lower()
            if filename.endswith('.xlsx'):
                try:
                    df = pd.read_excel(io.BytesIO(contents))
                except ImportError as e:
                    if "openpyxl" in str(e):
                         raise HTTPException(status_code=500, detail="サーバー設定エラー: Excelファイルを読み込むためのライブラリ 'openpyxl' がインストールされていません。")
                    raise e
            elif filename.endswith('.json'):
                df = pd.read_json(io.BytesIO(contents))
            elif filename.endswith('.csv'):
                try:
                    df = pd.read_csv(io.BytesIO(contents), encoding='utf-8')
                except UnicodeDecodeError:
                    # Fallback for Japanese Windows encodings
                    df = pd.read_csv(io.BytesIO(contents), encoding='cp932')
            else:
                 raise HTTPException(status_code=400, detail="サポートされていないファイル形式です。.xlsx, .json, .csv のいずれかをアップロードしてください。")
        elif text:
            # Try parsing as JSON first
            try:
                # If text is a JSON string of records/list
                data = json.loads(text)
                df = pd.DataFrame(data)
            except json.JSONDecodeError:
                # Fallback to CSV format
                try:
                    df = pd.read_csv(io.StringIO(text))
                except Exception:
                     raise HTTPException(status_code=400, detail="テキストデータを解析できませんでした。有効なJSONまたはCSV形式のデータを提供してください。")
        
        if df is None or df.empty:
             raise HTTPException(status_code=400, detail="データが見つかりません。")

        # Basic processing for charting (example: numerical columns)
        numeric_df = df.select_dtypes(include=['number'])
        
        if numeric_df.empty:
            return {"message": "グラフ描画可能な数値データが見つかりません。", "raw_data": df.fillna("").to_dict(orient="records")}

        # Prepare data for Chart.js
        # Assuming the first non-numeric column is labels, or just index
        labels = df.index.tolist()
        non_numeric = df.select_dtypes(exclude=['number'])
        if not non_numeric.empty:
            labels = non_numeric.iloc[:, 0].tolist()

        datasets = []
        # デザイン要件: カラフルにしない。認知的負荷を下げるため、落ち着いた色味を使用。
        # Slate(グレー系), Blue(青系) を中心に配置
        colors = [
            'rgba(71, 85, 105, 0.8)',   # slate-600
            'rgba(59, 130, 246, 0.8)',  # blue-500
            'rgba(16, 185, 129, 0.8)',  # emerald-500 (アクセント)
            'rgba(245, 158, 11, 0.8)',  # amber-500 (アクセント)
        ]
        
        for i, column in enumerate(numeric_df.columns):
            color = colors[i % len(colors)]
            datasets.append({
                "label": column,
                "data": numeric_df[column].fillna(0).tolist(),
                "backgroundColor": color,
                "borderColor": color, # ボーダーも同色にしてノイズを減らす
                "borderWidth": 1
            })

        return {
            "labels": labels,
            "datasets": datasets,
            "raw_data": df.fillna("").to_dict(orient="records"),
            "all_columns": df.columns.tolist(),
            "numeric_columns": numeric_df.columns.tolist(),
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))