'use client';

import { useState, useRef } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Home() {
  const [inputType, setInputType] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [textData, setTextData] = useState('');
  
  // APIレスポンス保持用
  const [apiResponse, setApiResponse] = useState<any>(null);
  // グラフ描画用データ（フィルタ・選択適用後）
  const [visualizationData, setVisualizationData] = useState<any>(null);
  
  // 軸選択State
  const [xAxisColumn, setXAxisColumn] = useState<string>('');
  const [yAxisColumns, setYAxisColumns] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<any>(null);

  // 軸設定が変わったらグラフデータを再生成
  const updateChartData = (data: any, xCol: string, yCols: string[]) => {
    if (!data || !xCol || yCols.length === 0) return;

    const rawData = data.raw_data;
    
    // X軸ラベル生成
    const labels = rawData.map((row: any) => row[xCol]);
    
    // データセット生成
    // カラフルさを回避するため、青・グレーの単色系（モノクロマティック）配色を使用
    const colors = [
        'rgba(59, 130, 246, 0.8)',   // blue-500 (メイン)
        'rgba(71, 85, 105, 0.8)',    // slate-600 (濃いグレー)
        'rgba(148, 163, 184, 0.8)',  // slate-400 (薄いグレー)
        'rgba(30, 58, 138, 0.8)',    // blue-900 (濃紺)
        'rgba(191, 219, 254, 0.8)',  // blue-200 (淡い青)
    ];

    const datasets = yCols.map((col, index) => ({
      label: col,
      data: rawData.map((row: any) => row[col] || 0),
      backgroundColor: colors[index % colors.length],
      borderColor: colors[index % colors.length], 
      borderWidth: 0, // 枠線なしでフラットに
      borderRadius: 4, // 角丸で優しく
    }));

    setVisualizationData({
      labels,
      datasets,
      raw_data: rawData,
      message: data.message
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setApiResponse(null);
    setVisualizationData(null);

    const formData = new FormData();
    if (inputType === 'file' && file) {
      formData.append('file', file);
    } else if (inputType === 'text' && textData) {
      formData.append('text', textData);
    } else {
      setError('データを入力またはアップロードしてください。');
      return;
    }

    try {
      const res = await axios.post('http://localhost:8000/parse', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const data = res.data;
      setApiResponse(data);
      
      // 初期設定の適用
      if (data.numeric_columns && data.numeric_columns.length > 0) {
        // X軸: 最初のカラム (全カラムから)
        const possibleX = data.all_columns ? data.all_columns[0] : '';
        // Y軸: 全ての数値カラム (最初は全部表示)
        const possibleY = data.numeric_columns;
        
        setXAxisColumn(possibleX);
        setYAxisColumns(possibleY);
        
        // 初回グラフ生成（サーバーサイドのdatasetsは使わず、フロント側で統一ロジックを通す）
        updateChartData(data, possibleX, possibleY);
      } else {
        // 数値がない場合などはそのまま
         setVisualizationData(data);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'エラーが発生しました。');
    }
  };

  const handleAxisChange = (type: 'x' | 'y' | 'y-all', value: string) => {
    if (!apiResponse) return;

    if (type === 'x') {
      setXAxisColumn(value);
      updateChartData(apiResponse, value, yAxisColumns);
    } else if (type === 'y-all') {
        // 全選択または全解除
        if (value === 'select-all') {
            const allNumeric = apiResponse.numeric_columns;
            setYAxisColumns(allNumeric);
            updateChartData(apiResponse, xAxisColumn, allNumeric);
        } else {
            setYAxisColumns([]);
            updateChartData(apiResponse, xAxisColumn, []);
        }
    } else {
      // Y軸はトグル
      let newY = [...yAxisColumns];
      if (newY.includes(value)) {
        newY = newY.filter(c => c !== value);
      } else {
        newY.push(value);
      }
      setYAxisColumns(newY);
      updateChartData(apiResponse, xAxisColumn, newY);
    }
  };

  const downloadChart = () => {
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image();
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chart.png';
      a.click();
    }
  };

  return (
    <div className="min-h-screen p-8 font-sans bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">データ可視化デモ</h1>

        <div className="mb-6 p-4 border rounded shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="flex gap-4 mb-4">
            <button
              className={`px-4 py-2 rounded ${inputType === 'file' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black dark:bg-gray-700 dark:text-gray-300'}`}
              onClick={() => setInputType('file')}
            >
              ファイルアップロード (XLSX, JSON, CSV)
            </button>
            <button
              className={`px-4 py-2 rounded ${inputType === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black dark:bg-gray-700 dark:text-gray-300'}`}
              onClick={() => setInputType('text')}
            >
              直接入力 (JSON/CSV)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {inputType === 'file' ? (
              <div className="w-full">
                  <label 
                    className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                      ${file ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-700 dark:border-gray-600'}`}
                  >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {file ? (
                                <>
                                    <svg className="w-10 h-10 mb-3 text-blue-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/>
                                    </svg>
                                    <p className="mb-1 text-lg text-blue-700 dark:text-blue-300 font-bold">{file.name}</p>
                                    <p className="text-sm text-blue-600 dark:text-blue-400">
                                        サイズ: {(file.size / 1024).toFixed(1)} KB - <span className="underline">変更するにはクリック</span>
                                    </p>
                                </>
                            ) : (
                                <>
                                    <svg className="w-10 h-10 mb-3 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                    </svg>
                                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">クリックしてファイルを選択</span></p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">対応形式: .xlsx, .json, .csv</p>
                                </>
                            )}
                        </div>
                        <input 
                            type="file" 
                            className="hidden" 
                            onChange={handleFileChange}
                            accept=".xlsx,.json,.csv"
                        />
                  </label>
              </div>
            ) : (
              <textarea
                onChange={(e) => setTextData(e.target.value)}
                placeholder='[{"category": "A", "value": 10}, {"category": "B", "value": 20}]'
                className="w-full h-32 p-2 border rounded font-mono text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-black dark:text-white"
                value={textData}
              />
            )}

            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors self-start"
            >
              分析して可視化
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}
        </div>


        {apiResponse && apiResponse.all_columns && (
          <div className="mb-6 p-4 border rounded shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
             <h3 className="font-semibold mb-3">グラフ設定</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-sm font-medium mb-1">X軸 (ラベル)</label>
                   <select 
                      value={xAxisColumn} 
                      onChange={(e) => handleAxisChange('x', e.target.value)}
                      className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    >
                      {apiResponse.all_columns.map((col: string) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                   </select>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium">Y軸 (データ系列)</label>
                        <div className="flex gap-2 text-xs">
                            <button 
                                type="button"
                                onClick={() => handleAxisChange('y-all', 'select-all')}
                                className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                                全選択
                            </button>
                            <span className="text-gray-300">|</span>
                            <button 
                                type="button"
                                onClick={() => handleAxisChange('y-all', 'clear-all')}
                                className="text-gray-500 hover:underline dark:text-gray-400"
                            >
                                全解除
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {apiResponse.numeric_columns.map((col: string) => (
                        <button
                          key={col}
                          onClick={() => handleAxisChange('y', col)}
                          className={`px-3 py-1 rounded-full text-sm border 
                            ${yAxisColumns.includes(col) 
                                ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-100' 
                                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'}`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                </div>
             </div>
          </div>
        )}

        {visualizationData && (
          <div className="p-4 border rounded shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">分析結果</h2>
              <button
                onClick={downloadChart}
                className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
              >
                グラフ画像をダウンロード
              </button>
            </div>
            
            <div className="relative h-[400px] w-full bg-white dark:bg-gray-900 p-2 rounded">
              {visualizationData.datasets ? (
                <Bar
                  ref={chartRef}
                  data={visualizationData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                        labels: { 
                          color: '#64748B', // slate-500
                          usePointStyle: true,
                          boxWidth: 8
                        },
                      },
                      title: {
                        display: false, // タイトルを消してシンプルに
                      },
                      tooltip: {
                         backgroundColor: 'rgba(255, 255, 255, 0.9)',
                         titleColor: '#1e293b',
                         bodyColor: '#1e293b',
                         borderColor: '#e2e8f0',
                         borderWidth: 1,
                         padding: 10,
                         cornerRadius: 4,
                      }
                    },
                    scales: {
                      x: { 
                        grid: { display: false }, // X軸のグリッドを消す
                        ticks: { color: '#94a3b8' } // slate-400
                      },
                      y: { 
                        grid: { 
                            color: '#f1f5f9', // slate-100 (非常に薄く)
                        },
                        border: { display: false }, // 軸線を消す
                        ticks: { color: '#94a3b8' } 
                      }
                    },
                    elements: {
                        bar: {
                            borderRadius: 4, // 棒グラフの角を丸く
                        }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  {visualizationData.message || "表示可能なグラフデータがありません"}
                </div>
              )}
            </div>

            <div className="mt-8">
                <h3 className="font-semibold mb-2">生データプレビュー:</h3>
                <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-40 text-xs font-mono text-black dark:text-gray-300">
                    {JSON.stringify(visualizationData.raw_data, null, 2)}
                </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
