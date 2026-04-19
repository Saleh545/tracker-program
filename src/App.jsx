import React, { useState, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';
import './App.css';

// Bugünkü tarixi "YYYY-MM-DD" formatında almaq üçün köməkçi funksiya
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
  
  // --- AXTARIŞ STATE-LƏRİ ---
  const [filterDate, setFilterDate] = useState(getTodayDate()); 
  const [searchMultiplier, setSearchMultiplier] = useState('');
  const [searchRound, setSearchRound] = useState(''); // Dövrə axtarışı
  const [searchTime, setSearchTime] = useState('');   // Saat/Saniyə axtarışı
  
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('aviatorData', JSON.stringify(rounds));
  }, [rounds]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const result = await Tesseract.recognize(file, 'eng+aze');
      const text = result.data.text;

      const roundMatch = text.match(/(DÖVRƏ|DOVRE|ROUND)\s*(\d+)/i);
      if (roundMatch) setRoundNumber(roundMatch[2]);

      const multiMatch = text.match(/(\d+[\.,]\d+)/);
      if (multiMatch) setMultiplier(multiMatch[1].replace(',', '.'));

      const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d):([0-5]\d)\b/);
      if (timeMatch) setTime(timeMatch[0]);
      
    } catch (error) {
      alert("Şəkil oxunarkən xəta baş verdi.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };

  const addRound = (e) => {
    e.preventDefault();
    if (!multiplier || !date) return;

    let finalTime = time;
    if (!finalTime) {
      const now = new Date();
      finalTime = now.toTimeString().split(' ')[0];
    }

    const newRound = {
      id: Date.now(),
      roundNumber: roundNumber || '---',
      multiplier: multiplier,
      time: finalTime,
      date: date
    };

    setRounds([newRound, ...rounds]); 
    setMultiplier('');
    setRoundNumber('');
    setTime('');
  };

  const deleteRound = (id) => {
    // Təkli silmədə artıq alert yoxdur (istədiyin kimi), amma ehtiyac olsa bura da əlavə edə bilərik
    setRounds(rounds.filter(round => round.id !== id));
  };

  // --- HAMISINI SİLMƏK ÜÇÜN ALERT ---
  const clearHistory = () => {
    const confirmDelete = window.confirm(
      "Bütün tarixçəni silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz!"
    );
    
    if (confirmDelete) {
      setRounds([]);
    }
  };

  // --- ÇOXFUNKSİYALI FİLTRLƏMƏ MƏNTİQİ ---
  const filteredRounds = rounds.filter(round => {
    const matchesDate = filterDate ? round.date === filterDate : true;
    const matchesMultiplier = searchMultiplier ? round.multiplier.includes(searchMultiplier) : true;
    const matchesRound = searchRound ? round.roundNumber.includes(searchRound) : true;
    const matchesTime = searchTime ? round.time.includes(searchTime) : true;

    return matchesDate && matchesMultiplier && matchesRound && matchesTime;
  });

  return (
    <div className="container">
      <h1>Aviator History Tracker</h1>
      
      <div className="upload-group">
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload} 
          ref={fileInputRef}
          style={{ display: 'none' }} 
          id="file-upload"
        />
        <label htmlFor="file-upload" className="custom-upload-btn">
          {isProcessing ? "⏳ Analiz edilir..." : "📸 Şəkil Yüklə"}
        </label>
      </div>

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
          
          <input 
            type="text" 
            placeholder="Dövrə (ID)" 
            value={roundNumber}
            onChange={(e) => setRoundNumber(e.target.value)}
          />
          <input 
            type="number" 
            step="0.01" 
            placeholder="Əmsal..." 
            value={multiplier}
            onChange={(e) => setMultiplier(e.target.value)}
            required
          />
          
          <button type="submit" className="add-btn" disabled={isProcessing}>
            Əlavə et
          </button>
        </form>
      </div>

      <div className="filter-section card">
        <h3>🔍 Detallı Axtarış</h3>
        <div className="search-grid">
          <div className="field">
            <label>Tarix:</label>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Dövrə (ID):</label>
            <input 
              type="text" 
              placeholder="Dövrəni yaz..." 
              value={searchRound} 
              onChange={(e) => setSearchRound(e.target.value)} 
            />
          </div>
          <div className="field">
            <label>Saat (və ya saniyə):</label>
            <input 
              type="text" 
              placeholder="Məs: :05" 
              value={searchTime} 
              onChange={(e) => setSearchTime(e.target.value)} 
            />
          </div>
          <div className="field">
            <label>Əmsal:</label>
            <input 
              type="text" 
              placeholder="Məs: 10" 
              value={searchMultiplier} 
              onChange={(e) => setSearchMultiplier(e.target.value)} 
            />
          </div>
        </div>
        
        <button 
           onClick={() => {
             setFilterDate(getTodayDate()); 
             setSearchMultiplier('');
             setSearchRound('');
             setSearchTime('');
           }} 
           className="reset-filter-btn"
        >
          Filtrləri Sıfırla
        </button>
      </div>

      <button onClick={clearHistory} className="clear-btn">Hamısını Sil</button>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Tarix</th>
              <th>Dövrə</th>
              <th>Saat</th>
              <th>Əmsal</th>
              <th>Sil</th>
            </tr>
          </thead>
          <tbody>
            {filteredRounds.map((round) => (
              <tr key={round.id} className={parseFloat(round.multiplier) >= 2 ? 'high' : 'low'}>
                <td>{round.date}</td>
                <td>{round.roundNumber}</td>
                <td>{round.time}</td>
                <td>{round.multiplier}x</td>
                <td>
                  <button onClick={() => deleteRound(round.id)} className="delete-item-btn">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;