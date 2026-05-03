import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Home,
  History as HistoryIcon,
  User,
  BookOpen,
  Play,
  Square,
  Timer,
  Plus,
  RefreshCw,
  Activity,
  ChevronRight,
  TrendingUp,
  BarChart2,
  Calendar,
  Dumbbell
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  doc,
  setDoc
} from 'firebase/firestore';

// --- Constants & Config ---
const APP_ID = 'fitness-recomp-app';
const THEME = {
  bg: 'bg-[#0A0A0A]',
  card: 'bg-black/40 backdrop-blur-md',
  text: 'text-white',
  muted: 'text-neutral-500',
  accent: 'text-lime-400',
  accentBg: 'bg-lime-400/10',
  border: 'border-white/10'
};

export const defaultWorkoutPlans = [
  {
    id: 'A',
    name: 'A',
    description: '下肢推 / 水平推拉',
    exercises: [
      { name: '高腳杯深蹲 (Goblet Squat)', targetReps: 8, increment: 2.5 },
      { name: '胸推 (Bench Press)', targetReps: 8, increment: 1.25 },
      { name: '坐姿划船 (Seated Row)', targetReps: 10, increment: 1.25 },
      { name: '農夫走路 (Farmer\'s Walk)', targetReps: 1, increment: 2.5 }
    ]
  },
  {
    id: 'B',
    name: 'B',
    description: '下肢鉸鏈 / 垂直推拉',
    exercises: [
      { name: '硬舉 (Deadlift)', targetReps: 5, increment: 2.5 },
      { name: '滑輪下拉 (Lat Pulldown)', targetReps: 10, increment: 1.25 },
      { name: '肩推 (Overhead Press)', targetReps: 8, increment: 1.25 },
      { name: '腿後彎舉 (Hamstring Curl)', targetReps: 10, increment: 1.25 }
    ]
  }
];

const getTargetReps = (name: string) => {
  for (const plan of defaultWorkoutPlans) {
    const ex = plan.exercises.find(e => e.name === name);
    if (ex) return ex.targetReps;
  }
  return 8;
};

const getIncrement = (name: string) => {
  for (const plan of defaultWorkoutPlans) {
    const ex = plan.exercises.find(e => e.name === name);
    if (ex) return ex.increment;
  }
  return 1.25;
};

// --- Types ---
type SetRecord = { weight: number; reps: number; completed: boolean };
type ExerciseRecord = { name: string; sets: SetRecord[] };
type WorkoutSession = { id: string; date: string; plan: 'A' | 'B'; exercises: ExerciseRecord[] };
type BodyStat = { id: string; date: string; weight: number; bodyFat: number; muscleMass: number };

// --- Firebase Init ---
const firebaseConfig = {
  apiKey: "AIzaSyAtua4UFIVQH_f_LVq7x3vfl9p0DEBGcww",
  authDomain: "workout-1b726.firebaseapp.com",
  projectId: "workout-1b726",
  storageBucket: "workout-1b726.firebasestorage.app",
  messagingSenderId: "562105081646",
  appId: "1:562105081646:web:1f0de2c2df7f4acbbfe4bf"
};
const hasFirebaseConfig = true;
let app: any, auth: any, db: any;
if (hasFirebaseConfig) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.warn("Firebase init failed, falling back to LocalStorage", e);
  }
}

