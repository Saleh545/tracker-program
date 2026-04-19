import React, { useState, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';
import './App.css';

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

function App() {
  const [rounds, setRounds] = useState(() => {
    const savedRounds = localStorage.getItem('aviatorData');
    return savedRounds ? JSON.parse(savedRounds) : [];
  });

  const [roundNumber, setRoundNumber] = useState('');
  const [multiplier, setMultiplier] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState(getTodayDate());

  // Axtarış və Analiz vəziyyətləri
  const [filterDate, setFilterDate] = useState(getTodayDate());
  const [searchMultiplier, setSearchMultiplier] = useState('');
  const [searchRound, setSearchRound] = useState('');
  const [searchTime, setSearchTime] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState({ current: 0, total: 0 });

  // Kamera üçün Ref-lər və State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('aviatorData', JSON.stringify(rounds));
  }, [rounds]);

  // --- KAMERANI BAŞLAT ---
  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } // Arxa kameranı açır
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Kameraya giriş icazəsi verilmədi.");
      setIsCameraOpen(false);
    }
  };

  // --- KAMERANI BAĞLA ---
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  // --- ŞƏKİL ÇƏK VƏ SKAN ET ---
  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/png');
    stopCamera(); // Şəkli çəkdikdən sonra kameranı bağlayırıq
    await processImage(imageData);
  };

  // --- FOTO ANALİZ MƏNTİQİ ---
  const processImage = async (imageSource) => {
    setIsProcessing(true);
    try {
      const result = await Tesseract.recognize(imageSource, 'eng+aze');
      const text = result.data.text;

      const roundMatch = text.match(/(DÖVRƏ|DOVRE|ROUND)\s*(\d+)/i);
      const multiMatch = text.match(/(\d+[\.,]\d+)/);
      const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d):([0-5]\d)\b/);

      if (multiMatch) {
        const newRound = {
          id: Date.now(),
          roundNumber: roundMatch ? roundMatch[2] : '---',
          multiplier: multiMatch[1].replace(',', '.'),
          time: timeMatch ? timeMatch[0] : new Date().toTimeString().split(' ')[0],
          date: date
        };
        setRounds(prev => [newRound, ...prev]);
      } else {
        alert("Əmsal tapılmadı, zəhmət olmasa yaxından çəkin.");
      }
    } catch (error) {
      alert("Analiz zamanı xəta oldu.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Çoxlu şəkil yükləmə (köhnə funksiya)
  const handleBulkUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus({ current: 0, total: files.length });

    for (let i = 0; i < files.length; i++) {
      setProcessingStatus(prev => ({ ...prev, current: i + 1 }));
      await processImage(files[i]);
    }
    setIsProcessing(false);
    setProcessingStatus({ current: 0, total: 0 });
  };

  const addRound = (e) => {
    e.preventDefault();
    if (!multiplier || !date) return;
    const finalTime = time || new Date().toTimeString().split(' ')[0];
    const newRound = { id: Date.now(), roundNumber: roundNumber || '---', multiplier, time: finalTime, date };
    setRounds([newRound, ...rounds]);
    setMultiplier(''); setRoundNumber(''); setTime('');
  };

  const deleteRound = (id) => setRounds(rounds.filter(r => r.id !== id));
  const clearHistory = () => { if (window.confirm("Hamısını silmək?")) setRounds([]); };

  const filteredRounds = rounds.filter(r => {
    return (filterDate ? r.date === filterDate : true) &&
           (searchMultiplier ? r.multiplier.includes(searchMultiplier) : true) &&
           (searchRound ? r.roundNumber.includes(searchRound) : true) &&
           (searchTime ? r.time.includes(searchTime) : true);
  });

  return (
    <div className="container">
      <h1>Aviator Tracker PRO</h1>
      
      {/* İdarəetmə Düymələri */}
      <div className="action-buttons">
        <button onClick={() => fileInputRef.current.click()} className="icon-btn blue">
          📁 Foto Yüklə
        </button>
        <button onClick={startCamera} className="icon-btn green">
          📷 Kamera ilə Skan
        </button>
      </div>

      <input type="file" multiple onChange={handleBulkUpload} ref={fileInputRef} style={{ display: 'none' }} />

      {/* Canlı Kamera Modalı */}
      {isCameraOpen && (
        <div className="camera-modal">
          <div className="camera-content">
            <video ref={videoRef} autoPlay playsInline />
            <div className="camera-controls">
              <button onClick={captureAndScan} className="scan-btn">SKAN ET</button>
              <button onClick={stopCamera} className="close-btn">X</button>
            </div>
          </div>
        </div>
      )}

      {/* Gizli canvas (şəkil çəkmək üçün) */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {isProcessing && (
        <div className="loading-bar">
          {processingStatus.total > 0 ? `Analiz: ${processingStatus.current}/${processingStatus.total}` : "Analiz edilir..."}
        </div>
      )}

      {/* Manuel Giriş */}
      <div className="card">
        <form onSubmit={addRound} className="input-group">
          <div className="form-row">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input type="number" step="0.01" placeholder="Əmsal" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} required />
          </div>
          <button type="submit" className="add-btn">Manual Əlavə Et</button>
        </form>
      </div>

      {/* Axtarış */}
      <div className="card filter-section">
        <div className="search-grid">
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          <input type="text" placeholder="Dövrə ID" value={searchRound} onChange={(e) => setSearchRound(e.target.value)} />
          <input type="text" placeholder="Saat/San" value={searchTime} onChange={(e) => setSearchTime(e.target.value)} />
          <input type="text" placeholder="Əmsal" value={searchMultiplier} onChange={(e) => setSearchMultiplier(e.target.value)} />
        </div>
        <button onClick={() => {setFilterDate(getTodayDate()); setSearchMultiplier(''); setSearchRound(''); setSearchTime('');}} className="reset-btn">Sıfırla</button>
      </div>

      <button onClick={clearHistory} className="clear-btn">Bütün Bazanı Sil</button>

      {/* Cədvəl */}
      <div className="table-container">
        <table>
          <thead>
            <tr><th>Tarix</th><th>Dövrə</th><th>Saat</th><th>Əmsal</th><th>X</th></tr>
          </thead>
          <tbody>
            {filteredRounds.map((r) => (
              <tr key={r.id} className={parseFloat(r.multiplier) >= 2 ? 'high' : 'low'}>
                <td>{r.date}</td><td>{r.roundNumber}</td><td>{r.time}</td><td>{r.multiplier}x</td>
                <td><button onClick={() => deleteRound(r.id)} className="del-x">×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;