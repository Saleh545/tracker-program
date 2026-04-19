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

  // Məlumat daxil etmə (Entry) üçün tarix həmişə bugünkü qalır
  const [roundNumber, setRoundNumber] = useState('');
  const [multiplier, setMultiplier] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState(getTodayDate());

  // --- AXTARIŞ (Filter) ---
  // filterDate-i boş qoyuruq ki, proqram açılanda bütün tarixləri göstərsin
  const [filterDate, setFilterDate] = useState(''); 
  const [searchMultiplier, setSearchMultiplier] = useState('');
  const [searchRound, setSearchRound] = useState('');
  const [searchTime, setSearchTime] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('aviatorData', JSON.stringify(rounds));
  }, [rounds]);

  // OCR Analiz (Inputlara doldurma)
  const performOCR = async (source) => {
    setIsProcessing(true);
    try {
      const result = await Tesseract.recognize(source, 'eng+aze');
      const text = result.data.text;

      const roundMatch = text.match(/(DÖVRƏ|DOVRE|ROUND)\s*(\d+)/i);
      if (roundMatch) setRoundNumber(roundMatch[2]);

      const multiMatch = text.match(/(\d+[\.,]\d+)/);
      if (multiMatch) setMultiplier(multiMatch[1].replace(',', '.'));

      const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d):([0-5]\d)\b/);
      if (timeMatch) {
        setTime(timeMatch[0]);
      } else {
        setTime(new Date().toTimeString().split(' ')[0]);
      }
    } catch (error) {
      alert("Xəta baş verdi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) performOCR(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Kamera açılmadı.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    stopCamera();
    performOCR(dataUrl);
  };

  const addRound = (e) => {
    e.preventDefault();
    if (!multiplier || !date) return;
    const finalTime = time || new Date().toTimeString().split(' ')[0];
    const newRound = {
      id: Date.now(),
      roundNumber: roundNumber || '---',
      multiplier: multiplier,
      time: finalTime,
      date: date 
    };
    setRounds([newRound, ...rounds]); 
    setMultiplier(''); setRoundNumber(''); setTime('');
  };

  const deleteRound = (id) => setRounds(rounds.filter(r => r.id !== id));
  
  const clearHistory = () => {
    if (window.confirm("Bütün tarixçəni silmək?")) setRounds([]);
  };

  // --- ÇOXFUNKSİYALI FİLTRLƏMƏ ---
  const filteredRounds = rounds.filter(round => {
    // Əgər filterDate boşdursa, tarix yoxlamasından keçsin (true)
    const matchesDate = filterDate ? round.date === filterDate : true;
    const matchesMultiplier = searchMultiplier ? round.multiplier.includes(searchMultiplier) : true;
    const matchesRound = searchRound ? round.roundNumber.includes(searchRound) : true;
    const matchesTime = searchTime ? round.time.includes(searchTime) : true;

    return matchesDate && matchesMultiplier && matchesRound && matchesTime;
  });

  return (
    <div className="container">
      <h1>Aviator History Tracker</h1>
      
      <div className="top-actions">
        <button className="action-btn upload" onClick={() => fileInputRef.current.click()}>📁 Foto Yüklə</button>
        <button className="action-btn camera" onClick={startCamera}>📷 Kamera Skan</button>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />

      {isCameraOpen && (
        <div className="camera-overlay">
          <div className="camera-box">
            <video ref={videoRef} autoPlay playsInline />
            <div className="camera-btns">
              <button className="snap-btn" onClick={captureImage}>SKAN ET</button>
              <button className="close-btn" onClick={stopCamera}>Bağla</button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {isProcessing && <div className="status-toast">⏳ Analiz...</div>}

      {/* Manual Giriş */}
      <div className="card">
        <h3>Məlumat Əlavə Et</h3>
        <form onSubmit={addRound} className="input-group">
          <div className="form-row">
            <div className="field">
              <label>Tarix:</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="field">
              <label>Saat:</label>
              <input type="time" step="1" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <input type="text" placeholder="Dövrə (ID)" value={roundNumber} onChange={(e) => setRoundNumber(e.target.value)} />
          <input type="number" step="0.01" placeholder="Əmsal..." value={multiplier} onChange={(e) => setMultiplier(e.target.value)} required />
          <button type="submit" className="add-btn">Təsdiqlə və Əlavə Et</button>
        </form>
      </div>

      {/* 🔍 Axtarış Bölməsi (Bütün tarix üçün) */}
      <div className="filter-section card">
        <h3>🔍 Detallı Axtarış</h3>
        <div className="search-grid">
          <div className="field">
            <label>Tarixə görə (Boş = Hamısı):</label>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </div>
          <div className="field"><label>Dövrə:</label><input type="text" value={searchRound} onChange={(e) => setSearchRound(e.target.value)} placeholder="ID..." /></div>
          <div className="field"><label>Saat:</label><input type="text" value={searchTime} onChange={(e) => setSearchTime(e.target.value)} placeholder=":ss" /></div>
          <div className="field"><label>Əmsal:</label><input type="text" value={searchMultiplier} onChange={(e) => setSearchMultiplier(e.target.value)} placeholder="10" /></div>
        </div>
        <button onClick={() => {setFilterDate(''); setSearchMultiplier(''); setSearchRound(''); setSearchTime('');}} className="reset-filter-btn">Filtrləri Sıfırla (Bütün Tarixçə)</button>
      </div>

      <button onClick={clearHistory} className="clear-btn">Hamısını Sil</button>

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Tarix</th><th>Dövrə</th><th>Saat</th><th>Əmsal</th><th>Sil</th></tr>
          </thead>
          <tbody>
            {filteredRounds.map((round) => (
              <tr key={round.id} className={parseFloat(round.multiplier) >= 2 ? 'high' : 'low'}>
                <td>{round.date}</td><td>{round.roundNumber}</td><td>{round.time}</td><td>{round.multiplier}x</td>
                <td><button onClick={() => deleteRound(round.id)} className="delete-item-btn">×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;