// --- Custom Hooks ---
function useDataStore() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [bodyStats, setBodyStats] = useState<BodyStat[]>([]);
  const [userId, setUserId] = useState<string | null>('local-user');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (hasFirebaseConfig && db && auth) {
        try {
          const userCred = await signInAnonymously(auth);
          const uid = userCred.user.uid;
          if (isMounted) setUserId(uid);

          // Workouts
          const workoutsRef = collection(db, 'artifacts', APP_ID, 'users', uid, 'workouts');
          const wQuery = query(workoutsRef, orderBy('date', 'desc'));
          const wSnap = await getDocs(wQuery);
          const wData = wSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkoutSession));
          if (isMounted) setWorkouts(wData);

          // Body Stats
          const bodyRef = collection(db, 'artifacts', APP_ID, 'users', uid, 'body');
          const bQuery = query(bodyRef, orderBy('date', 'asc'));
          const bSnap = await getDocs(bQuery);
          const bData = bSnap.docs.map(d => ({ id: d.id, ...d.data() } as BodyStat));
          if (isMounted) setBodyStats(bData);
        } catch (error) {
          console.error("Error loading from Firebase:", error);
        }
      } else {
        // LocalStorage Fallback
        const locWorkouts = JSON.parse(localStorage.getItem(`${APP_ID}_workouts`) || '[]');
        const locBody = JSON.parse(localStorage.getItem(`${APP_ID}_body`) || '[]');
        if (isMounted) {
          setWorkouts(locWorkouts.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          setBodyStats(locBody.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        }
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  const saveWorkout = async (data: Omit<WorkoutSession, 'id'>) => {
    const newDoc = { ...data, id: Date.now().toString() };
    if (hasFirebaseConfig && db && userId) {
      const ref = doc(collection(db, 'artifacts', APP_ID, 'users', userId, 'workouts'));
      await setDoc(ref, newDoc);
    } else {
      const updated = [newDoc, ...workouts];
      setWorkouts(updated);
      localStorage.setItem(`${APP_ID}_workouts`, JSON.stringify(updated));
    }
  };

  const saveBodyStat = async (data: Omit<BodyStat, 'id'>) => {
    const newDoc = { ...data, id: Date.now().toString() };
    if (hasFirebaseConfig && db && userId) {
      const ref = doc(collection(db, 'artifacts', APP_ID, 'users', userId, 'body'));
      await setDoc(ref, newDoc);
    } else {
      const updated = [...bodyStats, newDoc];
      setBodyStats(updated);
      localStorage.setItem(`${APP_ID}_body`, JSON.stringify(updated));
    }
  };

  return { workouts, bodyStats, saveWorkout, saveBodyStat };
}


// --- Main App ---
export default function App() {
  const [activeTab, setActiveTab] = useState<'workout' | 'history' | 'body' | 'reference' | 'timer'>('workout');
  const { workouts, bodyStats, saveWorkout, saveBodyStat } = useDataStore();

  const [timeLeft, setTimeLeft] = useState(0);
  const [initialTime, setInitialTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const startTimer = async (seconds: number) => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    setInitialTime(seconds);
    setTimeLeft(seconds);
    setIsTimerRunning(true);
  };

  const stopTimer = () => {
    setTimeLeft(0);
    setIsTimerRunning(false);
    setActiveTab('workout');
  };

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isTimerRunning && timeLeft === 0) {
      setIsTimerRunning(false);
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 500]);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('TITANSYNC', { body: '休息時間結束，準備下一組！' });
      }
      setActiveTab('workout');
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, setActiveTab]);

  const getSuggestedWeight = (exerciseName: string) => {
    for (let i = 0; i < workouts.length; i++) {
        const ex = workouts[i].exercises.find(e => e.name === exerciseName);
        if (ex) {
            const allTargetsMet = ex.sets.every(s => s.reps >= getTargetReps(exerciseName));
            const maxLastWeight = Math.max(...ex.sets.map(s => s.weight));
            if (allTargetsMet) {
                return maxLastWeight + getIncrement(exerciseName);
            }
            return maxLastWeight;
        }
    }
    return 20;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'workout': return <WorkoutTab workouts={workouts} onSave={saveWorkout} getSuggestedWeight={getSuggestedWeight} setActiveTab={setActiveTab} />;
      case 'history': return <HistoryTab workouts={workouts} />;
      case 'body': return <BodyTab bodyStats={bodyStats} onSave={saveBodyStat} />;
      case 'reference': return <ReferenceTab />;
      case 'timer': return <TimerTab timeLeft={timeLeft} initialTime={initialTime} isTimerRunning={isTimerRunning} startTimer={startTimer} stopTimer={stopTimer} />;
    }
  };

  return (
    <div className={`min-h-screen ${THEME.bg} ${THEME.text} font-sans pb-24 relative`}>
      {/* Background with glow gradients and illustrations */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-lime-400/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[10%] right-[-10%] w-[400px] h-[400px] bg-lime-500/10 blur-[100px] rounded-full mix-blend-screen" />
        
        <div className="absolute top-[20%] right-[-10%] opacity-[0.04] transform rotate-12">
          <Dumbbell size={400} strokeWidth={0.5} />
        </div>
        <div className="absolute bottom-[20%] left-[-20%] opacity-[0.03] transform -rotate-12">
          <Activity size={500} strokeWidth={0.5} />
        </div>
        <div className="absolute top-[60%] right-[20%] opacity-[0.02] transform rotate-45">
          <span className="text-[200px] font-black italic tracking-tighter">TITAN</span>
        </div>
      </div>

      <header className={`h-20 flex items-center px-5 sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-md border-b ${THEME.border}`}>
        <div className="w-full max-w-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tighter italic shadow-sm drop-shadow-md">RecompX</h1>
            <p className="text-[10px] uppercase tracking-widest text-[#a3a3a3] font-bold">Progress & Adapt</p>
          </div>
          <div className="text-right">
            {!hasFirebaseConfig ? (
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/20">Local Mode</span>
            ) : (
              <p className="text-[10px] uppercase tracking-widest text-lime-400 font-bold">Goal: Body Recomp</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 z-10 relative">
        {renderTabContent()}
      </main>

      <nav className={`fixed bottom-0 w-full bg-[#0A0A0A]/80 backdrop-blur-xl border-t ${THEME.border} pb-safe h-20 z-50`}>
        <div className="max-w-xl mx-auto grid grid-cols-5 h-full">
          {[
            { id: 'workout', icon: Activity, label: '訓練' },
            { id: 'history', icon: HistoryIcon, label: '紀錄' },
            { id: 'timer', icon: Timer, label: '計時' },
            { id: 'body', icon: CustomBodyIcon, label: '體態' },
            { id: 'reference', icon: BookOpen, label: '圖解' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center transition-colors group ${
                activeTab === tab.id ? 'text-lime-400' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <div className="relative">
                <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                {tab.id === 'timer' && isTimerRunning && (
                  <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-lime-500"></span>
                  </span>
                )}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-90">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// Icon wrapper for Body since lucide doesn't have a specific Body scale
const CustomBodyIcon = ({ size, strokeWidth }: any) => <User size={size} strokeWidth={strokeWidth} />;

// --- Timer Tab ---
function TimerTab({ timeLeft, initialTime, isTimerRunning, startTimer, stopTimer }: any) {
  const [customTime, setCustomTime] = useState('');
  const radius = 100;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = isTimerRunning && initialTime > 0 ? circumference - (timeLeft / initialTime) * circumference : 0;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-12rem)] animate-in fade-in py-4 w-full">
      <div className="relative w-64 h-64 flex items-center justify-center shrink-0 mb-8">
        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full -rotate-90 transform">
          <circle
            stroke="rgba(255,255,255,0.05)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={100}
            cy={100}
          />
          <circle
            stroke="#A3E635"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s linear' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={100}
            cy={100}
          />
        </svg>
        <div className="text-center z-10 flex flex-col items-center justify-center">
          <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Rest Timer</div>
          <div className="text-6xl font-black tabular-nums tracking-tighter text-white">
            {mins}:{secs.toString().padStart(2, '0')}
          </div>
          {isTimerRunning && <div className="text-[10px] text-lime-400 font-bold mt-2 uppercase">Active</div>}
        </div>
      </div>

      {!isTimerRunning ? (
        <div className="w-full space-y-4 max-w-xs">
          <div className="grid grid-cols-3 gap-3">
             <button onClick={() => startTimer(60)} className={`py-4 rounded-3xl ${THEME.card} border ${THEME.border} font-black text-white hover:border-lime-400/50 transition`}>60s</button>
             <button onClick={() => startTimer(90)} className={`py-4 rounded-3xl ${THEME.card} border ${THEME.border} font-black text-white hover:border-lime-400/50 transition`}>90s</button>
             <button onClick={() => startTimer(120)} className={`py-4 rounded-3xl ${THEME.card} border ${THEME.border} font-black text-white hover:border-lime-400/50 transition`}>120s</button>
          </div>
          <div className="flex gap-3">
             <input type="number" placeholder="SEC" value={customTime} onChange={e => setCustomTime(e.target.value)} className={`flex-1 min-w-0 ${THEME.card} border ${THEME.border} p-4 rounded-3xl text-white text-center font-black focus:border-lime-400 outline-none transition`} />
             <button onClick={() => {
                const val = parseInt(customTime);
                if (val > 0) startTimer(val);
             }} className={`shrink-0 px-8 rounded-3xl bg-lime-400 text-black font-black uppercase tracking-widest hover:bg-lime-300 transition shadow-[0_0_20px_rgba(163,230,53,0.2)]`}>START</button>
          </div>
        </div>
      ) : (
        <button onClick={stopTimer} className={`w-full max-w-xs py-5 rounded-3xl bg-white/10 text-white font-black uppercase tracking-widest backdrop-blur-md border border-white/20 hover:bg-white/20 transition`}>
          馬上結束
        </button>
      )}
    </div>
  );
}


// --- Workout Tab ---
function WorkoutTab({ workouts, onSave, getSuggestedWeight, setActiveTab }: any) {
  const [activePlan, setActivePlan] = useState<'A' | 'B' | string | null>(null);
  const [sessionData, setSessionData] = useState<ExerciseRecord[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!activePlan && workouts.length > 0 && defaultWorkoutPlans.length > 0) {
      const lastPlanId = workouts[0].plan;
      const lastIndex = defaultWorkoutPlans.findIndex(p => p.id === lastPlanId);
      const nextIndex = (lastIndex + 1) % defaultWorkoutPlans.length;
      setActivePlan(defaultWorkoutPlans[nextIndex].id);
    } else if (!activePlan && defaultWorkoutPlans.length > 0) {
      setActivePlan(defaultWorkoutPlans[0].id);
    }
  }, [workouts, activePlan]);

  const startWorkout = (planId: string) => {
    setActivePlan(planId);
    const plan = defaultWorkoutPlans.find(p => p.id === planId);
    if (!plan) return;

    const exercises = plan.exercises.map(exDef => {
      const suggestW = getSuggestedWeight(exDef.name);
      return {
        name: exDef.name,
        sets: [
          { weight: suggestW, reps: exDef.targetReps, completed: false },
          { weight: suggestW, reps: exDef.targetReps, completed: false },
          { weight: suggestW, reps: exDef.targetReps, completed: false }
        ]
      };
    });
    setSessionData(exercises);
  };

  const updateSet = (exIndex: number, setIndex: number, field: keyof SetRecord, value: any) => {
    const newData = [...sessionData];
    newData[exIndex].sets[setIndex] = { ...newData[exIndex].sets[setIndex], [field]: value };
    setSessionData(newData);
  };

  const addSet = (exIndex: number) => {
    const newData = [...sessionData];
    const lastSet = newData[exIndex].sets[newData[exIndex].sets.length - 1];
    newData[exIndex].sets.push({ ...lastSet, completed: false });
    setSessionData(newData);
  };

  const finishWorkout = () => {
    const today = new Date().toISOString().split('T')[0];
    onSave({ date: today, plan: activePlan, exercises: sessionData });
    setActivePlan(null);
    setSessionData([]);
    setShowConfirm(false);
  };

  if (sessionData.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
        <div className={`p-6 rounded-3xl ${THEME.card} border ${THEME.border} shadow-xl relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/10 blur-3xl rounded-full" />
          <h2 className="text-2xl font-black tracking-tighter mb-2 italic uppercase">準備好今天的訓練了嗎？</h2>
          <p className="text-neutral-400 text-xs mb-6 font-bold uppercase tracking-widest">漸進式負荷系統會自動調整建議重量。</p>
          
          <div className="flex flex-col gap-4">
            {defaultWorkoutPlans.map(p => (
              <button
                key={p.id}
                onClick={() => startWorkout(p.id)}
                className={`p-4 rounded-3xl border text-left transition ${
                  activePlan === p.id 
                    ? 'border-lime-400 bg-white/10 backdrop-blur-md' 
                    : `border-white/5 bg-white/5 backdrop-blur-md hover:${THEME.border}`
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xl font-bold uppercase tracking-tight ${activePlan === p.id ? 'text-lime-400' : 'text-white'}`}>
                    課表 {p.name}
                  </span>
                  {activePlan === p.id && <span className="flex h-2 w-2 rounded-full bg-lime-400"></span>}
                </div>
                <div className="text-[10px] text-neutral-500 font-black tracking-widest uppercase mb-3">
                  {p.description}
                </div>
                <ul className="text-xs text-neutral-400 space-y-1 font-bold">
                  {p.exercises.map(ex => (
                     <li key={ex.name} className="truncate">• {ex.name.split(' (')[0]}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </div>

        <div className={`p-4 rounded-3xl border ${THEME.border} ${THEME.card}`}>
          <div className="flex gap-3">
            <BookOpen className="text-lime-400 shrink-0" size={20} />
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-lime-400 mb-1">給教練的備註</h4>
              <p className="text-xs text-neutral-400 font-bold leading-relaxed">
                目前狀態：恢復訓練初期。<br/>
                建議：起步重量保守為主，若連續兩次無法達成目標次數，系統不會增加重量。
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300 mt-4">
      <div className="flex justify-between items-end mb-4">
        <div>
          <span className="text-[10px] font-black tracking-widest text-lime-400 uppercase">Current Session</span>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">課表 {activePlan}</h2>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button onClick={() => setSessionData([])} className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 hover:text-white transition">放棄</button>
          <button onClick={() => setActiveTab('timer')} className="flex items-center gap-1 text-[10px] font-black tracking-widest text-lime-400 bg-lime-400/10 px-3 py-1.5 rounded-full border border-lime-400/20 shadow-[0_0_10px_rgba(163,230,53,0.1)]">
             <Timer size={12} strokeWidth={3} /> 去休息
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {sessionData.map((ex, exIndex) => (
          <div key={ex.name} className={`p-4 rounded-3xl ${THEME.card} border ${THEME.border}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xl font-bold uppercase tracking-tight">{ex.name.split(' (')[0]}</span>
              <span className="px-2 py-1 bg-lime-400/20 text-lime-400 text-[10px] border border-lime-400/30 font-black rounded uppercase">
                目標: {getTargetReps(ex.name)} 下 
              </span>
            </div>
            
            <div className="mt-4 space-y-2">
              {ex.sets.map((set, setIndex) => (
                <div key={setIndex} className={`flex items-center gap-2 p-2 rounded-2xl transition-colors ${set.completed ? 'bg-lime-400/10 border border-lime-400/30' : 'bg-black/30 border border-white/5'}`}>
                  <div className="w-8 text-center text-[10px] font-black text-neutral-500 uppercase">S{setIndex + 1}</div>
                  <input 
                    type="number" 
                    value={set.weight}
                    onChange={e => updateSet(exIndex, setIndex, 'weight', Number(e.target.value))}
                    className="w-16 bg-transparent font-black tracking-tighter text-lg text-center focus:text-lime-400 outline-none"
                  />
                  <span className="text-[10px] uppercase font-bold text-neutral-500">kg</span>
                  <input 
                    type="number" 
                    value={set.reps}
                    onChange={e => updateSet(exIndex, setIndex, 'reps', Number(e.target.value))}
                    className="w-14 bg-transparent font-black tracking-tighter text-lg text-center focus:text-lime-400 outline-none ml-2"
                  />
                  <span className="text-[10px] uppercase font-bold text-neutral-500">reps</span>
                  
                  <div className="flex-1" />
                  
                  <button 
                    onClick={() => updateSet(exIndex, setIndex, 'completed', !set.completed)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition ${
                      set.completed ? 'bg-lime-400 text-black shadow-[0_0_15px_rgba(163,230,53,0.3)]' : 'bg-white/5 border border-white/10 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <RefreshCw size={14} className={set.completed ? 'opacity-0' : 'opacity-100'} style={{position: 'absolute'}} strokeWidth={3} />
                    {set.completed && <div className="font-black">✓</div>}
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <button onClick={() => addSet(exIndex)} className="w-full py-2 text-[10px] uppercase font-black tracking-widest text-neutral-500 hover:text-white hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition flex items-center justify-center gap-1">
                <Plus size={14} strokeWidth={3} /> 新增一組
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 pb-8">
        {!showConfirm ? (
           <button 
             onClick={() => setShowConfirm(true)}
             className="w-full bg-lime-400 text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-lime-300 transition text-sm shadow-[0_0_20px_rgba(163,230,53,0.2)]"
           >
             完成訓練
           </button>
        ) : (
           <div className="flex gap-3 animate-in slide-in-from-bottom-2">
             <button onClick={() => setShowConfirm(false)} className={`flex-1 py-4 ${THEME.card} border ${THEME.border} rounded-2xl font-bold uppercase tracking-widest text-xs text-white`}>取消</button>
             <button onClick={finishWorkout} className="flex-1 py-4 bg-lime-400 text-black font-black rounded-2xl uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(163,230,53,0.2)]">確認儲存</button>
           </div>
        )}
      </div>
    </div>
  );
}

// --- History Tab ---
function HistoryTab({ workouts }: { workouts: WorkoutSession[] }) {
  const [view, setView] = useState<'list'|'chart'>('list');
  const [chartEx, setChartEx] = useState(defaultWorkoutPlans[0]?.exercises[0]?.name || '');

  const chartData = useMemo(() => {
    if (!chartEx) return [];
    return workouts
      .filter(w => w.exercises.some(e => e.name === chartEx))
      .map(w => {
         const ex = w.exercises.find(e => e.name === chartEx);
         const maxWeight = Math.max(...(ex?.sets.map(succ => succ.weight) || [0]));
         return { date: w.date.substring(5), weight: maxWeight, fullDate: w.date };
      })
      .sort((a,b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  }, [workouts, chartEx]);


  if (workouts.length === 0) return (
    <div className="flex flex-col items-center justify-center text-neutral-500 h-64 gap-3">
      <HistoryIcon size={32} strokeWidth={2} />
      <p className="text-xs font-bold uppercase tracking-widest">尚無訓練紀錄</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in mt-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">訓練軌跡</h2>
          <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">History & Progress</p>
        </div>
        <div className={`flex ${THEME.card} p-1 border ${THEME.border} rounded-xl`}>
          <button onClick={() => setView('list')} className={`px-4 py-1.5 text-[10px] uppercase tracking-widest rounded-lg font-bold transition ${view === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}>紀錄</button>
          <button onClick={() => setView('chart')} className={`px-4 py-1.5 text-[10px] uppercase tracking-widest rounded-lg font-bold transition ${view === 'chart' ? 'bg-white/10 text-lime-400 shadow-sm' : 'text-neutral-500 hover:text-white'}`}>趨勢</button>
        </div>
      </div>

      {view === 'chart' && (
         <div className={`p-6 rounded-3xl ${THEME.card} border ${THEME.border} flex flex-col animate-in fade-in`}>
           <div className="mb-6">
             <select 
               value={chartEx} 
               onChange={e => setChartEx(e.target.value)}
               className={`w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 text-sm font-bold uppercase tracking-widest text-white focus:outline-none focus:border-lime-400`}
             >
               {defaultWorkoutPlans.map(plan => (
                 <optgroup key={plan.id} label={`課表 ${plan.name} (${plan.description})`}>
                   {plan.exercises.map(e => <option key={e.name} value={e.name}>{e.name.split(' (')[0]}</option>)}
                 </optgroup>
               ))}
             </select>
           </div>
           
           {chartData.length > 1 ? (
             <div className="h-48 w-full relative">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                   <XAxis dataKey="date" stroke="#737373" fontSize={10} tickLine={false} axisLine={false} />
                   <YAxis dataKey="weight" stroke="#737373" fontSize={10} tickLine={false} axisLine={false} />
                   <Tooltip 
                     contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                     itemStyle={{ color: '#a3e635', fontWeight: '900' }}
                     labelStyle={{ color: '#a3a3a3', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                     formatter={(value) => [`${value} kg`, 'Max Weight']}
                   />
                   <Line type="monotone" dataKey="weight" stroke="#a3e635" strokeWidth={4} dot={{ r: 5, strokeWidth: 2, fill: '#171717' }} activeDot={{ r: 7, fill: '#a3e635' }} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
           ) : (
             <div className="h-48 flex items-center justify-center text-[10px] uppercase font-bold tracking-widest text-neutral-500">
               該動作資料不足以繪製趨勢圖 (需要 &gt; 1 筆)
             </div>
           )}
         </div>
      )}

      {view === 'list' && <div className="flex flex-col gap-3">{workouts.map((w, i) => (
        <div key={i} className={`p-4 rounded-3xl ${THEME.card} border ${THEME.border} relative`}>
          <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-black/30 border border-white/5">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-none">PLAN</span>
                <span className={`text-xl font-black leading-none mt-1 ${defaultWorkoutPlans.find(plan => plan.id === w.plan) ? 'text-lime-400' : 'text-neutral-400'}`}>{w.plan}</span>
              </div>
              <div>
                <div className="font-bold text-lg">{new Date(w.date).toLocaleDateString('zh-TW', { month:'short', day:'numeric'})}</div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 flex items-center gap-1 mt-0.5"><Calendar size={12} strokeWidth={2.5}/> {w.exercises.length} Items</div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            {w.exercises.map((ex, j) => {
              const maxW = Math.max(...ex.sets.map(s => s.weight));
              const totalSets = ex.sets.length;
              return (
                <div key={j} className="flex justify-between items-center bg-black/20 p-2 rounded-xl border border-white/5 hover:border-white/10 transition">
                  <span className="text-sm font-bold uppercase tracking-tight text-white">{ex.name.split(' (')[0]}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-500 font-bold text-[10px] uppercase tracking-widest">{totalSets} Sets</span>
                    <span className="text-lime-400 font-black text-sm">{maxW} <span className="text-[10px] text-lime-400/50">KG</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}</div>}
    </div>
  );
}

// --- Body Tab ---
function BodyTab({ bodyStats, onSave }: any) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ weight: '', bodyFat: '', muscleMass: '' });

  const handleSubmit = (e: any) => {
    e.preventDefault();
    onSave({
      date: new Date().toISOString().split('T')[0],
      weight: Number(formData.weight),
      bodyFat: Number(formData.bodyFat),
      muscleMass: Number(formData.muscleMass)
    });
    setShowForm(false);
    setFormData({ weight: '', bodyFat: '', muscleMass: '' });
  };

  const chartData = bodyStats.map((s:any) => ({
    ...s,
    dateLabel: s.date.substring(5)
  }));

  return (
    <div className="space-y-6 animate-in fade-in mt-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">體態紀錄</h2>
          <p className="text-[10px] uppercase tracking-widest font-bold text-lime-400">目前目標：身體重組成</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="p-3 bg-lime-400 text-black rounded-xl hover:bg-lime-300 transition shadow-[0_0_15px_rgba(163,230,53,0.3)]"
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className={`p-6 rounded-3xl ${THEME.card} border ${THEME.border} mb-6 animate-in slide-in-from-top-2`}>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 block mb-2">體重 (kg)</label>
              <input required type="number" step="0.1" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className={`w-full bg-black/40 backdrop-blur-md border ${THEME.border} rounded-xl p-3 text-lg font-black text-white focus:outline-none focus:border-lime-400 transition`} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 block mb-2">體脂率 (%)</label>
              <input required type="number" step="0.1" value={formData.bodyFat} onChange={e => setFormData({...formData, bodyFat: e.target.value})} className={`w-full bg-black/40 backdrop-blur-md border ${THEME.border} rounded-xl p-3 text-lg font-black text-white focus:outline-none focus:border-lime-400 transition`} />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 block mb-2">骨骼肌重 (kg)</label>
              <input required type="number" step="0.1" value={formData.muscleMass} onChange={e => setFormData({...formData, muscleMass: e.target.value})} className={`w-full bg-black/40 backdrop-blur-md border ${THEME.border} rounded-xl p-3 text-lg font-black text-white focus:outline-none focus:border-lime-400 transition`} />
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-lime-400 text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(163,230,53,0.2)]">儲存數據</button>
        </form>
      )}

      {bodyStats.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: '體重', value: bodyStats[bodyStats.length-1].weight, unit: 'kg', color: 'text-white' },
              { label: '體脂率', value: bodyStats[bodyStats.length-1].bodyFat, unit: '%', color: 'text-rose-400' },
              { label: '骨骼肌', value: bodyStats[bodyStats.length-1].muscleMass, unit: 'kg', color: 'text-lime-400' }
            ].map((stat, i) => (
              <div key={stat.label} className={`p-4 rounded-3xl ${THEME.card} border ${i === 2 ? 'border-lime-400 ring-1 ring-lime-400/20' : THEME.border} flex flex-col items-center justify-center text-center`}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">{stat.label}</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`text-2xl font-black tracking-tighter ${stat.color}`}>{stat.value}</span>
                  <span className="text-[10px] text-neutral-500 font-bold uppercase">{stat.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={`p-6 rounded-3xl ${THEME.card} border ${THEME.border}`}>
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2"><TrendingUp size={16} className="text-lime-400" strokeWidth={3}/> 變化趨勢</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="dateLabel" stroke="#737373" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" />
                  <YAxis yAxisId="left" stroke="#737373" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} fontWeight="bold" />
                  <YAxis yAxisId="right" orientation="right" stroke="#737373" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} fontWeight="bold" />
                  <Tooltip 
                     contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                     labelStyle={{ color: '#a3a3a3', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em' }}
                     itemStyle={{ fontWeight: 'black', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '10px' }} iconType="circle" />
                  <Line yAxisId="left" type="monotone" name="體重(kg)" dataKey="weight" stroke="#ffffff" strokeWidth={3} dot={false} />
                  <Line yAxisId="right" type="monotone" name="體脂(%)" dataKey="bodyFat" stroke="#fb7185" strokeWidth={3} dot={false} />
                  <Line yAxisId="left" type="monotone" name="骨骼肌(kg)" dataKey="muscleMass" stroke="#a3e635" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-neutral-500 h-64 gap-3">
          <BarChart2 size={32} strokeWidth={2} />
          <p className="text-xs font-bold uppercase tracking-widest">尚未記錄身體數據</p>
        </div>
      )}
    </div>
  );
}

// --- Reference Tab ---
function ReferenceTab() {
  const guide = [
    { cat: '下肢推 (Squat Pattern)', name: '高腳杯深蹲', cue: '保持軀幹直立，啞鈴貼近胸口，下蹲時膝蓋沿著腳尖方向打開，感受大腿前側與臀部發力。' },
    { cat: '下肢鉸鏈 (Hinge Pattern)', name: '硬舉', cue: '保持脊椎中立，臀部向後推，感受大腿後側拉伸，發力時臀部夾緊向前頂，不要過度仰腰。' },
    { cat: '水平推 (Horizontal Push)', name: '胸推', cue: '肩胛骨收緊下沉，啞鈴下放時手肘與身體呈約45度，推起時感受胸大肌收縮。' },
    { cat: '水平拉 (Horizontal Pull)', name: '坐姿划船', cue: '核心收緊，拉的時候手肘向後貼著身體走，想像肩胛骨中間夾著一顆雞蛋。' },
    { cat: '垂直推 (Vertical Push)', name: '肩推', cue: '坐直，啞鈴從耳朵旁向上推，核心收緊避免過度折腰。' },
    { cat: '垂直拉 (Vertical Pull)', name: '滑輪下拉', cue: '身體微向後傾，將肩膀先下沉，然後手肘向身體兩側下拉，感受背闊肌發力。' }
  ];

  return (
    <div className="space-y-4 animate-in fade-in pb-10 mt-4">
      <h2 className="text-4xl font-black tracking-tighter uppercase italic mb-6">動作圖解與要訣</h2>
      {guide.map((item, i) => (
        <div key={i} className={`p-6 rounded-3xl ${THEME.card} border ${THEME.border}`}>
          <span className="text-[10px] uppercase font-black text-lime-400 tracking-[0.2em]">{item.cat}</span>
          <h3 className="text-2xl font-bold mt-1 mb-3 uppercase tracking-tight">{item.name}</h3>
          <p className={`text-sm text-neutral-400 leading-relaxed bg-black/30 p-4 rounded-xl border border-white/5 font-bold backdrop-blur-sm`}>
            {item.cue}
          </p>
        </div>
      ))}
    </div>
  );
}
