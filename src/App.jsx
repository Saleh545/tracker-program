import React, { useState, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';
import './App.css';

// Bugünkü tarixi "YYYY-MM-DD" formatında almaq üçün köməkçi funksiya
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

function App() {
  // Yaddaşdan məlumatları çəkmək
  const [rounds, setRounds] = useState(() => {
    const savedRounds = localStorage.getItem('aviatorData');
    return savedRounds ? JSON.parse(savedRounds) : [];
  });
  
  const [multiplier, setMultiplier] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState(getTodayDate()); // Əlavə ediləcək tarix
  const [filterDate, setFilterDate] = useState(getTodayDate()); // Axtarış/Filtr üçün tarix
  
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // Məlumat dəyişəndə yaddaşa yazır
  useEffect(() => {
    localStorage.setItem('aviatorData', JSON.stringify(rounds));
  }, [rounds]);

  // Şəkildən oxuma
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const result = await Tesseract.recognize(file, 'eng');
      const text = result.data.text;
      
      const multiMatch = text.match(/(\d+[\.,]\d+)/);
      if (multiMatch) {
        setMultiplier(multiMatch[1].replace(',', '.')); 
      }

      const timeMatch = text.match(/\b([01]?[0-9]|2[0-3]):([0-5][0-9])\b/);
      if (timeMatch) {
        setTime(timeMatch[0]);
      } else {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setTime(currentTime);
      }
      
    } catch (error) {
      console.error("Şəkli oxumaq mümkün olmadı:", error);
      alert("Şəkildən məlumatları oxumaq mümkün olmadı. Zəhmət olmasa əl ilə daxil edin.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };

  // Yeni məlumat əlavə etmək
  const addRound = (e) => {
    e.preventDefault();
    if (!multiplier || !time || !date) return;

    const newRound = {
      id: Date.now(),
      multiplier: multiplier,
      time: time,
      date: date // Tarix məlumatı da əlavə olunur
    };

    setRounds([newRound, ...rounds]); 
    setMultiplier('');
    setTime('');
    // Tarix eyni qalır ki, ard-arda eyni gün üçün çoxlu əmsal girəndə rahat olsun
  };

  // Bütün tarixçəni silmək
  const clearHistory = () => {
    if (window.confirm("Bütün tarixçəni silmək istəyirsiniz?")) {
      setRounds([]);
    }
  };

  // Cədvəldə göstəriləcək məlumatları tarixə görə filtrləmək
  const filteredRounds = filterDate 
    ? rounds.filter(round => round.date === filterDate) 
    : rounds;

  return (
    <div className="container">
      <h1>Aviator History Tracker</h1>
      
      {/* Şəkil yükləmə */}
      <div className="upload-group" style={{ marginBottom: '20px', textAlign: 'center' }}>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload} 
          ref={fileInputRef}
          style={{ display: 'none' }} 
          id="file-upload"
        />
        <label htmlFor="file-upload" style={{
          cursor: 'pointer', padding: '10px 20px', backgroundColor: '#4285F4', 
          color: 'white', borderRadius: '5px', display: 'inline-block'
        }}>
          {isProcessing ? "Şəkil Analiz Edilir..." : "📸 Şəkil Yüklə "}
        </label>
      </div>

      {/* Məlumat əlavə etmə forması */}
      <form onSubmit={addRound} className="input-group">
       
        <input 
          type="number" 
          step="0.01" 
          placeholder="Əmsal (məs: 2.50)" 
          value={multiplier}
          onChange={(e) => setMultiplier(e.target.value)}
          required
        />
        <input 
          type="time" 
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />
        <button type="submit" disabled={isProcessing}>Əlavə et</button>
      </form>

      {/* Tarixə görə axtarış paneli */}
      <div className="filter-section" style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
        <label style={{ fontWeight: 'bold' }}>Tarixə görə bax:</label>
        <input 
          type="date" 
          value={filterDate} 
          onChange={(e) => setFilterDate(e.target.value)}
        />
        <button 
          onClick={() => setFilterDate('')} 
          style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer' }}
        >
          Hamısını göstər
        </button>
      </div>

      <button onClick={clearHistory} className="clear-btn">Bütün Tarixçəni Təmizlə</button>

      {/* Cədvəl */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Tarix</th>
              <th>Saat</th>
              <th>Əmsal</th>
            </tr>
          </thead>
          <tbody>
            {filteredRounds.length > 0 ? (
              filteredRounds.map((round) => (
                <tr key={round.id} className={parseFloat(round.multiplier) >= 2 ? 'high' : 'low'}>
                  <td>{round.date}</td>
                  <td>{round.time}</td>
                  <td>{round.multiplier}x</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>
                  Bu tarix üçün məlumat tapılmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;